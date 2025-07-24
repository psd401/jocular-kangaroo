import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/admin-check"
import { getNavigationItems, createNavigationItem, updateNavigationItem } from "@/lib/db/data-api-adapter"

export async function GET() {
  try {
    // Check admin authorization
    const authError = await requireAdmin();
    if (authError) return authError;

    // Get all navigation items (not just active ones for admin)
    const navItems = await getNavigationItems(false)
    
    // Items are already in camelCase from the data adapter
    const transformedItems = navItems

    return NextResponse.json({
      isSuccess: true,
      data: transformedItems
    })
  } catch (error) {
    return NextResponse.json(
      { 
        isSuccess: false, 
        message: error instanceof Error ? error.message : "Failed to fetch navigation items"
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    // Check admin authorization
    const authError = await requireAdmin();
    if (authError) return authError;

    const body = await request.json()

    // Validate required fields
    if (!body.label || !body.icon || !body.type) {
      return NextResponse.json(
        { isSuccess: false, message: "Missing required fields" },
        { status: 400 }
      )
    }

    // Check if this is an update operation by checking if the item exists
    if (body.id) {
      // First check if this ID exists in the database
      const existingItems = await getNavigationItems();
      const itemExists = existingItems.some(item => item.id === Number(body.id));
      
      if (itemExists) {
        // This is an update operation
        const { id, ...data } = body;
        try {
          const updatedItem = await updateNavigationItem(Number(id), data)

          return NextResponse.json({
            isSuccess: true,
            message: "Navigation item updated successfully",
            data: updatedItem
          })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Failed to update navigation item";
          return NextResponse.json(
            { isSuccess: false, message: errorMessage },
            { status: 500 }
          )
        }
      }
      // If the item doesn't exist, fall through to create it
    }
    
    // Create new item (ID will be auto-generated)
    try {
      const newItem = await createNavigationItem({
        label: body.label,
        icon: body.icon,
        link: body.link,
        description: body.description,
        type: body.type,
        parentId: body.parentId ? Number(body.parentId) : undefined,
        toolId: body.toolId ? Number(body.toolId) : undefined,
        requiresRole: body.requiresRole,
        position: body.position || 0,
        isActive: body.isActive ?? true
      })

      return NextResponse.json({
        isSuccess: true,
        message: "Navigation item created successfully",
        data: newItem
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create navigation item";
      return NextResponse.json(
        { isSuccess: false, message: errorMessage },
        { status: 500 }
      )
    }
  } catch (error) {
    return NextResponse.json(
      { 
        isSuccess: false, 
        message: error instanceof Error ? error.message : "Failed to handle navigation item request"
      },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    // Check admin authorization
    const authError = await requireAdmin();
    if (authError) return authError;

    const body = await request.json()
    
    if (!body.id || typeof body.position !== 'number') {
      return NextResponse.json(
        { isSuccess: false, message: "Missing id or position" },
        { status: 400 }
      )
    }

    try {
      const updatedItem = await updateNavigationItem(Number(body.id), { position: body.position })


      if (!updatedItem) {
        return NextResponse.json(
          { isSuccess: false, message: "Item not found" },
          { status: 404 }
        )
      }

      return NextResponse.json({
        isSuccess: true,
        message: "Position updated successfully",
        data: updatedItem
      })
    } catch (error) {
      throw error
    }
  } catch (error) {
    return NextResponse.json(
      { 
        isSuccess: false, 
        message: error instanceof Error ? error.message : "Failed to update position"
      },
      { status: 500 }
    )
  }
} 