import { NextResponse } from 'next/server';
import { testDrizzleConnection } from '@/lib/db/drizzle-client';
import { requireAdmin } from '@/lib/auth/admin-check';
import { createLogger, generateRequestId } from '@/lib/logger';

const isProd = process.env.NODE_ENV === 'production';

export async function GET() {
  // Require admin authentication
  const authError = await requireAdmin();
  if (authError) return authError;

  const requestId = generateRequestId();
  const logger = createLogger({ requestId, context: 'test-connection' });

  try {
    logger.info('Testing Drizzle connection for admin user');

    const result = await testDrizzleConnection();

    if (result.success) {
      logger.info('Connection test successful');
      return NextResponse.json({
        success: true,
        message: result.message,
        timestamp: result.timestamp,
        data: result.result
      });
    } else {
      logger.error('Connection test failed', { error: result.message });
      return NextResponse.json(
        {
          success: false,
          error: isProd ? 'Database connection test failed' : result.message
        },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error('Connection test error:', error);
    return NextResponse.json(
      {
        success: false,
        error: isProd ? 'Internal server error' : (error instanceof Error ? error.message : 'Unknown error')
      },
      { status: 500 }
    );
  }
}
