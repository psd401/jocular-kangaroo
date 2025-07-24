import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/admin-check"
import { deleteNavigationItem } from "@/lib/db/data-api-adapter"
import logger from "@/lib/logger"

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check admin authorization
    const authError = await requireAdmin();
    if (authError) return authError;

    const resolvedParams = await params
    const { id } = resolvedParams

    // Delete the navigation item
    await deleteNavigationItem(parseInt(id, 10))

    return NextResponse.json({
      isSuccess: true,
      message: "Navigation item deleted successfully"
    })
  } catch (error) {
    logger.error("Error deleting navigation item:", error)
    return NextResponse.json(
      { 
        isSuccess: false, 
        message: error instanceof Error ? error.message : "Failed to delete navigation item"
      },
      { status: 500 }
    )
  }
} 