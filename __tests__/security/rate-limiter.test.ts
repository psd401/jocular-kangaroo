import { checkActionRateLimit } from "@/lib/security/rate-limiter"

describe("checkActionRateLimit", () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it("first request is allowed", () => {
    expect(checkActionRateLimit(1, "testAction")).toBe(true)
  })

  it("requests within limit are allowed", () => {
    for (let i = 0; i < 99; i++) {
      expect(checkActionRateLimit(1, "withinLimit")).toBe(true)
    }
  })

  it("request at limit is rejected", () => {
    // Fill up to the default limit of 100
    for (let i = 0; i < 100; i++) {
      checkActionRateLimit(1, "atLimit")
    }
    // 101st request should be rejected
    expect(checkActionRateLimit(1, "atLimit")).toBe(false)
  })

  it("window expires and resets", () => {
    // Fill up to the limit
    for (let i = 0; i < 100; i++) {
      checkActionRateLimit(1, "windowReset")
    }
    expect(checkActionRateLimit(1, "windowReset")).toBe(false)

    // Advance past the default 60s window
    jest.advanceTimersByTime(61_000)

    // Should be allowed again
    expect(checkActionRateLimit(1, "windowReset")).toBe(true)
  })

  it("different users are independent", () => {
    // Fill user1 to limit
    for (let i = 0; i < 100; i++) {
      checkActionRateLimit(1, "independent")
    }
    expect(checkActionRateLimit(1, "independent")).toBe(false)

    // user2 should still be allowed
    expect(checkActionRateLimit(2, "independent")).toBe(true)
  })

  it("different actions are independent", () => {
    // Fill actionA to limit for user1
    for (let i = 0; i < 100; i++) {
      checkActionRateLimit(1, "actionA")
    }
    expect(checkActionRateLimit(1, "actionA")).toBe(false)

    // actionB should still be allowed for user1
    expect(checkActionRateLimit(1, "actionB")).toBe(true)
  })

  it("custom config is respected", () => {
    const config = { maxRequests: 3, windowMs: 1000 }

    expect(checkActionRateLimit(1, "custom", config)).toBe(true)
    expect(checkActionRateLimit(1, "custom", config)).toBe(true)
    expect(checkActionRateLimit(1, "custom", config)).toBe(true)
    // 4th request exceeds custom limit
    expect(checkActionRateLimit(1, "custom", config)).toBe(false)
  })
})
