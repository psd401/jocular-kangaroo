"use client"

import { useRef, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, FileUp, CheckCircle } from "lucide-react"
import { toast } from "sonner"

interface PdfUploadButtonProps {
  onMarkdown: (markdown: string) => void
  label?: string
  className?: string
  disabled?: boolean
  onError?: (err: { status?: number; message?: string }) => void
}

export default function PdfUploadButton({
  onMarkdown,
  label = "Add PDF Knowledge",
  className = "",
  disabled = false,
  onError
}: PdfUploadButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)
  const [processingStatus, setProcessingStatus] = useState<string>("")
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    }
  }, [])

  const handleButtonClick = () => {
    if (fileInputRef.current) fileInputRef.current.value = ""
    fileInputRef.current?.click()
  }

  const pollJobStatus = async (jobId: string, fileName: string) => {
    try {
      const res = await fetch(`/api/assistant-architect/pdf-to-markdown/status?jobId=${jobId}`)
      if (res.status === 404) {
        setProcessingStatus("Processing PDF...")
        return
      }
      if (!res.ok) {
        throw new Error(`Failed to check status: ${res.status}`)
      }
      const data = await res.json()
      
      if (data.status === 'completed') {
        // Stop polling
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current)
          pollingIntervalRef.current = null
        }
        
        // Process the result
        if (data.markdown) {
          const docTag = `<pdf-document title="${data.fileName || fileName}">\n${data.markdown}\n</pdf-document>`
          onMarkdown(docTag)
          setUploadedFileName(data.fileName || fileName)
          toast.success("PDF content added to system context.")
        } else {
          throw new Error('No markdown content in response')
        }
        setIsLoading(false)
        setProcessingStatus("")
        
      } else if (data.status === 'failed') {
        // Stop polling
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current)
          pollingIntervalRef.current = null
        }
        
        throw new Error(data.error || 'PDF processing failed')
      } else if (
        data.status === 'pending' ||
        data.status === 'processing' ||
        data.status === 'running'
      ) {
        setProcessingStatus("Processing PDF...")
        // Continue polling
      } else {
        // Unknown status, treat as still processing
        setProcessingStatus("Processing PDF...")
      }
    } catch (error) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
      toast.error(error instanceof Error ? error.message : "Failed to process PDF.")
      setUploadedFileName(null)
      setIsLoading(false)
      setProcessingStatus("")
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== "application/pdf") {
      toast.error("Only PDF files are supported.")
      onError?.({ message: "Only PDF files are supported." })
      return
    }
    if (file.size > 25 * 1024 * 1024) {
      toast.error("File size exceeds 25MB limit.")
      onError?.({ message: "File size exceeds 25MB limit." })
      return
    }
    setIsLoading(true)
    setUploadedFileName(null) // Reset uploaded state when starting new upload
    setProcessingStatus("Uploading...")
    
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/assistant-architect/pdf-to-markdown", {
        method: "POST",
        body: formData
      })
      
      let data;
      try {
        const contentType = res.headers.get('content-type')
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Invalid response format: expected JSON')
        }
        data = await res.json()
      } catch (parseError) {
        console.error('Error parsing response:', parseError)
        if (!res.ok) {
          onError?.({ status: res.status, message: `Server error: ${res.status} ${res.statusText}` })
          throw new Error(`Server error: ${res.status} ${res.statusText}`)
        }
        onError?.({ message: 'Invalid response format from server' })
        throw new Error('Invalid response format from server')
      }
      
      if (!res.ok) {
        onError?.({ status: res.status, message: data.error || "Failed to process PDF." })
        throw new Error(data.error || "Failed to process PDF.")
      }
      
      // Handle job-based processing
      if (data.jobId && data.status === 'processing') {
        setProcessingStatus("Processing PDF...")
        
        // Start polling for job status
        pollingIntervalRef.current = setInterval(() => {
          pollJobStatus(data.jobId, file.name)
        }, 2000) // Poll every 2 seconds
        
      } else if (data.status === 'completed' && data.markdown) {
        // Immediate result (shouldn't happen with new implementation)
        const docTag = `<pdf-document title="${file.name}">\n${data.markdown}\n</pdf-document>`
        onMarkdown(docTag)
        setUploadedFileName(file.name)
        toast.success("PDF content added to system context.")
        setIsLoading(false)
        setProcessingStatus("")
      } else {
        onError?.({ message: 'Invalid response: unexpected status' })
        throw new Error('Invalid response: unexpected status')
      }
      
    } catch (err) {
      console.error('[PdfUploadButton] Upload error:', err);
      toast.error(err instanceof Error ? err.message : "Failed to process PDF.")
      setUploadedFileName(null)
      setIsLoading(false)
      setProcessingStatus("")
      onError?.({ message: err instanceof Error ? err.message : String(err) })
    }
  }

  // Determine button text based on state
  const getButtonText = () => {
    if (processingStatus) return processingStatus
    if (isLoading) return "Processing..."
    if (uploadedFileName) return `✓ ${uploadedFileName.length > 20 ? uploadedFileName.substring(0, 20) + '...' : uploadedFileName}`
    return label || "Upload PDF"
  }

  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleFileChange}
        aria-label="Upload PDF"
      />
      <Button
        type="button"
        variant={uploadedFileName ? "secondary" : "outline"}
        size="sm"
        onClick={handleButtonClick}
        disabled={isLoading || disabled}
        className={`flex items-center gap-2 ${uploadedFileName ? 'border-green-500/50 text-green-700 dark:text-green-400' : ''}`}
        aria-label={label}
      >
        {isLoading ? (
          <Loader2 className="animate-spin h-4 w-4" />
        ) : uploadedFileName ? (
          <CheckCircle className="h-4 w-4 text-green-500" />
        ) : (
          <FileUp className="h-4 w-4" />
        )}
        {getButtonText()}
      </Button>
    </div>
  )
} 