describe("SMTP transport security", () => {
  function loadTransportOptions(env: Record<string, string | undefined> = {}) {
    let options: Record<string, unknown> = {};
    const saved = { ...process.env };
    Object.assign(process.env, env);
    jest.isolateModules(() => {
      jest.unmock("../src/config/email");
      jest.doMock("nodemailer", () => ({
        __esModule: true,
        default: {
          createTransport: (opts: Record<string, unknown>) => {
            options = opts;
            return { sendMail: jest.fn() };
          },
        },
      }));
      jest.requireActual("../src/config/email");
    });
    process.env = saved;
    return options as { secure: boolean; requireTLS?: boolean; tls?: { rejectUnauthorized?: boolean } };
  }

  it("never disables certificate verification", () => {
    const options = loadTransportOptions();
    expect(options.tls?.rejectUnauthorized).not.toBe(false);
  });

  it("requires STARTTLS on the submission port", () => {
    const options = loadTransportOptions({ SMTP_PORT: "587" });
    expect(options.secure).toBe(false);
    expect(options.requireTLS).toBe(true);
  });

  it("uses implicit TLS on port 465", () => {
    const options = loadTransportOptions({ SMTP_PORT: "465" });
    expect(options.secure).toBe(true);
  });
});
