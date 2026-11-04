import bcrypt from "bcryptjs";
import request from "supertest";
import app from "../src/app";
import { createOrganization, createUser } from "./helpers/factories";
import { cookiePair, refresh } from "./helpers/session";

const PASSWORD = "Str0ng!Passw0rd";

beforeEach(() => { process.env.RATE_LIMIT_ENABLED = "true"; });
afterEach(() => { delete process.env.RATE_LIMIT_ENABLED; });

/** Every request comes from one address, like a household or an office behind one router. */
const from = (ip: string) => ({ "X-Forwarded-For": ip });

async function signedIn(ip: string) {
  const org = await createOrganization();
  const user = await createUser(org.id, "OWNER", { password: await bcrypt.hash(PASSWORD, 4) });
  const res = await request(app).post("/api/auth/login").set(from(ip)).send({ email: user.email, password: PASSWORD });
  expect(res.status).toBe(200);
  return { user, token: res.body.token as string, cookie: cookiePair(res) as string };
}

describe("session endpoints are not throttled like credential endpoints", () => {
  it("lets a signed in user load many pages: /me and /refresh are never limited at 20 per window", async () => {
    const ip = "10.20.0.1";
    const { token, cookie: first } = await signedIn(ip);
    let cookie = first;

    for (let i = 0; i < 45; i++) {
      const me = await request(app).get("/api/auth/me").set(from(ip)).set("Authorization", `Bearer ${token}`);
      expect({ attempt: i, status: me.status }).toEqual({ attempt: i, status: 200 });
    }
    for (let i = 0; i < 25; i++) {
      const r = await refresh(cookie, { "X-Forwarded-For": ip });
      // A refresh straight after another is a 409 (concurrent rotation), never a 429.
      expect(r.status).not.toBe(429);
      const next = cookiePair(r);
      if (next) cookie = next;
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
  });

  it("does not limit logout", async () => {
    const ip = "10.20.0.2";
    const { cookie } = await signedIn(ip);
    for (let i = 0; i < 25; i++) {
      const res = await request(app)
        .post("/api/auth/logout")
        .set(from(ip))
        .set("Origin", "http://localhost:3000")
        .set("X-Requested-By", "traqify")
        .set("Cookie", cookie);
      expect(res.status).not.toBe(429);
    }
  });

  it("does not let several users behind one address lock each other out", async () => {
    const ip = "10.20.0.3";
    const sessions = [];
    for (let i = 0; i < 6; i++) sessions.push(await signedIn(ip));
    for (const s of sessions) {
      for (let page = 0; page < 8; page++) {
        const res = await request(app).get("/api/auth/me").set(from(ip)).set("Authorization", `Bearer ${s.token}`);
        expect(res.status).toBe(200);
      }
    }
  });
});

describe("credential endpoints are still throttled", () => {
  it("limits password guesses per IP across different accounts", async () => {
    const ip = "10.20.1.1";
    for (let i = 0; i < 20; i++) {
      const res = await request(app).post("/api/auth/login").set(from(ip)).send({ email: `guess${i}@example.com`, password: "Wrong!Passw0rd1" });
      expect({ attempt: i, status: res.status }).toEqual({ attempt: i, status: 401 });
    }
    const blocked = await request(app).post("/api/auth/login").set(from(ip)).send({ email: "guess99@example.com", password: "Wrong!Passw0rd1" });
    expect(blocked.status).toBe(429);
  });

  it("limits password guesses against one account regardless of where they come from", async () => {
    const org = await createOrganization();
    const user = await createUser(org.id, "OWNER", { password: await bcrypt.hash(PASSWORD, 4) });
    for (let i = 1; i <= 10; i++) {
      const res = await request(app).post("/api/auth/login").set(from(`10.20.2.${i}`)).send({ email: user.email, password: "Wrong!Passw0rd1" });
      expect({ attempt: i, status: res.status }).toEqual({ attempt: i, status: 401 });
    }
    const blocked = await request(app).post("/api/auth/login").set(from("10.20.2.99")).send({ email: user.email, password: PASSWORD });
    expect(blocked.status).toBe(429);
  });

  it("treats the same address in a different case as the same account", async () => {
    for (let i = 1; i <= 10; i++) {
      await request(app).post("/api/auth/login").set(from(`10.20.3.${i}`)).send({ email: "Case.Target@Example.com", password: "Wrong!Passw0rd1" });
    }
    const blocked = await request(app).post("/api/auth/login").set(from("10.20.3.99")).send({ email: "case.target@example.com", password: "Wrong!Passw0rd1" });
    expect(blocked.status).toBe(429);
  });

  it("limits registration, password reset and invitation attempts per IP", async () => {
    const ip = "10.20.4.1";
    for (const path of ["/api/auth/register", "/api/auth/reset-password", "/api/auth/accept-invite"]) {
      let last = 0;
      for (let i = 0; i < 25; i++) {
        last = (await request(app).post(path).set(from(ip)).send({})).status;
        if (last === 429) break;
      }
      expect({ path, last }).toEqual({ path, last: 429 });
    }
  });
});
