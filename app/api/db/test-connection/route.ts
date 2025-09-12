import { NextResponse } from 'next/server';
import { testDrizzleConnection } from '@/lib/db/drizzle-client';
import { getServerSession } from '@/lib/auth/server-session';
import { createLogger, generateRequestId } from '@/lib/logger';

export async function GET() {
  const requestId = generateRequestId();
  const logger = createLogger({ requestId, context: 'test-connection' });
  
  try {
    // Check authentication (optional - remove if you want to test without auth)
    const session = await getServerSession();
    if (!session) {
      logger.warn('Unauthorized connection test attempt');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    logger.info('Testing Drizzle connection', { userId: session.user?.id });
    
    // Test the Drizzle connection
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
          error: result.message
        },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error('Connection test error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}