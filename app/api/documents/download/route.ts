import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/server-session";
import { getCurrentUserAction } from "@/actions/db/get-current-user-action";
import { getDocumentSignedUrl } from "@/lib/aws/s3-client";

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get current user
    const userResult = await getCurrentUserAction();
    if (!userResult.isSuccess || !userResult.data) {
      return NextResponse.json(
        { error: "Failed to get user data" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    if (!key) {
      return NextResponse.json(
        { error: "Document key is required" },
        { status: 400 }
      );
    }

    // Generate a signed URL for download
    const url = await getDocumentSignedUrl({
      key,
      expiresIn: 300, // 5 minutes
    });

    // Redirect to the signed URL
    return NextResponse.redirect(url);
  } catch (error) {
    // Error logged: Error generating download URL
    return NextResponse.json(
      { error: "Failed to generate download URL" },
      { status: 500 }
    );
  }
}