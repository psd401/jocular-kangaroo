import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/server-session";
import { getCurrentUserAction } from "@/actions/db/get-current-user-action";
import { uploadDocument, deleteDocument } from "@/lib/aws/s3-client";
import { executeSQL } from "@/lib/db/data-api-adapter";
import { hasToolAccess } from "@/lib/auth/tool-helpers";
import { generateRequestId, createLogger } from "@/lib/logger";

// Upload a document for an intervention
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  const logger = createLogger({ requestId, route: "/api/interventions/[id]/documents", method: "POST" });
  
  try {
    logger.info("Starting document upload process");
    
    // Check authentication
    const session = await getServerSession();
    if (!session) {
      logger.info("Unauthorized access attempt for document upload");
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
      logger.info("User lacks permission to upload intervention documents", { userId: currentUser.user.id });
      return NextResponse.json(
        { error: "You do not have permission to upload intervention documents" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const interventionId = parseInt(id);
    if (isNaN(interventionId)) {
      logger.error("Invalid intervention ID provided for upload", { id });
      return NextResponse.json(
        { error: "Invalid intervention ID" },
        { status: 400 }
      );
    }
    
    logger.info("Processing document upload", { interventionId });

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const description = formData.get("description") as string;

    if (!file) {
      logger.error("No file provided in upload request");
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }
    
    logger.info("File received for upload", { 
      fileName: file.name, 
      fileSize: file.size, 
      contentType: file.type,
      description: description || "No description"
    });

    // Check file size (limit to 10MB)
    if (file.size > 10 * 1024 * 1024) {
      logger.error("File size exceeds limit", { fileSize: file.size, limit: "10MB" });
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
    
    logger.info("Document uploaded successfully", { 
      attachmentId, 
      interventionId, 
      fileName: file.name,
      uploadedBy: currentUser.user.id
    });

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
    logger.error("Error uploading document", error);
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
  const requestId = generateRequestId();
  const logger = createLogger({ requestId, route: "/api/interventions/[id]/documents", method: "GET" });
  
  try {
    logger.info("Fetching intervention documents");
    
    // Check authentication
    const session = await getServerSession();
    if (!session) {
      logger.info("Unauthorized access attempt for document fetch");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get current user
    const userResult = await getCurrentUserAction();
    if (!userResult.isSuccess || !userResult.data) {
      logger.error("Failed to get user data for document fetch", { userResult });
      return NextResponse.json(
        { error: "Failed to get user data" },
        { status: 500 }
      );
    }

    const currentUser = userResult.data;
    logger.info("User authenticated for document fetch", { userId: currentUser.user.id });

    // Check if user has access to interventions
    const hasAccess = await hasToolAccess(currentUser.user.id, "interventions");
    if (!hasAccess) {
      logger.info("User lacks permission to view intervention documents", { userId: currentUser.user.id });
      return NextResponse.json(
        { error: "You do not have permission to view intervention documents" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const interventionId = parseInt(id);
    if (isNaN(interventionId)) {
      logger.error("Invalid intervention ID provided for document fetch", { id });
      return NextResponse.json(
        { error: "Invalid intervention ID" },
        { status: 400 }
      );
    }
    
    logger.info("Fetching documents for intervention", { interventionId });

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
    
    logger.info("Documents fetched successfully", { 
      interventionId, 
      documentCount: attachments.length 
    });

    return NextResponse.json({
      success: true,
      data: attachments,
    });
  } catch (error) {
    logger.error("Error fetching documents", error);
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
  const requestId = generateRequestId();
  const logger = createLogger({ requestId, route: "/api/interventions/[id]/documents", method: "DELETE" });
  
  try {
    logger.info("Starting document deletion process");
    
    // Check authentication
    const session = await getServerSession();
    if (!session) {
      logger.info("Unauthorized access attempt for document deletion");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get current user
    const userResult = await getCurrentUserAction();
    if (!userResult.isSuccess || !userResult.data) {
      logger.error("Failed to get user data for document deletion", { userResult });
      return NextResponse.json(
        { error: "Failed to get user data" },
        { status: 500 }
      );
    }

    const currentUser = userResult.data;
    logger.info("User authenticated for document deletion", { userId: currentUser.user.id });

    // Check if user has access to interventions
    const hasAccess = await hasToolAccess(currentUser.user.id, "interventions");
    if (!hasAccess) {
      logger.info("User lacks permission to delete intervention documents", { userId: currentUser.user.id });
      return NextResponse.json(
        { error: "You do not have permission to delete intervention documents" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const attachmentId = searchParams.get("attachmentId");

    if (!attachmentId || isNaN(parseInt(attachmentId))) {
      logger.error("Invalid attachment ID provided for deletion", { attachmentId });
      return NextResponse.json(
        { error: "Invalid attachment ID" },
        { status: 400 }
      );
    }

    const { id } = await params;
    logger.info("Processing document deletion", { attachmentId, interventionId: id });

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
      logger.error("Attachment not found for deletion", { attachmentId, interventionId: id });
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
      logger.info("User attempted to delete attachment they don't own", { 
        userId: currentUser.user.id, 
        uploadedBy, 
        attachmentId,
        isAdmin 
      });
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
    
    logger.info("Document deleted successfully", { 
      attachmentId, 
      fileKey, 
      deletedBy: currentUser.user.id 
    });

    return NextResponse.json({
      success: true,
      message: "Document deleted successfully",
    });
  } catch (error) {
    logger.error("Error deleting document", error);
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 }
    );
  }
}