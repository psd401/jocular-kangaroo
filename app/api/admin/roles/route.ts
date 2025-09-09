import { NextRequest, NextResponse } from "next/server"
import { createRole, executeSQL } from "@/lib/db/data-api-adapter"
import { requireAdmin } from "@/lib/auth/admin-check"
import { generateRequestId, createLogger } from "@/lib/logger"

export async function GET() {
  const requestId = generateRequestId();
  const logger = createLogger({ requestId, route: "/api/admin/roles", method: "GET" });
  
  try {
    logger.info("Fetching all roles for admin");
    
    // Check admin authorization
    const authError = await requireAdmin();
    if (authError) {
      logger.warn("Admin authorization failed");
      return authError;
    }

    // Get all roles
    const result = await executeSQL('SELECT id, name FROM roles ORDER BY name')

    const roles = result.map((record) => ({
      id: String(record.id),
      name: String(record.name),
    }))

    logger.info("Roles retrieved successfully", { roleCount: roles.length });

    return NextResponse.json({
      isSuccess: true,
      data: roles
    })
  } catch (error) {
    logger.error("Error fetching roles", { error });
    return NextResponse.json(
      { 
        isSuccess: false, 
        message: error instanceof Error ? error.message : "Failed to fetch roles"
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const logger = createLogger({ requestId, route: "/api/admin/roles", method: "POST" });
  
  try {
    logger.info("Processing role creation request");
    
    // Check admin authorization
    const authError = await requireAdmin();
    if (authError) {
      logger.warn("Admin authorization failed");
      return authError;
    }
    
    const body = await request.json()
    logger.info("Creating new role", { roleName: body.name });
    
    const role = await createRole(body)
    
    logger.info("Role created successfully", { roleId: role.id, roleName: role.name });
    
    return NextResponse.json({ role })
  } catch (error) {
    logger.error("Error creating role", { error })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create role" },
      { status: 500 }
    )
  }
} 