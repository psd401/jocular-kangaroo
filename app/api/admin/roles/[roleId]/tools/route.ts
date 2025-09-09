import { NextRequest, NextResponse } from "next/server"
import { getRoleTools } from "@/lib/db/data-api-adapter"
import { requireAdmin } from "@/lib/auth/admin-check"
import { generateRequestId, createLogger } from '@/lib/logger';
import { getErrorMessage } from "@/types/errors";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roleId: string }> }
) {
  const requestId = generateRequestId();
  const logger = createLogger({ requestId, route: "/api/admin/roles/[roleId]/tools", method: "GET" });
  
  try {
    logger.info("Fetching tools for role");
    
    // Check admin authorization
    const authError = await requireAdmin();
    if (authError) {
      logger.warn("Admin authorization failed");
      return authError;
    }
    
    const { roleId } = await params
    logger.info("Getting role tools", { roleId });
    
    const tools = await getRoleTools(parseInt(roleId, 10))
    
    logger.info("Role tools retrieved successfully", { roleId, toolCount: tools.length });
    
    return NextResponse.json({ tools })
  } catch (error) {
    logger.error("Error fetching role tools", { error, roleId: (await params).roleId })
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to fetch role tools" },
      { status: 500 }
    )
  }
} 