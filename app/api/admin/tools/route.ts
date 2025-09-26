import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/admin-check"
import { db } from "@/lib/db/drizzle-client"
import { tools } from "@/src/db/schema"
import { asc } from "drizzle-orm"
import { generateRequestId, createLogger } from "@/lib/logger"

export async function GET() {
  const requestId = generateRequestId();
  const logger = createLogger({ requestId, route: "/api/admin/tools", method: "GET" });

  try {
    logger.info("Fetching all tools for admin");

    const authError = await requireAdmin();
    if (authError) {
      logger.warn("Admin authorization failed");
      return authError;
    }

    const result = await db
      .select({
        id: tools.id,
        name: tools.name,
        identifier: tools.identifier,
        description: tools.description
      })
      .from(tools)
      .orderBy(asc(tools.name));

    const toolsData = result.map((record) => ({
      id: String(record.id),
      name: String(record.name),
      identifier: String(record.identifier),
      description: record.description ? String(record.description) : null,
    }))

    logger.info("Tools retrieved successfully", { toolCount: toolsData.length });

    return NextResponse.json({
      isSuccess: true,
      data: toolsData
    })
  } catch (error) {
    logger.error("Error fetching tools", { error });
    return NextResponse.json(
      {
        isSuccess: false,
        message: error instanceof Error ? error.message : "Failed to fetch tools"
      },
      { status: 500 }
    )
  }
}