import { NextRequest, NextResponse } from "next/server"
import { updateRole, deleteRole } from "@/lib/db/data-api-adapter"
import { requireAdmin } from "@/lib/auth/admin-check"
import { generateRequestId, createLogger } from "@/lib/logger"
import { getErrorMessage } from "@/types/errors"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ roleId: string }> }
) {
  const requestId = generateRequestId();
  const logger = createLogger({ requestId, route: "/api/admin/roles/[roleId]", method: "PUT" });
  
  try {
    logger.info("Processing role update request");
    
    // Check admin authorization
    const authError = await requireAdmin();
    if (authError) {
      logger.warn("Admin authorization failed");
      return authError;
    }
    
    const { roleId } = await params
    logger.info("Updating role", { roleId });
    
    const body = await request.json()
    const role = await updateRole(parseInt(roleId), body)
    
    logger.info("Role updated successfully", { roleId });
    
    return NextResponse.json({ role })
  } catch (error) {
    logger.error("Error updating role", { error, roleId: (await params).roleId })
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to update role" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ roleId: string }> }
) {
  const requestId = generateRequestId();
  const logger = createLogger({ requestId, route: "/api/admin/roles/[roleId]", method: "DELETE" });
  
  try {
    logger.info("Processing role deletion request");
    
    // Check admin authorization
    const authError = await requireAdmin();
    if (authError) {
      logger.warn("Admin authorization failed");
      return authError;
    }
    
    const { roleId } = await params
    logger.info("Deleting role", { roleId });
    
    const role = await deleteRole(parseInt(roleId))
    
    logger.info("Role deleted successfully", { roleId });
    
    return NextResponse.json({ role })
  } catch (error) {
    logger.error("Error deleting role", { error, roleId: (await params).roleId })
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to delete role" },
      { status: 500 }
    )
  }
} 