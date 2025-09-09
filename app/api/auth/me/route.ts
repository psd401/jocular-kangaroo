import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth/server-session"
import { generateRequestId, createLogger } from "@/lib/logger"

export async function GET() {
  const requestId = generateRequestId();
  const logger = createLogger({ requestId, route: "/api/auth/me", method: "GET" });

  try {
    logger.info("Fetching user session information");
    const session = await getServerSession()
    
    if (!session) {
      logger.warn("No session found, returning unauthorized");
      return NextResponse.json(
        { error: "Unauthorized" }, 
        { status: 401 }
      )
    }
    
    logger.info("Session found, returning user info", { userId: session.sub });
    return NextResponse.json({ 
      userId: session.sub,
      email: session.email 
    })
  } catch (error) {
    logger.error("Error in auth/me endpoint", { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json(
      { error: "Authentication error" },
      { status: 500 }
    )
  }
} 