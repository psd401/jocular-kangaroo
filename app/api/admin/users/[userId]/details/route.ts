import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin-check';
import { executeSQL } from '@/lib/db/data-api-adapter';
import { generateRequestId, createLogger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  const requestId = generateRequestId();
  const logger = createLogger({ requestId, route: "/api/admin/users/[userId]/details", method: "GET" });
  
  const params = await context.params;
  logger.info("Fetching user details", { userId: params.userId });
  
  // Check admin authorization
  const authError = await requireAdmin();
  if (authError) {
    logger.warn("Admin authorization failed", { userId: params.userId });
    return authError;
  }

  try {
    // Get user details from database
    const query = `
      SELECT id, cognito_sub, email, first_name, last_name
      FROM users
      WHERE id = :userId
    `;
    const parameters = [
      { name: 'userId', value: { stringValue: params.userId } }
    ];
    
    const result = await executeSQL(query, parameters);
    
    if (!result || result.length === 0) {
      logger.warn("User not found", { userId: params.userId });
      return new NextResponse('User not found', { status: 404 });
    }
    
    const user = result[0];
    
    logger.info("User details retrieved successfully", { userId: params.userId, userEmail: user.email });
    
    return NextResponse.json({
      firstName: user.first_name,
      lastName: user.last_name,
      emailAddresses: [{ emailAddress: user.email }]
    });
  } catch (error) {
    logger.error('Error fetching user details', { error, userId: params.userId });
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 