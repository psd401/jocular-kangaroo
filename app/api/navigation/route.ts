import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth/server-session"
import { getNavigationItems as getNavigationItemsViaDataAPI } from "@/lib/db/data-api-adapter"
import { getCurrentUserAction } from "@/actions/db/get-current-user-action"
import { getUserTools } from "@/lib/auth/tool-helpers"
import { generateRequestId, createLogger } from "@/lib/logger"

export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

/**
 * Navigation API
 * 
 * Returns navigation items filtered by user permissions:
 * - Returns top-level items (parent_id = null) and their children
 * - Filters items requiring tools the user doesn't have access to
 * - Hides admin items for non-admin users
 * - Preserves the parent-child relationship for proper nesting in the UI
 * 
 * Response format:
 * {
 *   isSuccess: boolean,
 *   data: [
 *     {
 *       id: string,
 *       label: string,
 *       icon: string, // Icon name from iconMap
 *       link: string | null, // If null, this is a dropdown section
 *       parent_id: string | null, // If null, this is a top-level item
 *       parent_label: string | null,
 *       tool_id: string | null, // If provided, requires tool access
 *       position: number // For ordering items
 *     },
 *     ...
 *   ]
 * }
 */
export async function GET() {
  const requestId = generateRequestId();
  const logger = createLogger({ requestId, route: "/api/navigation", method: "GET" });
  
  try {
    logger.info("Fetching navigation items");
    
    // Check if user is authenticated using NextAuth
    const session = await getServerSession()
    
    if (!session) {
      logger.info("Unauthorized access attempt");
      return NextResponse.json(
        { isSuccess: false, message: "Unauthorized" },
        { status: 401 }
      )
    }
    
    // Check if Data API is configured
    const missingEnvVars = [];
    if (!process.env.RDS_RESOURCE_ARN) missingEnvVars.push('RDS_RESOURCE_ARN');
    if (!process.env.RDS_SECRET_ARN) missingEnvVars.push('RDS_SECRET_ARN');
    
    // AWS Amplify provides AWS_REGION and AWS_DEFAULT_REGION at runtime
    // We should check NEXT_PUBLIC_AWS_REGION as a fallback
    const region = process.env.AWS_REGION || 
                   process.env.AWS_DEFAULT_REGION || 
                   process.env.NEXT_PUBLIC_AWS_REGION;
    
    if (!region) missingEnvVars.push('NEXT_PUBLIC_AWS_REGION');
    
    if (missingEnvVars.length > 0) {
      logger.error("Missing required environment variables:", {
        missing: missingEnvVars,
        RDS_RESOURCE_ARN: process.env.RDS_RESOURCE_ARN ? 'set' : 'missing',
        RDS_SECRET_ARN: process.env.RDS_SECRET_ARN ? 'set' : 'missing',
        AWS_REGION: process.env.AWS_REGION || 'not set (provided by Amplify)',
        AWS_DEFAULT_REGION: process.env.AWS_DEFAULT_REGION || 'not set (provided by Amplify)',
        NEXT_PUBLIC_AWS_REGION: process.env.NEXT_PUBLIC_AWS_REGION || 'not set',
        availableEnvVars: Object.keys(process.env).filter(k => 
          k.includes('AWS') || k.includes('RDS')).join(', ')
      });
      
      return NextResponse.json(
        {
          isSuccess: false,
          message: `Database configuration incomplete. Missing: ${missingEnvVars.join(', ')}`,
          debug: process.env.NODE_ENV !== 'production' ? {
            missing: missingEnvVars,
            availableEnvVars: Object.keys(process.env).filter(k => 
              k.includes('AWS') || k.includes('RDS'))
          } : undefined
        },
        { status: 500 }
      )
    }
    
    try {
      // Get current user and their tools
      const userResult = await getCurrentUserAction();
      if (!userResult.isSuccess || !userResult.data) {
        logger.error("Failed to get user data", { userResult });
        return NextResponse.json(
          { isSuccess: false, message: "Failed to get user data" },
          { status: 500 }
        )
      }
      
      logger.info("User data retrieved successfully", { userId: userResult.data.user.id });

      const userTools = await getUserTools(userResult.data.user.id);
      logger.info("User tools retrieved", { toolCount: userTools.length });
      
      const navItems = await getNavigationItemsViaDataAPI();
      logger.info("Navigation items retrieved from database", { itemCount: navItems.length });

      // Get all tools to map toolId to tool identifier
      const { executeSQL } = await import('@/lib/db/data-api-adapter');
      const toolsResult = await executeSQL('SELECT id, identifier FROM tools');
      const toolIdToIdentifier = Object.fromEntries(
        toolsResult.map(tool => [Number(tool.id), String(tool.identifier)])
      );

      // Filter navigation items based on tool access
      const filteredNavItems = navItems.filter(item => {
        // If no tool_identifier is specified, the item is available to all
        if (!item.toolId) return true;
        
        // Check if user has access to the required tool
        const toolIdentifier = toolIdToIdentifier[item.toolId];
        return toolIdentifier && userTools.includes(toolIdentifier);
      });

      // Format the navigation items
      const formattedNavItems = filteredNavItems.map(item => ({
        id: item.id,
        label: item.label,
        icon: item.icon,
        link: item.link,
        parent_id: item.parentId,
        parent_label: null, // This column doesn't exist in the table
        tool_id: item.toolId,
        position: item.position,
        type: item.type || 'link',
        description: item.description || null,
        color: null // This column doesn't exist in the current table
      }))

      logger.info("Navigation items filtered and formatted successfully", { 
        originalCount: navItems.length,
        filteredCount: formattedNavItems.length 
      });
      
      return NextResponse.json({
        isSuccess: true,
        data: formattedNavItems
      })
      
    } catch (error) {
      logger.error("Data API error:", error);
      
      // Enhanced error logging for debugging
      interface ErrorDetails {
        timestamp: string;
        endpoint: string;
        error: unknown;
        credentialIssue?: boolean;
        hint?: string;
        permissionIssue?: boolean;
      }

      const errorDetails: ErrorDetails = {
        timestamp: new Date().toISOString(),
        endpoint: '/api/navigation',
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack?.split('\n').slice(0, 5).join('\n')
        } : error
      };
      
      // Check if it's an AWS SDK error
      if (error instanceof Error && 'name' in error) {
        if (error.name === 'CredentialsProviderError' || 
            error.message?.includes('Could not load credentials')) {
          errorDetails.credentialIssue = true;
          errorDetails.hint = 'AWS credentials not properly configured';
        } else if (error.name === 'AccessDeniedException') {
          errorDetails.permissionIssue = true;
          errorDetails.hint = 'IAM permissions insufficient for RDS Data API';
        }
      }
      
      logger.error("Enhanced error details:", errorDetails);
      
      return NextResponse.json(
        {
          isSuccess: false,
          message: "Failed to fetch navigation items",
          error: error instanceof Error ? error.message : "Unknown error",
          debug: process.env.NODE_ENV !== 'production' ? errorDetails : undefined
        },
        { status: 500 }
      )
    }
    
  } catch (error) {
    logger.error("Error in navigation API:", error)
    // Log more details about the error
    if (error instanceof Error) {
      logger.error("Outer error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 5).join('\n')
      });
    }
    return NextResponse.json(
      {
        isSuccess: false,
        message: error instanceof Error ? error.message : "Failed to fetch navigation"
      },
      { status: 500 }
    )
  }
} 