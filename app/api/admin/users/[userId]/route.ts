import { NextResponse } from 'next/server';
import { deleteUser } from '@/lib/db/data-api-adapter';
import { requireAdmin } from '@/lib/auth/admin-check';
import { generateRequestId, createLogger } from '@/lib/logger';

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ userId: string }> }
) {
  const requestId = generateRequestId();
  const logger = createLogger({ requestId, route: "/api/admin/users/[userId]", method: "DELETE" });
  
  try {
    // Check admin authorization
    const authError = await requireAdmin();
    if (authError) {
      logger.warn("Admin authorization failed");
      return authError;
    }

    // Await and validate the params object
    const params = await context.params;
    const targetUserId = params.userId;
    
    logger.info("Processing user deletion request", { targetUserId });
    
    if (!targetUserId) {
      logger.warn("Invalid user ID provided", { targetUserId });
      return NextResponse.json(
        { isSuccess: false, message: 'Invalid user ID' },
        { status: 400 }
      );
    }

    // Delete the user via Data API
    logger.info("Deleting user", { targetUserId });
    const deletedUser = await deleteUser(parseInt(targetUserId));

    if (!deletedUser) {
      logger.warn("User not found for deletion", { targetUserId });
      return NextResponse.json(
        { isSuccess: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // TODO: Also delete from Cognito when we have proper integration
    logger.info("User deleted successfully", { targetUserId });

    return NextResponse.json({
      isSuccess: true,
      message: 'User deleted successfully',
      data: deletedUser
    });
  } catch (error) {
    logger.error('Error deleting user', { error, targetUserId: (await context.params).userId });
    return NextResponse.json(
      { 
        isSuccess: false, 
        message: error instanceof Error 
          ? `Failed to delete user: ${error.message}` 
          : 'Failed to delete user'
      },
      { status: 500 }
    );
  }
} 