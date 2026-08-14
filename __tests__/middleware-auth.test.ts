jest.mock("@/auth", () => ({
  auth: (handler: unknown) => handler,
}));

jest.mock("next/server", () => ({
  NextResponse: {
    next: jest.fn(() => ({
      status: 200,
      headers: { get: (name: string) => name.toLowerCase() === "x-middleware-next" ? "1" : null },
    })),
    redirect: jest.fn((url: URL | string) => ({
      status: 307,
      headers: { get: (name: string) => name.toLowerCase() === "location" ? String(url) : null },
    })),
  },
}));

import { handleAuthRequest } from "@/middleware";

function request(pathname: string, auth: Parameters<typeof handleAuthRequest>[0]["auth"]) {
  return {
    nextUrl: new URL(pathname, "https://jocular.example"),
    auth,
  };
}

describe("authentication middleware", () => {
  it("redirects an unauthenticated protected request", () => {
    const response = handleAuthRequest(request("/dashboard", null));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://jocular.example/api/auth/signin?callbackUrl=%2Fdashboard"
    );
  });

  it("fails closed for a truthy auth error without a user", () => {
    const response = handleAuthRequest(
      request("/dashboard", { error: "Configuration" })
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/api/auth/signin");
  });

  it.each([
    ["missing", { user: {} }],
    ["empty", { user: { id: "" } }],
  ])("fails closed for a session with a %s user id", (_case, auth) => {
    const response = handleAuthRequest(request("/dashboard", auth));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/api/auth/signin");
  });

  it("allows a protected request with a concrete session user", () => {
    const response = handleAuthRequest(
      request("/dashboard", { user: { id: "user-123" } })
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("allows public requests without a session", () => {
    const response = handleAuthRequest(request("/api/health", null));

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});
