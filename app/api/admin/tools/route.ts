import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/admin-check"
import { executeSQL } from "@/lib/db/data-api-adapter"
import { generateRequestId, createLogger } from "@/lib/logger"

export async function GET() {
  const requestId = generateRequestId();
  const logger = createLogger({ requestId, route: "/api/admin/tools", method: "GET" });
  
  try {
    logger.info("Fetching all tools for admin");
    
    // Check admin authorization
    const authError = await requireAdmin();
    if (authError) {
      logger.warn("Admin authorization failed");
      return authError;
    }

    // Get all tools
    const result = await executeSQL('SELECT id, name, identifier, description FROM tools ORDER BY name')

    const tools = result.map((record) => ({
      id: String(record.id),
      name: String(record.name),
      identifier: String(record.identifier),
      description: record.description ? String(record.description) : null,
    }))

    logger.info("Tools retrieved successfully", { toolCount: tools.length });

    return NextResponse.json({
      isSuccess: true,
      data: tools
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