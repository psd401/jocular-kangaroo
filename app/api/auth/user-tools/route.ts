import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth/server-session"
import { getUserTools } from "@/utils/roles"
import logger from '@/lib/logger';

export async function GET() {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json(
        { isSuccess: false, message: "Unauthorized" },
        { status: 401 }
      )
    }

    // Get user's tools - the getUserTools function already gets the session internally
    const tools = await getUserTools()

    return NextResponse.json({
      isSuccess: true,
      data: tools
    })
  } catch (error) {
    logger.error("Error fetching user tools:", error)
    return NextResponse.json(
      { 
        isSuccess: false, 
        message: error instanceof Error ? error.message : "Failed to fetch user tools"
      },
      { status: 500 }
    )
  }
} 