// import '@ungap/with-resolvers'; // Polyfill for Promise.withResolvers - Removed
// We'll import heavy, Node-only libraries lazily to avoid issues when
// Next.js attempts to bundle these modules for runtimes (e.g. Edge) that
// don't support them. Dynamic `import()` happens at runtime in the Node
// context of our API route, so it won't break the build.

// Note: We keep the type imports (if they exist) purely for IDE support.
import type pdfParseType from 'pdf-parse';
import logger from "@/lib/logger"

/**
 * Document processing utility functions
 * 
 * These functions handle extracting text from different document types.
 * Currently supported: PDF, DOCX, TXT (PPT support planned for future)
 */

/**
 * Extract text from a PDF file
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<{ text: string, metadata: Record<string, unknown> }> {
  try {
    // Import the library without executing its top-level debug routine that
    // exists in `index.js`.  We jump directly to the core implementation
    // found in `lib/pdf-parse.js`, which exports the same function without
    // side-effects that attempt to read test files.
    const pdfParse = (await import('pdf-parse/lib/pdf-parse.js')).default as typeof pdfParseType;
    const pdfData = await pdfParse(buffer);
    return {
      text: pdfData.text,
      metadata: {
        pageCount: pdfData.numpages,
        info: pdfData.info,
      }
    };
  } catch (error) {
    logger.error('Error extracting text from PDF with pdf-parse', { error })
    throw new Error('Failed to extract text from PDF');
  }
}

/**
 * Extract text from a DOCX file
 */
export async function extractTextFromDOCX(buffer: Buffer): Promise<{ text: string, metadata: Record<string, unknown> }> {
  try {
    const mammoth = (await import('mammoth')).default;
    const result = await mammoth.extractRawText({ buffer });
    return {
      text: result.value,
      metadata: {
        messages: result.messages,
      }
    };
  } catch (error) {
    logger.error('Error extracting text from DOCX', { error })
    throw new Error('Failed to extract text from DOCX');
  }
}

/**
 * Extract text from a TXT file
 */
export async function extractTextFromTXT(buffer: Buffer): Promise<{ text: string, metadata: Record<string, unknown> }> {
  try {
    const text = buffer.toString('utf-8');
    return {
      text,
      metadata: {
        size: buffer.length,
      }
    };
  } catch (error) {
    logger.error('Error extracting text from TXT', { error })
    throw new Error('Failed to extract text from TXT');
  }
}

/**
 * Extract text from a document based on its type
 */
export async function extractTextFromDocument(
  buffer: Buffer, 
  fileType: string
): Promise<{ text: string, metadata: Record<string, unknown> }> {
  switch (fileType.toLowerCase()) {
    case 'pdf':
      return extractTextFromPDF(buffer);
    case 'docx':
      return extractTextFromDOCX(buffer);
    case 'txt':
      return extractTextFromTXT(buffer);
    case 'ppt':
    case 'pptx':
      throw new Error('PPT/PPTX parsing not implemented yet');
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}


/**
 * Get file type from file name
 */
export function getFileTypeFromFileName(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  
  switch (extension) {
    case 'pdf':
      return 'pdf';
    case 'docx':
    case 'doc':
      return 'docx';
    case 'txt':
      return 'txt';
    case 'ppt':
    case 'pptx':
      return 'ppt';
    default:
      return extension;
  }
} 