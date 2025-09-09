import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth/server-session"
import { getUserTools } from "@/utils/roles"
import { generateRequestId, createLogger } from "@/lib/logger";

export async function GET() {
  const requestId = generateRequestId();
  const logger = createLogger({ requestId, route: "/api/auth/user-tools", method: "GET" });

  try {
    logger.info("Fetching user tools");
    const session = await getServerSession()
    if (!session) {
      logger.warn("No session found, returning unauthorized");
      return NextResponse.json(
        { isSuccess: false, message: "Unauthorized" },
        { status: 401 }
      )
    }

    logger.info("Session found, fetching user tools", { userId: session.sub });
    // Get user's tools - the getUserTools function already gets the session internally
    const tools = await getUserTools()

    logger.info("Successfully retrieved user tools", { toolsCount: tools?.length || 0 });
    return NextResponse.json({
      isSuccess: true,
      data: tools
    })
  } catch (error) {
    logger.error("Error fetching user tools", { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json(
      { 
        isSuccess: false, 
        message: error instanceof Error ? error.message : "Failed to fetch user tools"
      },
      { status: 500 }
    )
  }
} 