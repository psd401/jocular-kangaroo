import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/admin-check"
import { deleteNavigationItem } from "@/lib/db/data-api-adapter"
import { generateRequestId, createLogger } from "@/lib/logger"

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  const logger = createLogger({ requestId, route: "/api/admin/navigation/[id]", method: "DELETE" });
  
  try {
    logger.info("Processing navigation item deletion request");
    
    // Check admin authorization
    const authError = await requireAdmin();
    if (authError) {
      logger.warn("Admin authorization failed");
      return authError;
    }

    const resolvedParams = await params
    const { id } = resolvedParams

    logger.info("Deleting navigation item", { navigationItemId: id });

    // Delete the navigation item
    await deleteNavigationItem(parseInt(id, 10))

    logger.info("Navigation item deleted successfully", { navigationItemId: id });

    return NextResponse.json({
      isSuccess: true,
      message: "Navigation item deleted successfully"
    })
  } catch (error) {
    logger.error("Error deleting navigation item", { error, navigationItemId: (await params).id })
    return NextResponse.json(
      { 
        isSuccess: false, 
        message: error instanceof Error ? error.message : "Failed to delete navigation item"
      },
      { status: 500 }
    )
  }
} 