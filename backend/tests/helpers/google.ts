type GoogleProfile = { email: string; name?: string; verified_email?: boolean; picture?: string };

/**
 * Mocks Google's token and userinfo endpoints at the HTTP boundary. Any other URL fails the test.
 */
export function mockGoogle(profile: GoogleProfile) {
  return jest.spyOn(global, "fetch").mockImplementation(async (input: string | URL | { url: string }) => {
    const url = typeof input === "object" && "url" in input ? input.url : String(input);
    if (url === "https://oauth2.googleapis.com/token") {
      return { ok: true, status: 200, json: async () => ({ access_token: "test_only_not_a_token" }) } as Response;
    }
    if (url === "https://www.googleapis.com/oauth2/v2/userinfo") {
      return {
        ok: true,
        status: 200,
        json: async () => ({ name: "Google User", picture: "https://example.com/p.png", verified_email: true, ...profile }),
      } as Response;
    }
    throw new Error(`Unexpected network call in test: ${url}`);
  });
}
