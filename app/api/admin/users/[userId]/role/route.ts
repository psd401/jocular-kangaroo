import { NextRequest, NextResponse } from 'next/server';
import { updateUserRole } from '@/lib/db/data-api-adapter';
import { requireAdmin } from '@/lib/auth/admin-check';
import { validateRequest, updateUserRoleSchema } from '@/lib/validations/api-schemas';
import { generateRequestId, createLogger } from '@/lib/logger';

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  const requestId = generateRequestId();
  const logger = createLogger({ requestId, route: "/api/admin/users/[userId]/role", method: "PUT" });
  
  try {
    // Await the params object before using it
    const params = await context.params;
    const userIdString = params.userId;
    
    logger.info("Processing user role update request", { userId: userIdString });
    
    // Check admin authorization
    const authError = await requireAdmin();
    if (authError) {
      logger.warn("Admin authorization failed", { userId: userIdString });
      return authError;
    }

    // Validate request body
    const { data: validatedData, error } = await validateRequest(request, updateUserRoleSchema);
    if (error) {
      logger.warn("Request validation failed", { userId: userIdString, error });
      return NextResponse.json(
        { isSuccess: false, message: error },
        { status: 400 }
      );
    }
    const { role: newRole } = validatedData!;
    
    // Update the user's role via Data API
    const userId = parseInt(userIdString, 10);
    if (isNaN(userId)) {
      logger.warn("Invalid user ID", { userId: userIdString });
      return NextResponse.json(
        { isSuccess: false, message: 'Invalid user ID' },
        { status: 400 }
      );
    }
    
    logger.info("Updating user role", { userId, newRole });
    await updateUserRole(userId, newRole);

    logger.info("User role updated successfully", { userId, newRole });

    return NextResponse.json({
      isSuccess: true,
      message: 'User role updated successfully'
    });
  } catch (error) {
    logger.error('Error updating user role', { error, userId: (await context.params).userId });
    return NextResponse.json(
      { 
        isSuccess: false, 
        message: error instanceof Error 
          ? `Failed to update user role: ${error.message}` 
          : 'Failed to update user role'
      },
      { status: 500 }
    );
  }
}