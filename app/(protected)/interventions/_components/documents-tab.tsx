'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  FileText,
  Upload,
  Download,
  Trash2,
  Loader2,
} from 'lucide-react';

interface DocumentsTabProps {
  interventionId: number;
  documents: Array<{
    id: number;
    fileName: string;
    fileKey: string;
    fileSize: number;
    contentType: string;
    description?: string;
    uploadedAt: Date;
    uploadedBy: {
      firstName?: string;
      lastName?: string;
    };
  }>;
}

export function DocumentsTab({ interventionId, documents: initialDocs }: DocumentsTabProps) {
  const [documents, setDocuments] = useState(initialDocs);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  const fetchDocuments = useCallback(async () => {
    try {
      const response = await fetch(`/api/interventions/${interventionId}/documents`);
      if (response.ok) {
        const result = await response.json();
        setDocuments(result.data);
      }
    } catch {
      // Error logged: Failed to fetch documents
    }
  }, [interventionId]);

  const handleUpload = useCallback(async (formData: FormData) => {
    setIsUploading(true);
    try {
      const response = await fetch(`/api/interventions/${interventionId}/documents`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      await response.json();
      toast.success('Document uploaded successfully');
      setUploadDialogOpen(false);
      
      // Refresh the documents list
      await fetchDocuments();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload document');
    } finally {
      setIsUploading(false);
    }
  }, [interventionId, fetchDocuments]);

  const handleDelete = useCallback(async (attachmentId: number) => {
    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }

    setIsDeleting(attachmentId);
    try {
      const response = await fetch(
        `/api/interventions/${interventionId}/documents?attachmentId=${attachmentId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Delete failed');
      }

      toast.success('Document deleted successfully');
      await fetchDocuments();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete document');
    } finally {
      setIsDeleting(null);
    }
  }, [interventionId, fetchDocuments]);

  const handleDownload = useCallback(async (fileKey: string, fileName: string) => {
    try {
      const response = await fetch(`/api/documents/download?key=${encodeURIComponent(fileKey)}`);
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      toast.error('Failed to download document');
    }
  }, []);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Documents & Attachments</h3>
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Upload className="mr-2 h-4 w-4" />
              Upload Document
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleUpload(formData);
              }}
            >
              <DialogHeader>
                <DialogTitle>Upload Document</DialogTitle>
                <DialogDescription>
                  Upload a document related to this intervention (max 10MB)
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="file">File</Label>
                  <Input
                    id="file"
                    name="file"
                    type="file"
                    required
                    accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Brief description of the document..."
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setUploadDialogOpen(false)}
                  disabled={isUploading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isUploading}>
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    'Upload'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {documents.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No documents uploaded yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead>Uploaded By</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium">{doc.fileName}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {doc.description || '-'}
                  </TableCell>
                  <TableCell>{formatFileSize(doc.fileSize)}</TableCell>
                  <TableCell>
                    {format(new Date(doc.uploadedAt), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell>
                    {doc.uploadedBy.firstName || doc.uploadedBy.lastName
                      ? `${doc.uploadedBy.firstName || ''} ${
                          doc.uploadedBy.lastName || ''
                        }`.trim()
                      : 'Unknown'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDownload(doc.fileKey, doc.fileName)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(doc.id)}
                        disabled={isDeleting === doc.id}
                      >
                        {isDeleting === doc.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}