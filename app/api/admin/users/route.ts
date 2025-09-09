import { NextResponse } from "next/server"
import { getUsers, getUserRoles, createUser, updateUser, deleteUser } from "@/lib/db/data-api-adapter"
import { requireAdmin } from "@/lib/auth/admin-check"
import { generateRequestId, createLogger } from "@/lib/logger"
export async function GET() {
  const requestId = generateRequestId();
  const logger = createLogger({ requestId, route: "/api/admin/users", method: "GET" });
  
  try {
    logger.info("Fetching all users for admin");
    
    // Check admin authorization
    const authError = await requireAdmin();
    if (authError) {
      logger.warn("Admin authorization failed");
      return authError;
    }
    
    // Get users from database via Data API
    const dbUsers = await getUsers();
    const transformedUsers = dbUsers as Array<{id: number, cognitoSub: string, email: string, firstName: string, lastName: string, lastSignInAt: string, createdAt: string, updatedAt: string}>;
    
    // Get all user roles
    const userRoles = await getUserRoles();
    const transformedRoles = userRoles as Array<{userId: number, roleName: string}>;
    
    // Group roles by userId
    const rolesByUser = transformedRoles.reduce((acc, role) => {
      acc[role.userId] = acc[role.userId] || [];
      acc[role.userId].push(role.roleName);
      return acc;
    }, {} as Record<number, string[]>);
    
    // Map to the format expected by the UI
    const users = transformedUsers.map(dbUser => {
      const userRolesList = rolesByUser[dbUser.id] || []

      return {
        ...dbUser,
        role: userRolesList[0] || "",
        roles: userRolesList.map((name: string) => ({ name }))
      }
    })

    logger.info("Users retrieved successfully", { userCount: users.length });

    return NextResponse.json({
      isSuccess: true,
      message: "Users retrieved successfully",
      data: users
    });
  } catch (error) {
    logger.error("Error fetching users", { error });
    return NextResponse.json(
      { isSuccess: false, message: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const requestId = generateRequestId();
  const logger = createLogger({ requestId, route: "/api/admin/users", method: "POST" });
  
  try {
    logger.info("Processing user creation request");
    
    // Check admin authorization
    const authError = await requireAdmin();
    if (authError) {
      logger.warn("Admin authorization failed");
      return authError;
    }
    
    const body = await request.json()
    const userData = {
      cognitoSub: body.cognitoSub,
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email
    }

    logger.info("Creating new user", { userEmail: userData.email, firstName: userData.firstName, lastName: userData.lastName });

    const user = await createUser(userData)

    logger.info("User created successfully", { userId: user.id, userEmail: user.email });

    return NextResponse.json({
      isSuccess: true,
      message: "User created successfully",
      data: user
    })
  } catch (error) {
    logger.error("Error creating user", { error })
    return NextResponse.json(
      { isSuccess: false, message: "Failed to create user" },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  const requestId = generateRequestId();
  const logger = createLogger({ requestId, route: "/api/admin/users", method: "PUT" });
  
  try {
    logger.info("Processing user update request");
    
    // Check admin authorization
    const authError = await requireAdmin();
    if (authError) {
      logger.warn("Admin authorization failed");
      return authError;
    }

    const body = await request.json()
    const { id, ...updates } = body

    logger.info("Updating user", { userId: id, updates: Object.keys(updates) });

    const user = await updateUser(Number(id), updates)

    logger.info("User updated successfully", { userId: id });

    return NextResponse.json({
      isSuccess: true,
      message: "User updated successfully",
      data: user
    })
  } catch (error) {
    logger.error("Error updating user", { error })
    return NextResponse.json(
      { isSuccess: false, message: "Failed to update user" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  const requestId = generateRequestId();
  const logger = createLogger({ requestId, route: "/api/admin/users", method: "DELETE" });
  
  try {
    logger.info("Processing user deletion request");
    
    // Check admin authorization
    const authError = await requireAdmin();
    if (authError) {
      logger.warn("Admin authorization failed");
      return authError;
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      logger.warn("Missing user ID in delete request");
      return NextResponse.json(
        { isSuccess: false, message: "Missing user ID" },
        { status: 400 }
      )
    }

    logger.info("Deleting user", { userId: id });

    const user = await deleteUser(Number(id))

    logger.info("User deleted successfully", { userId: id });

    return NextResponse.json({
      isSuccess: true,
      message: "User deleted successfully",
      data: user
    })
  } catch (error) {
    logger.error("Error deleting user", { error })
    return NextResponse.json(
      { isSuccess: false, message: "Failed to delete user" },
      { status: 500 }
    )
  }
} 