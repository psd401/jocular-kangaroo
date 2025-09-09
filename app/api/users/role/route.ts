import { getServerSession } from '@/lib/auth/server-session';
import { executeSQL, updateUserRole } from '@/lib/db/data-api-adapter';
import { NextResponse } from 'next/server';
import { hasRole } from '@/utils/roles';
import { generateRequestId, createLogger } from "@/lib/logger";

export async function POST(request: Request) {
  const requestId = generateRequestId();
  const logger = createLogger({ requestId, route: "/api/users/role", method: "POST" });
  
  const session = await getServerSession();
  
  if (!session) {
    logger.info("Unauthorized access attempt for role update");
    return new NextResponse('Unauthorized', { status: 401 });
  }

  logger.info("User authenticated for role update", { cognitoSub: session.sub });

  // Check if current user is administrator
  const isAdmin = await hasRole('administrator');
  if (!isAdmin) {
    logger.info("Non-admin user attempted role update", { cognitoSub: session.sub });
    return new NextResponse('Forbidden', { status: 403 });
  }

  try {
    const { targetUserId, role } = await request.json();

    if (!targetUserId || !role || !['student', 'staff', 'administrator'].includes(role)) {
      logger.error("Invalid request data for role update", { targetUserId, role });
      return new NextResponse('Invalid request', { status: 400 });
    }

    logger.info("Updating user role", { targetUserId, role });

    // Update user role using RDS Data API
    await updateUserRole(targetUserId, role);
    
    // Get updated user info
    const sql = 'SELECT id, cognito_sub, email, first_name, last_name FROM users WHERE id = :userId';
    const params = [{ name: 'userId', value: { stringValue: targetUserId } }];
    const result = await executeSQL(sql, params);
    
    if (!result || result.length === 0) {
      logger.error("User not found after role update", { targetUserId });
      return new NextResponse('User not found', { status: 404 });
    }
    
    logger.info("User role updated successfully", { 
      targetUserId, 
      role,
      updatedBy: session.sub 
    });
    
    return NextResponse.json(result[0]);
  } catch (error) {
    logger.error('Error updating user role:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 