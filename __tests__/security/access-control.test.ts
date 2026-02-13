import {
  resolveDataScope,
  buildStudentAccessFilter,
  buildInterventionAccessFilter,
  buildSchoolAccessFilter,
  buildSecurityContext,
  getSecurityContext,
} from "@/lib/security/access-control"
import type { SecurityContext } from "@/lib/security/types"

// --- Mocks ---

jest.mock("@/lib/db/data-api-adapter", () => ({
  executeSQL: jest.fn(),
}))

jest.mock("@/actions/db/get-current-user-action", () => ({
  getCurrentUserAction: jest.fn(),
}))

jest.mock("@/lib/logger", () => ({
  __esModule: true,
  default: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}))

import { executeSQL } from "@/lib/db/data-api-adapter"
import { getCurrentUserAction } from "@/actions/db/get-current-user-action"

const mockExecuteSQL = executeSQL as jest.MockedFunction<typeof executeSQL>
const mockGetCurrentUserAction =
  getCurrentUserAction as jest.MockedFunction<typeof getCurrentUserAction>

// --- Helpers ---

function makeCtx(
  overrides: Partial<SecurityContext> = {}
): SecurityContext {
  return {
    userId: 1,
    roles: ["Teacher"],
    schoolIds: [10],
    studentIds: [],
    ...overrides,
  }
}

// ============================================================================
// resolveDataScope
// ============================================================================

describe("resolveDataScope", () => {
  it("Admin gets 'all'", () => {
    expect(resolveDataScope(["Administrator"])).toBe("all")
  })

  it("Principal gets 'school'", () => {
    expect(resolveDataScope(["Principal"])).toBe("school")
  })

  it.each([
    ["Teacher"],
    ["Counselor"],
    ["Specialist"],
    ["Nurse"],
  ])("%s gets 'assigned'", (role) => {
    expect(resolveDataScope([role])).toBe("assigned")
  })

  it("multi-role picks highest (Teacher + Principal = school)", () => {
    expect(resolveDataScope(["Teacher", "Principal"])).toBe("school")
  })

  it("multi-role with admin wins (Teacher + Administrator = all)", () => {
    expect(resolveDataScope(["Teacher", "Administrator"])).toBe("all")
  })

  it("unknown role defaults to 'assigned'", () => {
    expect(resolveDataScope(["Janitor"])).toBe("assigned")
  })

  it("empty roles defaults to 'assigned'", () => {
    expect(resolveDataScope([])).toBe("assigned")
  })

  it("case insensitive", () => {
    expect(resolveDataScope(["ADMINISTRATOR"])).toBe("all")
  })
})

// ============================================================================
// buildStudentAccessFilter
// ============================================================================

describe("buildStudentAccessFilter", () => {
  it("admin: no filter", () => {
    const ctx = makeCtx({ roles: ["Administrator"], schoolIds: [1] })
    const result = buildStudentAccessFilter(ctx, 1)

    expect(result.sql).toBe("")
    expect(result.parameters).toHaveLength(0)
    expect(result.nextParamIndex).toBe(1)
  })

  it("principal: school filter only", () => {
    const ctx = makeCtx({ roles: ["Principal"], schoolIds: [10, 11] })
    const result = buildStudentAccessFilter(ctx, 1)

    expect(result.sql).toContain("s.school_id IN")
    expect(result.sql).toContain("$1")
    expect(result.sql).toContain("$2")
    expect(result.sql).not.toContain("user_students")
    expect(result.parameters).toHaveLength(2)
    expect(result.nextParamIndex).toBe(3)
  })

  it("teacher: school + assigned filter", () => {
    const ctx = makeCtx({ roles: ["Teacher"], schoolIds: [10], userId: 5 })
    const result = buildStudentAccessFilter(ctx, 1)

    expect(result.sql).toContain("s.school_id IN")
    expect(result.sql).toContain("user_students")
    expect(result.sql).toContain("assigned_to")
    expect(result.sql).toContain("created_by")
    expect(result.sql).toContain("intervention_team")
    // 1 school param + 1 userId param
    expect(result.parameters).toHaveLength(2)
    expect(result.nextParamIndex).toBe(3)
  })

  it("no schools = AND FALSE", () => {
    const ctx = makeCtx({ roles: ["Teacher"], schoolIds: [] })
    const result = buildStudentAccessFilter(ctx, 1)

    expect(result.sql).toBe(" AND FALSE")
    expect(result.parameters).toHaveLength(0)
  })

  it("single school for principal", () => {
    const ctx = makeCtx({ roles: ["Principal"], schoolIds: [10] })
    const result = buildStudentAccessFilter(ctx, 1)

    expect(result.sql).toContain("$1")
    expect(result.parameters).toHaveLength(1)
    expect(result.parameters[0].value).toEqual({ longValue: 10 })
  })

  it("multiple schools for principal", () => {
    const ctx = makeCtx({ roles: ["Principal"], schoolIds: [10, 11, 12] })
    const result = buildStudentAccessFilter(ctx, 1)

    expect(result.parameters).toHaveLength(3)
    expect(result.sql).toContain("$1")
    expect(result.sql).toContain("$2")
    expect(result.sql).toContain("$3")
    expect(result.nextParamIndex).toBe(4)
  })

  it("startParamIndex is respected", () => {
    const ctx = makeCtx({ roles: ["Principal"], schoolIds: [10, 11] })
    const result = buildStudentAccessFilter(ctx, 5)

    expect(result.sql).toContain("$5")
    expect(result.sql).toContain("$6")
    expect(result.parameters[0].name).toBe("5")
    expect(result.parameters[1].name).toBe("6")
    expect(result.nextParamIndex).toBe(7)
  })
})

