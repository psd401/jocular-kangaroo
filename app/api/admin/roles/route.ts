import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db/drizzle-client"
import { roles } from "@/src/db/schema"
import { asc, eq } from "drizzle-orm"
import { requireAdmin } from "@/lib/auth/admin-check"
import { generateRequestId, createLogger } from "@/lib/logger"

export async function GET() {
  const requestId = generateRequestId();
  const logger = createLogger({ requestId, route: "/api/admin/roles", method: "GET" });

  try {
    logger.info("Fetching all roles for admin");

    const authError = await requireAdmin();
    if (authError) {
      logger.warn("Admin authorization failed");
      return authError;
    }

    const result = await db
      .select({
        id: roles.id,
        name: roles.name
      })
      .from(roles)
      .orderBy(asc(roles.name));

    const rolesData = result.map((record) => ({
      id: String(record.id),
      name: String(record.name),
    }))

    logger.info("Roles retrieved successfully", { roleCount: rolesData.length });

    return NextResponse.json({
      isSuccess: true,
      data: rolesData
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

    const authError = await requireAdmin();
    if (authError) {
      logger.warn("Admin authorization failed");
      return authError;
    }

    const body = await request.json()

    if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
      logger.error("Invalid role name provided", { name: body.name });
      return NextResponse.json(
        { error: "Role name is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    if (body.name.length > 100) {
      return NextResponse.json(
        { error: "Role name must be 100 characters or less" },
        { status: 400 }
      );
    }

    const [existingRole] = await db
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.name, body.name.trim()))
      .limit(1);

    if (existingRole) {
      logger.error("Duplicate role name", { name: body.name });
      return NextResponse.json(
        { error: "A role with this name already exists" },
        { status: 409 }
      );
    }

    logger.info("Creating new role", { roleName: body.name.trim() });

    const [role] = await db
      .insert(roles)
      .values({
        name: body.name.trim(),
        description: body.description?.trim() ?? null,
        isSystem: false
      })
      .returning();

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