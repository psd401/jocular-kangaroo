import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth/server-session"
import { getUserRolesByCognitoSub } from "@/lib/db/data-api-adapter"
import { generateRequestId, createLogger } from "@/lib/logger";

export async function GET() {
  const requestId = generateRequestId();
  const logger = createLogger({ requestId, route: "/api/user/groups", method: "GET" });
  
  try {
    logger.info("Fetching user groups");
    
    const session = await getServerSession()
    if (!session) {
      logger.info("Unauthorized access attempt");
      return NextResponse.json(
        { isSuccess: false, message: "Unauthorized" },
        { status: 401 }
      )
    }

    logger.info("User authenticated for groups fetch", { cognitoSub: session.sub });

    // Get user roles
    const groups = await getUserRolesByCognitoSub(session.sub)
    
    logger.info("User groups fetched successfully", { groupCount: groups.length });

    return NextResponse.json({ isSuccess: true, groups })
  } catch (error) {
    logger.error("Error fetching user groups:", error)
    return NextResponse.json(
      { 
        isSuccess: false, 
        message: error instanceof Error ? error.message : "Failed to fetch user groups"
      },
      { status: 500 }
    )
  }
} 