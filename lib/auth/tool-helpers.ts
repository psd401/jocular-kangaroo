"use server"

import { getCurrentUserAction } from "@/actions/db/get-current-user-action";
import { executeSQL, type FormattedRow } from "@/lib/db/data-api-adapter";

/**
 * @deprecated This file contains legacy authentication helpers that are incompatible with the modern RBAC system.
 *
 * **Migration Guide:**
 * - Use `hasToolAccess(toolIdentifier)` from `@/utils/roles` instead
 * - Use `getUserTools()` from `@/utils/roles` instead
 *
 * The modern helpers automatically retrieve the session and use cognito_sub for user identification,
 * which is compatible with the current RBAC implementation.
 *
 * See PR #59 for migration examples.
 */

/**
 * Check if the current user has access to a specific tool
 * @deprecated Use `hasToolAccess(toolIdentifier)` from `@/utils/roles` instead.
 * This legacy function uses numeric userId which is incompatible with modern RBAC.
 */
export async function hasToolAccess(userId: number, toolIdentifier: string): Promise<boolean> {
  try {
    const query = `
      SELECT COUNT(*) as count
      FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      JOIN role_tools rt ON ur.role_id = rt.role_id
      JOIN tools t ON rt.tool_id = t.id
      WHERE u.id = $1
        AND t.identifier = $2
    `;

    const parameters = [
      { name: '1', value: { longValue: userId } },
      { name: '2', value: { stringValue: toolIdentifier } }
    ];
    
    const result = await executeSQL<FormattedRow>(query, parameters);
    return result.length > 0 && Number(result[0].count) > 0;
  } catch {
    // Error logged: Error checking tool access
    return false;
  }
}

/**
 * Get all tools accessible to the current user
 * @deprecated Use `getUserTools()` from `@/utils/roles` instead.
 * This legacy function uses numeric userId which is incompatible with modern RBAC.
 */
export async function getUserTools(userId: number): Promise<string[]> {
  try {
    const query = `
      SELECT DISTINCT t.identifier
      FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      JOIN role_tools rt ON ur.role_id = rt.role_id
      JOIN tools t ON rt.tool_id = t.id
      WHERE u.id = $1
    `;

    const parameters = [
      { name: '1', value: { longValue: userId } }
    ];
    
    const result = await executeSQL<FormattedRow>(query, parameters);
    return result.map(row => row.identifier as string);
  } catch {
    // Error logged: Error fetching user tools
    return [];
  }
}

/**
 * Server helper that requires access to certain tool(s).
 * Redirects if the current user lacks access to the required tool(s).
 * @deprecated Use `hasToolAccess(toolIdentifier)` from `@/utils/roles` instead with appropriate redirect logic.
 * This legacy function uses numeric userId which is incompatible with modern RBAC.
 */
export async function requireToolAccess(requiredTools: string | string[]) {
  const tools = Array.isArray(requiredTools) ? requiredTools : [requiredTools];
  const result = await getCurrentUserAction();
  
  if (!result.isSuccess || !result.data) {
    const { redirect } = await import("next/navigation");
    redirect("/");
  }

  const userTools = await getUserTools(result.data!.user.id);
  const hasAccess = tools.some(tool => userTools.includes(tool));
  
  if (!hasAccess) {
    const { redirect } = await import("next/navigation");
    redirect("/dashboard");
  }
  
  return result.data;
}