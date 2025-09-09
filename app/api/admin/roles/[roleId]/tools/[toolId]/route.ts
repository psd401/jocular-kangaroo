import { NextRequest, NextResponse } from "next/server"
import { assignToolToRole, removeToolFromRole } from "@/lib/db/data-api-adapter"
import { requireAdmin } from "@/lib/auth/admin-check"
import { generateRequestId, createLogger } from '@/lib/logger';
import { getErrorMessage } from "@/types/errors";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roleId: string; toolId: string }> }
) {
  const requestId = generateRequestId();
  const logger = createLogger({ requestId, route: "/api/admin/roles/[roleId]/tools/[toolId]", method: "POST" });
  
  try {
    logger.info("Processing tool assignment to role request");
    
    // Check admin authorization
    const authError = await requireAdmin();
    if (authError) {
      logger.warn("Admin authorization failed");
      return authError;
    }
    
    const { roleId, toolId } = await params
    logger.info("Assigning tool to role", { roleId, toolId });
    
    const success = await assignToolToRole(roleId, toolId)
    
    logger.info("Tool assigned to role successfully", { roleId, toolId, success });
    
    return NextResponse.json({ success })
  } catch (error) {
    logger.error("Error assigning tool to role", { error, roleId: (await params).roleId, toolId: (await params).toolId })
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to assign tool" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ roleId: string; toolId: string }> }
) {
  const requestId = generateRequestId();
  const logger = createLogger({ requestId, route: "/api/admin/roles/[roleId]/tools/[toolId]", method: "DELETE" });
  
  try {
    logger.info("Processing tool removal from role request");
    
    // Check admin authorization
    const authError = await requireAdmin();
    if (authError) {
      logger.warn("Admin authorization failed");
      return authError;
    }
    
    const { roleId, toolId } = await params
    logger.info("Removing tool from role", { roleId, toolId });
    
    const success = await removeToolFromRole(roleId, toolId)
    
    logger.info("Tool removed from role successfully", { roleId, toolId, success });
    
    return NextResponse.json({ success })
  } catch (error) {
    logger.error("Error removing tool from role", { error, roleId: (await params).roleId, toolId: (await params).toolId })
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to remove tool" },
      { status: 500 }
    )
  }
} 