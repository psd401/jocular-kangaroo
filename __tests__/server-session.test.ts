const mockAuth = jest.fn();
const mockLoggerError = jest.fn();

jest.unmock("@/lib/auth/server-session");
jest.mock("@/auth", () => ({
  auth: (...args: unknown[]) => mockAuth(...args),
}));
jest.mock("@/lib/logger", () => ({
  __esModule: true,
  default: { error: (...args: unknown[]) => mockLoggerError(...args) },
}));

import { getServerSession } from "@/lib/auth/server-session";

describe("getServerSession", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    mockLoggerError.mockReset();
  });

  it("maps an authenticated Auth.js session to the Cognito session shape", async () => {
    mockAuth.mockResolvedValueOnce({
      user: {
        id: "cognito-user-123",
        email: "teacher@example.org",
        name: "Taylor Teacher",
      },
      expires: new Date(Date.now() + 3600_000).toISOString(),
    });

    await expect(getServerSession()).resolves.toEqual(
      expect.objectContaining({
        sub: "cognito-user-123",
        id: "cognito-user-123",
        email: "teacher@example.org",
        name: "Taylor Teacher",
      })
    );
  });

  it("returns null when the session has no concrete user identity", async () => {
    mockAuth.mockResolvedValueOnce({ user: {}, expires: "later" });

    await expect(getServerSession()).resolves.toBeNull();
  });

  it("returns null and logs when Auth.js rejects the session lookup", async () => {
    const error = new Error("configuration failure");
    mockAuth.mockRejectedValueOnce(error);

    await expect(getServerSession()).resolves.toBeNull();
    expect(mockLoggerError).toHaveBeenCalledWith("Session retrieval failed:", error);
  });
});
