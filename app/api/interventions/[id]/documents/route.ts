import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/server-session";
import { getCurrentUserAction } from "@/actions/db/get-current-user-action";
import { uploadDocument, deleteDocument } from "@/lib/aws/s3-client";
import { executeSQL } from "@/lib/db/data-api-adapter";
import { hasToolAccess } from "@/lib/auth/tool-helpers";

// Upload a document for an intervention
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const currentUser = userResult.data;

    // Check if user has access to interventions
    const hasAccess = await hasToolAccess(currentUser.user.id, "interventions");
    if (!hasAccess) {
      return NextResponse.json(
        { error: "You do not have permission to upload intervention documents" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const interventionId = parseInt(id);
    if (isNaN(interventionId)) {
      return NextResponse.json(
        { error: "Invalid intervention ID" },
        { status: 400 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const description = formData.get("description") as string;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Check file size (limit to 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit" },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to S3
    const { key, url } = await uploadDocument({
      userId: `intervention-${interventionId}`,
      fileName: file.name,
      fileContent: buffer,
      contentType: file.type,
      metadata: {
        interventionId: interventionId.toString(),
        uploadedBy: currentUser.user.id.toString(),
        description: description || "",
      },
    });

    // Save reference in database
    const insertQuery = `
      INSERT INTO intervention_attachments (
        intervention_id, file_name, file_key, file_size, 
        content_type, description, uploaded_by, uploaded_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP
      ) RETURNING id
    `;

    const result = await executeSQL(insertQuery, [
      { name: "1", value: { longValue: interventionId } },
      { name: "2", value: { stringValue: file.name } },
      { name: "3", value: { stringValue: key } },
      { name: "4", value: { longValue: file.size } },
      { name: "5", value: { stringValue: file.type } },
      { name: "6", value: { stringValue: description || "" } },
      { name: "7", value: { longValue: currentUser.user.id } },
    ]);

    const attachmentId = result?.[0]?.id;

    return NextResponse.json({
      success: true,
      data: {
        id: attachmentId,
        fileName: file.name,
        key,
        url,
        size: file.size,
        contentType: file.type,
      },
    });
  } catch (error) {
    // Error logged: Error uploading document
    return NextResponse.json(
      { error: "Failed to upload document" },
      { status: 500 }
    );
  }
}

// Get documents for an intervention
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const currentUser = userResult.data;

    // Check if user has access to interventions
    const hasAccess = await hasToolAccess(currentUser.user.id, "interventions");
    if (!hasAccess) {
      return NextResponse.json(
        { error: "You do not have permission to view intervention documents" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const interventionId = parseInt(id);
    if (isNaN(interventionId)) {
      return NextResponse.json(
        { error: "Invalid intervention ID" },
        { status: 400 }
      );
    }

    // Get attachments from database
    const query = `
      SELECT 
        a.id, a.file_name, a.file_key, a.file_size, 
        a.content_type, a.description, a.uploaded_at,
        u.first_name, u.last_name
      FROM intervention_attachments a
      LEFT JOIN users u ON a.uploaded_by = u.id
      WHERE a.intervention_id = $1
      ORDER BY a.uploaded_at DESC
    `;

    const result = await executeSQL(query, [
      { name: "1", value: { longValue: interventionId } },
    ]);

    const attachments = result?.map(record => ({
      id: Number(record.id),
      fileName: String(record.fileName),
      fileKey: String(record.fileKey),
      fileSize: Number(record.fileSize),
      contentType: String(record.contentType),
      description: record.description ? String(record.description) : null,
      uploadedAt: new Date(String(record.uploadedAt)),
      uploadedBy: {
        firstName: record.firstName ? String(record.firstName) : null,
        lastName: record.lastName ? String(record.lastName) : null,
      },
    })) || [];

    return NextResponse.json({
      success: true,
      data: attachments,
    });
  } catch (error) {
    // Error logged: Error fetching documents
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}

// Delete a document
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const currentUser = userResult.data;

    // Check if user has access to interventions
    const hasAccess = await hasToolAccess(currentUser.user.id, "interventions");
    if (!hasAccess) {
      return NextResponse.json(
        { error: "You do not have permission to delete intervention documents" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const attachmentId = searchParams.get("attachmentId");

    if (!attachmentId || isNaN(parseInt(attachmentId))) {
      return NextResponse.json(
        { error: "Invalid attachment ID" },
        { status: 400 }
      );
    }

    const { id } = await params;

    // Get attachment details
    const selectQuery = `
      SELECT file_key, uploaded_by 
      FROM intervention_attachments 
      WHERE id = $1 AND intervention_id = $2
    `;

    const selectResult = await executeSQL(selectQuery, [
      { name: "1", value: { longValue: parseInt(attachmentId) } },
      { name: "2", value: { longValue: parseInt(id) } },
    ]);

    if (!selectResult || selectResult.length === 0) {
      return NextResponse.json(
        { error: "Attachment not found" },
        { status: 404 }
      );
    }

    const fileKey = String(selectResult[0].fileKey);
    const uploadedBy = Number(selectResult[0].uploadedBy);

    // Check if user can delete (must be uploader or admin)
    const isAdmin = currentUser.roles.some(r => r.name === "Administrator");
    if (uploadedBy !== currentUser.user.id && !isAdmin) {
      return NextResponse.json(
        { error: "You can only delete your own attachments" },
        { status: 403 }
      );
    }

    // Delete from S3
    await deleteDocument(fileKey);

    // Delete from database
    const deleteQuery = `
      DELETE FROM intervention_attachments 
      WHERE id = $1
    `;

    await executeSQL(deleteQuery, [
      { name: "1", value: { longValue: parseInt(attachmentId) } },
    ]);

    return NextResponse.json({
      success: true,
      message: "Document deleted successfully",
    });
  } catch (error) {
    // Error logged: Error deleting document
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 }
    );
  }
}