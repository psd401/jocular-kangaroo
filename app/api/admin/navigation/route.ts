import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/admin-check"
import { getNavigationItems, createNavigationItem, updateNavigationItem } from "@/lib/db/data-api-adapter"
import { generateRequestId, createLogger } from "@/lib/logger"

export async function GET() {
  const requestId = generateRequestId();
  const logger = createLogger({ requestId, route: "/api/admin/navigation", method: "GET" });
  
  try {
    logger.info("Fetching navigation items for admin");
    
    // Check admin authorization
    const authError = await requireAdmin();
    if (authError) {
      logger.warn("Admin authorization failed");
      return authError;
    }

    // Get all navigation items (not just active ones for admin)
    const navItems = await getNavigationItems(false)
    
    logger.info("Navigation items retrieved successfully", { itemCount: navItems.length });
    
    // Items are already in camelCase from the data adapter
    const transformedItems = navItems

    return NextResponse.json({
      isSuccess: true,
      data: transformedItems
    })
  } catch (error) {
    logger.error("Error fetching navigation items", { error });
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
  const requestId = generateRequestId();
  const logger = createLogger({ requestId, route: "/api/admin/navigation", method: "POST" });
  
  try {
    logger.info("Processing navigation item create/update request");
    
    // Check admin authorization
    const authError = await requireAdmin();
    if (authError) {
      logger.warn("Admin authorization failed");
      return authError;
    }

    const body = await request.json()

    // Validate required fields
    if (!body.label || !body.icon || !body.type) {
      logger.warn("Missing required fields", { providedFields: Object.keys(body) });
      return NextResponse.json(
        { isSuccess: false, message: "Missing required fields" },
        { status: 400 }
      )
    }

    // Check if this is an update operation by checking if the item exists
    if (body.id) {
      logger.info("Checking if navigation item exists for update", { id: body.id });
      // First check if this ID exists in the database
      const existingItems = await getNavigationItems();
      const itemExists = existingItems.some(item => item.id === Number(body.id));
      
      if (itemExists) {
        // This is an update operation
        const { id, ...data } = body;
        try {
          logger.info("Updating existing navigation item", { id });
          const updatedItem = await updateNavigationItem(Number(id), data)
          logger.info("Navigation item updated successfully", { id });

          return NextResponse.json({
            isSuccess: true,
            message: "Navigation item updated successfully",
            data: updatedItem
          })
        } catch (error) {
          logger.error("Error updating navigation item", { error, id });
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
      logger.info("Creating new navigation item", { label: body.label, type: body.type });
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

      logger.info("Navigation item created successfully", { id: newItem.id });

      return NextResponse.json({
        isSuccess: true,
        message: "Navigation item created successfully",
        data: newItem
      })
    } catch (error) {
      logger.error("Error creating navigation item", { error });
      const errorMessage = error instanceof Error ? error.message : "Failed to create navigation item";
      return NextResponse.json(
        { isSuccess: false, message: errorMessage },
        { status: 500 }
      )
    }
  } catch (error) {
    logger.error("Error handling navigation item request", { error });
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
  const requestId = generateRequestId();
  const logger = createLogger({ requestId, route: "/api/admin/navigation", method: "PATCH" });
  
  try {
    logger.info("Processing navigation item position update request");
    
    // Check admin authorization
    const authError = await requireAdmin();
    if (authError) {
      logger.warn("Admin authorization failed");
      return authError;
    }

    const body = await request.json()
    
    if (!body.id || typeof body.position !== 'number') {
      logger.warn("Invalid request data", { id: body.id, position: body.position });
      return NextResponse.json(
        { isSuccess: false, message: "Missing id or position" },
        { status: 400 }
      )
    }

    try {
      logger.info("Updating navigation item position", { id: body.id, position: body.position });
      const updatedItem = await updateNavigationItem(Number(body.id), { position: body.position })

      if (!updatedItem) {
        logger.warn("Navigation item not found for position update", { id: body.id });
        return NextResponse.json(
          { isSuccess: false, message: "Item not found" },
          { status: 404 }
        )
      }

      logger.info("Navigation item position updated successfully", { id: body.id, position: body.position });

      return NextResponse.json({
        isSuccess: true,
        message: "Position updated successfully",
        data: updatedItem
      })
    } catch (error) {
      logger.error("Error updating navigation item position", { error, id: body.id });
      throw error
    }
  } catch (error) {
    logger.error("Error handling navigation position update", { error });
    return NextResponse.json(
      { 
        isSuccess: false, 
        message: error instanceof Error ? error.message : "Failed to update position"
      },
      { status: 500 }
    )
  }
} 