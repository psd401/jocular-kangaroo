import { logDataAccess, logDataAccessBatch } from "@/lib/security/audit-logger"

jest.mock("@/lib/db/data-api-adapter", () => ({
  executeSQL: jest.fn(),
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
import logger from "@/lib/logger"

const mockExecuteSQL = executeSQL as jest.MockedFunction<typeof executeSQL>
const mockLogger = logger as jest.Mocked<typeof logger>

describe("logDataAccess", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockExecuteSQL.mockResolvedValue([])
  })

  it("writes audit entry with INSERT", () => {
    logDataAccess({
      userId: 1,
      action: "view",
      entityType: "student",
      entityId: 42,
      requestId: "req-123",
    })

    expect(mockExecuteSQL).toHaveBeenCalledTimes(1)
    const [sql, params] = mockExecuteSQL.mock.calls[0]
    expect(sql).toContain("INSERT INTO data_access_log")
    expect(params).toHaveLength(6)
  })

  it("handles null entityId", () => {
    logDataAccess({
      userId: 1,
      action: "list",
      entityType: "student",
    })

    const params = mockExecuteSQL.mock.calls[0][1]
    // param index 3 (0-based) is entityId
    const entityIdParam = params?.find((p) => p.name === "4")
    expect(entityIdParam?.value).toEqual({ isNull: true })
  })

  it("serializes metadata as JSON", () => {
    logDataAccess({
      userId: 1,
      action: "view",
      entityType: "student",
      metadata: { foo: "bar" },
    })

    const params = mockExecuteSQL.mock.calls[0][1]
    const metadataParam = params?.find((p) => p.name === "5")
    expect(metadataParam?.value).toEqual({
      stringValue: JSON.stringify({ foo: "bar" }),
    })
  })

  it("swallows errors without throwing", async () => {
    mockExecuteSQL.mockRejectedValueOnce(new Error("DB unavailable"))

    // Should not throw
    logDataAccess({
      userId: 1,
      action: "view",
      entityType: "student",
    })

    // Let the .catch() handler run
    await new Promise((resolve) => process.nextTick(resolve))

    expect(mockLogger.warn).toHaveBeenCalledWith(
      "Failed to write audit log entry",
      expect.objectContaining({
        error: "DB unavailable",
      })
    )
  })
})

describe("logDataAccessBatch", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockExecuteSQL.mockResolvedValue([])
  })

  it("includes resultCount in metadata", () => {
    logDataAccessBatch(
      { userId: 1, action: "list", entityType: "student" },
      [1, 2, 3],
      25
    )

    const params = mockExecuteSQL.mock.calls[0][1]
    const metadataParam = params?.find((p) => p.name === "5")
    const parsed = JSON.parse(metadataParam?.value?.stringValue ?? "{}")
    expect(parsed.resultCount).toBe(25)
    expect(parsed.entityIds).toEqual([1, 2, 3])
  })

  it("caps entityIds at 100", () => {
    const ids = Array.from({ length: 150 }, (_, i) => i + 1)

    logDataAccessBatch(
      { userId: 1, action: "list", entityType: "student" },
      ids,
      150
    )

    const params = mockExecuteSQL.mock.calls[0][1]
    const metadataParam = params?.find((p) => p.name === "5")
    const parsed = JSON.parse(metadataParam?.value?.stringValue ?? "{}")
    expect(parsed.entityIds).toHaveLength(100)
    expect(parsed.resultCount).toBe(150)
  })
})