// ============================================================================
// buildInterventionAccessFilter
// ============================================================================

describe("buildInterventionAccessFilter", () => {
  it("admin: no filter", () => {
    const ctx = makeCtx({ roles: ["Administrator"] })
    const result = buildInterventionAccessFilter(ctx, 1)

    expect(result.sql).toBe("")
    expect(result.parameters).toHaveLength(0)
  })

  it("principal: school filter via student", () => {
    const ctx = makeCtx({ roles: ["Principal"], schoolIds: [10] })
    const result = buildInterventionAccessFilter(ctx, 1)

    expect(result.sql).toContain("s.school_id IN")
    expect(result.sql).not.toContain("assigned_to")
    expect(result.parameters).toHaveLength(1)
  })

  it("teacher: school + relationship filter", () => {
    const ctx = makeCtx({ roles: ["Teacher"], schoolIds: [10], userId: 5 })
    const result = buildInterventionAccessFilter(ctx, 1)

    expect(result.sql).toContain("s.school_id IN")
    expect(result.sql).toContain("assigned_to")
    expect(result.sql).toContain("created_by")
    expect(result.sql).toContain("intervention_team")
    expect(result.sql).toContain("user_students")
    expect(result.parameters).toHaveLength(2) // 1 school + 1 userId
  })

  it("no schools = AND FALSE", () => {
    const ctx = makeCtx({ roles: ["Teacher"], schoolIds: [] })
    const result = buildInterventionAccessFilter(ctx, 1)

    expect(result.sql).toBe(" AND FALSE")
    expect(result.parameters).toHaveLength(0)
  })
})

// ============================================================================
// buildSchoolAccessFilter
// ============================================================================

describe("buildSchoolAccessFilter", () => {
  it("admin: no filter", () => {
    const ctx = makeCtx({ roles: ["Administrator"] })
    const result = buildSchoolAccessFilter(ctx, 1)

    expect(result.sql).toBe("")
    expect(result.parameters).toHaveLength(0)
  })

  it("principal: id IN filter", () => {
    const ctx = makeCtx({ roles: ["Principal"], schoolIds: [10, 11] })
    const result = buildSchoolAccessFilter(ctx, 1)

    expect(result.sql).toContain("id IN")
    expect(result.sql).toContain("$1")
    expect(result.sql).toContain("$2")
    expect(result.parameters).toHaveLength(2)
  })

  it("no schools = AND FALSE", () => {
    const ctx = makeCtx({ roles: ["Teacher"], schoolIds: [] })
    const result = buildSchoolAccessFilter(ctx, 1)

    expect(result.sql).toBe(" AND FALSE")
    expect(result.parameters).toHaveLength(0)
  })
})

// ============================================================================
// buildSecurityContext (needs executeSQL mock)
// ============================================================================

describe("buildSecurityContext", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("returns schools and students from DB", async () => {
    mockExecuteSQL
      .mockResolvedValueOnce([{ schoolId: 10 }])
      .mockResolvedValueOnce([{ studentId: 100 }, { studentId: 101 }])

    const ctx = await buildSecurityContext(1, ["Teacher"])

    expect(ctx).toEqual({
      userId: 1,
      roles: ["Teacher"],
      schoolIds: [10],
      studentIds: [100, 101],
    })
  })

  it("returns empty arrays when tables are empty", async () => {
    mockExecuteSQL
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    const ctx = await buildSecurityContext(1, ["Teacher"])

    expect(ctx.schoolIds).toEqual([])
    expect(ctx.studentIds).toEqual([])
  })

  it("falls back to empty arrays on error (table doesn't exist)", async () => {
    mockExecuteSQL
      .mockRejectedValueOnce(new Error("relation user_schools does not exist"))
      .mockRejectedValueOnce(new Error("relation user_students does not exist"))

    const ctx = await buildSecurityContext(1, ["Teacher"])

    expect(ctx.schoolIds).toEqual([])
    expect(ctx.studentIds).toEqual([])
  })
})

// ============================================================================
// getSecurityContext (needs getCurrentUserAction mock)
// ============================================================================

describe("getSecurityContext", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("returns null when not authenticated", async () => {
    mockGetCurrentUserAction.mockResolvedValueOnce({
      isSuccess: false,
      message: "No session",
    })

    const result = await getSecurityContext()
    expect(result).toBeNull()
  })

  it("returns SecurityContext when authenticated", async () => {
    mockGetCurrentUserAction.mockResolvedValueOnce({
      isSuccess: true,
      message: "ok",
      data: {
        user: { id: 1 } as never,
        roles: [{ id: 1, name: "Teacher" }],
      },
    })
    mockExecuteSQL
      .mockResolvedValueOnce([{ schoolId: 10 }])
      .mockResolvedValueOnce([{ studentId: 100 }])

    const result = await getSecurityContext()

    expect(result).toEqual({
      userId: 1,
      roles: ["Teacher"],
      schoolIds: [10],
      studentIds: [100],
    })
  })
})
