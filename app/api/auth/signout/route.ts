import { NextRequest, NextResponse } from "next/server";
import { auth, signOut } from "@/auth";
import { generateRequestId, createLogger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  const logger = createLogger({ requestId, route: "/api/auth/signout", method: "GET" });

  try {
    logger.info("Starting signout process");
    
    // Get the current session BEFORE signing out
    const session = await auth();
    
    if (session) {
      logger.info("Session found, proceeding with Cognito logout", { userId: session.user?.id });
      
      // Build the Cognito logout URL first
      const cognitoDomain = process.env.NEXT_PUBLIC_COGNITO_DOMAIN;
      const clientId = process.env.AUTH_COGNITO_CLIENT_ID;
      const logoutUri = `${request.nextUrl.origin}/`;
      
      const cognitoLogoutUrl = `https://${cognitoDomain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(logoutUri)}`;
      
      logger.info("Built Cognito logout URL", { logoutUri, cognitoLogoutUrl });
      
      // Sign out from NextAuth
      // IMPORTANT: Don't await this, as it might interfere with our redirect
      signOut({ redirect: false });
      
      // Immediately redirect to Cognito logout
      return NextResponse.redirect(cognitoLogoutUrl);
    }
    
    logger.info("No session found, redirecting to home");
    // If no session, just redirect to home
    return NextResponse.redirect(new URL("/", request.url));
  } catch (error) {
    logger.error("Sign out route error", { error: error instanceof Error ? error.message : String(error) });
    
    // On error, redirect home
    return NextResponse.redirect(new URL("/", request.url));
  }
}