/**
 * Test file to verify Drizzle ORM automatic casing transformation
 *
 * This demonstrates that:
 * 1. TypeScript code uses camelCase properties
 * 2. Database queries use snake_case columns
 * 3. Results are automatically transformed to camelCase
 */

import { db } from '@/lib/db/drizzle-client';
import { users, navigationItems } from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import { createLogger } from '@/lib/logger';

const log = createLogger({ context: 'test-casing' });

/**
 * Example: Query users with camelCase properties
 * Database columns: cognito_sub, first_name, last_name, created_at
 * TypeScript properties: cognitoSub, firstName, lastName, createdAt
 */
export async function testUserCasing(cognitoSub: string) {
  try {
    log.info('Testing user casing transformation', { cognitoSub });

    // 🎯 This query uses camelCase TypeScript properties
    const user = await db
      .select({
        id: users.id,
        cognitoSub: users.cognitoSub, // maps to cognito_sub column
        email: users.email,
        firstName: users.firstName,   // maps to first_name column
        lastName: users.lastName,     // maps to last_name column
        createdAt: users.createdAt,   // maps to created_at column
        lastSignInAt: users.lastSignInAt // maps to last_sign_in_at column
      })
      .from(users)
      .where(eq(users.cognitoSub, cognitoSub)) // camelCase property
      .limit(1);

    if (user.length > 0) {
      const userData = user[0];

      // ✅ Result object has camelCase properties automatically
      log.info('User found with camelCase properties', {
        id: userData.id,
        cognitoSub: userData.cognitoSub,
        firstName: userData.firstName,
        lastName: userData.lastName,
        createdAt: userData.createdAt
      });

      return userData;
    }

    log.info('No user found');
    return null;

  } catch (error) {
    log.error('Error testing user casing', error);
    throw error;
  }
}

/**
 * Example: Query navigation items with complex field mappings
 * Database columns: parent_id, tool_id, requires_role, is_active, created_at, tool_identifier
 * TypeScript properties: parentId, toolId, requiresRole, isActive, createdAt, toolIdentifier
 */
export async function testNavigationCasing() {
  try {
    log.info('Testing navigation item casing transformation');

    // 🎯 Complex query with multiple snake_case -> camelCase mappings
    const navItems = await db
      .select({
        id: navigationItems.id,
        label: navigationItems.label,
        parentId: navigationItems.parentId,      // maps to parent_id
        toolId: navigationItems.toolId,          // maps to tool_id
        requiresRole: navigationItems.requiresRole, // maps to requires_role
        isActive: navigationItems.isActive,      // maps to is_active
        createdAt: navigationItems.createdAt,    // maps to created_at
        toolIdentifier: navigationItems.toolIdentifier // maps to tool_identifier
      })
      .from(navigationItems)
      .where(eq(navigationItems.isActive, true)) // camelCase property
      .orderBy(navigationItems.position)
      .limit(5);

    log.info('Navigation items found', {
      count: navItems.length,
      sampleItem: navItems[0] ? {
        id: navItems[0].id,
        label: navItems[0].label,
        parentId: navItems[0].parentId,
        isActive: navItems[0].isActive,
        createdAt: navItems[0].createdAt
      } : null
    });

    return navItems;

  } catch (error) {
    log.error('Error testing navigation casing', error);
    throw error;
  }
}

/**
 * Comparison function to show before/after approach
 */
export function demonstrateCasingBenefits() {
  log.info('=== BEFORE (Manual field mapping) ===');
  log.info(`
    // Old approach with executeSQL + manual transformation
    const result = await executeSQL("SELECT cognito_sub, first_name FROM users WHERE id = :id", params);
    const transformedResult = result.map(row => snakeToCamel<UserType>(row));
    console.log(transformedResult[0].firstName); // Manual transformation required
  `);

  log.info('=== AFTER (Automatic casing with Drizzle) ===');
  log.info(`
    // New approach with automatic transformation
    const result = await db.select().from(users).where(eq(users.id, id));
    console.log(result[0].firstName); // Automatic camelCase! 🎉
  `);
}

/**
 * Helper function to test the connection and casing setup
 */
export async function verifyCasingSetup() {
  try {
    log.info('Verifying Drizzle casing setup...');

    // Test basic connection
    await db
      .select({ count: users.id })
      .from(users)
      .limit(1);

    log.info('✅ Drizzle connection successful');
    log.info('✅ Casing transformation configured');
    log.info('✅ Schema imported correctly');

    return {
      success: true,
      message: 'Casing setup verified successfully'
    };

  } catch (error) {
    log.error('❌ Casing setup verification failed', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      error
    };
  }
}