"use server"

import { getCurrentUserAction } from "@/actions/db/get-current-user-action";
import { executeSQL } from "@/lib/db/data-api-client";

/**
 * Check if the current user has access to a specific tool
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
    
    const result = await executeSQL(query, parameters);
    return result.records?.[0]?.[0]?.longValue ? result.records[0][0].longValue > 0 : false;
  } catch (error) {
    console.error('Error checking tool access:', error);
    return false;
  }
}

/**
 * Get all tools accessible to the current user
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
    
    const result = await executeSQL(query, parameters);
    return result.records?.map(record => record[0].stringValue!) || [];
  } catch (error) {
    console.error('Error fetching user tools:', error);
    return [];
  }
}

/**
 * Server helper that requires access to certain tool(s).
 * Redirects if the current user lacks access to the required tool(s).
 */
export async function requireToolAccess(requiredTools: string | string[]) {
  const tools = Array.isArray(requiredTools) ? requiredTools : [requiredTools];
  const result = await getCurrentUserAction();
  
  if (!result.isSuccess || !result.data) {
    const { redirect } = await import("next/navigation");
    redirect("/");
  }

  const userTools = await getUserTools(result.data.id);
  const hasAccess = tools.some(tool => userTools.includes(tool));
  
  if (!hasAccess) {
    const { redirect } = await import("next/navigation");
    redirect("/dashboard");
  }
  
  return result.data;
}