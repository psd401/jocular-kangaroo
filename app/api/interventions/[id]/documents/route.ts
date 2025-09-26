import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/server-session";
import { getCurrentUserAction } from "@/actions/db/get-current-user-action";
import { uploadDocument, deleteDocument } from "@/lib/aws/s3-client";
import { db } from "@/lib/db/drizzle-client";
import { interventionAttachments, documents, users } from "@/src/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { hasToolAccess } from "@/utils/roles";
import { generateRequestId, createLogger } from "@/lib/logger";

// Upload a document for an intervention
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  const logger = createLogger({ requestId, route: "/api/interventions/[id]/documents", method: "POST" });

  let key = "";
  let url = "";

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

    // Check if user has access to interventions
    const hasAccess = await hasToolAccess("interventions");
    if (!hasAccess) {
      logger.info("User lacks permission to upload intervention documents");
      return NextResponse.json(
        { error: "You do not have permission to upload intervention documents" },
        { status: 403 }
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
    const uploadResult = await uploadDocument({
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
    key = uploadResult.key;
    url = uploadResult.url;

    const result = await db.transaction(async (tx) => {
      const [document] = await tx
        .insert(documents)
        .values({
          userId: currentUser.user.id,
          fileName: file.name,
          fileType: file.type,
          fileSizeBytes: file.size,
          s3Key: key,
          metadata: {
            interventionId: interventionId.toString(),
            uploadedBy: currentUser.user.id.toString(),
            description: description || "",
          }
        })
        .returning({ id: documents.id });

      const [attachment] = await tx
        .insert(interventionAttachments)
        .values({
          interventionId,
          documentId: document.id,
          description: description || null,
          createdBy: currentUser.user.id
        })
        .returning({ id: interventionAttachments.id });

      return { document, attachment };
    });

    const attachmentId = result.attachment?.id;
    
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

    if (key) {
      try {
        await deleteDocument(key);
        logger.info("S3 file cleanup successful after database error", { key });
      } catch (cleanupError) {
        logger.error("Failed to cleanup S3 file after database error", { key, error: cleanupError });
      }
    }

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

    // Check if user has access to interventions
    const hasAccess = await hasToolAccess("interventions");
    if (!hasAccess) {
      logger.info("User lacks permission to view intervention documents");
      return NextResponse.json(
        { error: "You do not have permission to view intervention documents" },
        { status: 403 }
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

    const result = await db
      .select({
        id: interventionAttachments.id,
        description: interventionAttachments.description,
        createdAt: interventionAttachments.createdAt,
        fileName: documents.fileName,
        fileType: documents.fileType,
        fileSizeBytes: documents.fileSizeBytes,
        s3Key: documents.s3Key,
        firstName: users.firstName,
        lastName: users.lastName
      })
      .from(interventionAttachments)
      .leftJoin(documents, eq(interventionAttachments.documentId, documents.id))
      .leftJoin(users, eq(interventionAttachments.createdBy, users.id))
      .where(eq(interventionAttachments.interventionId, interventionId))
      .orderBy(desc(interventionAttachments.createdAt));

    const attachments = result.map(record => ({
      id: record.id,
      fileName: record.fileName,
      fileKey: record.s3Key,
      fileSize: record.fileSizeBytes,
      contentType: record.fileType,
      description: record.description,
      uploadedAt: record.createdAt,
      uploadedBy: {
        firstName: record.firstName,
        lastName: record.lastName,
      },
    }));
    
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

    // Check if user has access to interventions
    const hasAccess = await hasToolAccess("interventions");
    if (!hasAccess) {
      logger.info("User lacks permission to delete intervention documents");
      return NextResponse.json(
        { error: "You do not have permission to delete intervention documents" },
        { status: 403 }
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

    const [selectResult] = await db
      .select({
        createdBy: interventionAttachments.createdBy,
        documentId: interventionAttachments.documentId,
        s3Key: documents.s3Key
      })
      .from(interventionAttachments)
      .leftJoin(documents, eq(interventionAttachments.documentId, documents.id))
      .where(
        and(
          eq(interventionAttachments.id, parseInt(attachmentId)),
          eq(interventionAttachments.interventionId, parseInt(id))
        )
      )
      .limit(1);

    if (!selectResult) {
      logger.error("Attachment not found for deletion", { attachmentId, interventionId: id });
      return NextResponse.json(
        { error: "Attachment not found" },
        { status: 404 }
      );
    }

    const uploadedBy = selectResult.createdBy;
    const fileKey = selectResult.s3Key;

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

    if (fileKey) {
      await deleteDocument(fileKey);
    }

    await db
      .delete(interventionAttachments)
      .where(eq(interventionAttachments.id, parseInt(attachmentId)));

    if (selectResult.documentId) {
      await db
        .delete(documents)
        .where(eq(documents.id, selectResult.documentId));
    }
    
    logger.info("Document deleted successfully", {
      attachmentId,
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