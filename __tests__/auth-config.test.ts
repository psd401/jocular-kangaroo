jest.mock("next-auth", () => ({
  __esModule: true,
  default: jest.fn(() => ({
    handlers: { GET: jest.fn(), POST: jest.fn() },
    auth: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
  })),
}));

jest.mock("next-auth/providers/cognito", () => ({
  __esModule: true,
  default: jest.fn((config: Record<string, unknown>) => ({
    id: "cognito",
    type: "oidc",
    ...config,
  })),
}));

import { authConfig } from "@/auth";

function jwtCallback() {
  const callback = authConfig.callbacks?.jwt;
  if (!callback) throw new Error("JWT callback is not configured");
  return callback;
}

function sessionCallback() {
  const callback = authConfig.callbacks?.session;
  if (!callback) throw new Error("session callback is not configured");
  return callback;
}

describe("Auth.js Cognito callbacks", () => {
  it("maps a Cognito sign-in token into the application JWT", async () => {
    const expiresAtSeconds = Math.floor(Date.now() / 1000) + 3600;
    const claims = {
      sub: "cognito-user-123",
      email: "teacher@example.org",
      given_name: "Taylor",
      family_name: "Teacher",
    };
    const idToken = `header.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.signature`;

    const token = await jwtCallback()({
      token: {},
      user: { id: claims.sub, email: claims.email, name: "Taylor Teacher" },
      account: {
        provider: "cognito",
        type: "oidc",
        providerAccountId: claims.sub,
        id_token: idToken,
        access_token: "access-token",
        refresh_token: "refresh-token",
        expires_at: expiresAtSeconds,
      },
      trigger: "signIn",
    });

    expect(token).toEqual(
      expect.objectContaining({
        sub: claims.sub,
        email: claims.email,
        name: claims.given_name,
        accessToken: "access-token",
        refreshToken: "refresh-token",
        idToken,
        expiresAt: expiresAtSeconds * 1000,
      })
    );
  });

  it("invalidates an expired application JWT", async () => {
    const token = await jwtCallback()({
      token: { sub: "cognito-user-123", expiresAt: Date.now() - 1 },
      user: { id: "cognito-user-123" },
    });

    expect(token).toBeNull();
  });

  it("projects a valid JWT identity and tokens into the session", async () => {
    const session = {
      user: { id: "", email: "", name: null, image: null },
      expires: new Date(Date.now() + 3600_000).toISOString(),
    };
    const token = {
      sub: "cognito-user-123",
      email: "teacher@example.org",
      given_name: "Taylor",
      accessToken: "access-token",
      idToken: "id-token",
      refreshToken: "refresh-token",
      expiresAt: Date.now() + 3600_000,
    };

    // Auth.js intersects database- and JWT-strategy callback types even though
    // this JWT strategy supplies only `session` and `token` at runtime.
    const callbackInput = { session, token } as unknown as Parameters<
      ReturnType<typeof sessionCallback>
    >[0];
    const result = await sessionCallback()(callbackInput);

    expect(result).toEqual(
      expect.objectContaining({
        user: expect.objectContaining({
          id: token.sub,
          email: token.email,
          name: token.given_name,
        }),
        accessToken: token.accessToken,
        idToken: token.idToken,
        refreshToken: token.refreshToken,
      })
    );
  });

  it("does not project an identity from a missing or expired token", async () => {
    const session = {
      user: { id: "", email: "", name: null, image: null },
      expires: new Date(Date.now() + 3600_000).toISOString(),
    };

    for (const token of [
      {},
      { sub: "cognito-user-123", expiresAt: Date.now() - 1 },
    ]) {
      // See the JWT-strategy type note in the valid-session test above.
      const callbackInput = { session, token } as unknown as Parameters<
        ReturnType<typeof sessionCallback>
      >[0];
      const result = await sessionCallback()(callbackInput);

      expect(result.user?.id).toBe("");
      expect(result).not.toHaveProperty("accessToken");
    }
  });

  it("keeps redirects on the application origin", async () => {
    const redirect = authConfig.callbacks?.redirect;
    if (!redirect) throw new Error("redirect callback is not configured");

    await expect(
      redirect({ url: "/dashboard", baseUrl: "https://jocular.example" })
    ).resolves.toBe("https://jocular.example/dashboard");
    await expect(
      redirect({ url: "https://attacker.example/path", baseUrl: "https://jocular.example" })
    ).resolves.toBe("https://jocular.example/dashboard");
  });
});
