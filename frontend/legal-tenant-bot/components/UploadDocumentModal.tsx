"use client"

import { useState, useRef } from "react"
import { X, Upload, Link, FileText, AlertCircle } from "lucide-react"
import { useConversation } from "@/context/ConversationContext"
import KnowledgeBaseSelector from "./KnowledgeBaseSelector"

interface InfoIconProps {
  size: number
  className?: string
}

// Simple InfoIcon component
const InfoIcon = ({ size, className }: InfoIconProps) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="16" x2="12" y2="12"></line>
    <line x1="12" y1="8" x2="12.01" y2="8"></line>
  </svg>
);

// Format file size utility function
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

interface UploadDocumentModalProps {
  isOpen: boolean
  onClose: () => void
  type: "file" | "url"
  file?: File
}

export default function UploadDocumentModal({ isOpen, onClose, type, file: initialFile }: UploadDocumentModalProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [url, setUrl] = useState("")
  const [selectedKnowledgeBase, setSelectedKnowledgeBase] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [file, setFile] = useState<File | undefined>(initialFile)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { uploadFile, uploadUrl } = useConversation()

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setIsSubmitting(true)
      
      if (type === "file" && file) {
        await uploadFile(file, title, description, selectedKnowledgeBase || undefined)
      } else if (type === "url" && url) {
        await uploadUrl(url, title, description, selectedKnowledgeBase || undefined)
      }
      
      onClose()
    } catch (error) {
      console.error("Upload failed:", error)
      setError("An error occurred while uploading. Please try again later.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-primary-100 p-2 text-primary-600">
              {type === "file" ? <Upload size={18} /> : <Link size={18} />}
            </div>
            <h2 className="text-xl font-semibold text-secondary-800">
              {type === "file" ? "Upload Document" : "Add URL Reference"}
            </h2>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 text-secondary-500 hover:bg-secondary-100">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-800">
            <AlertCircle size={16} />
            <p>{error}</p>
          </div>
        )}

        <div className="mb-4 rounded-md bg-blue-50 p-3 text-sm text-blue-800">
          <p className="flex items-start gap-2">
            <InfoIcon size={16} className="mt-0.5 flex-shrink-0" />
            <span>
              {type === "file" 
                ? "Upload relevant legal documents such as your lease agreement, notices from your landlord, photographs of housing conditions, or correspondence. This helps provide more accurate assistance with your specific situation."
                : "Add links to relevant laws, regulations, or official resources that you'd like to reference in your case."}
            </span>
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {type === "file" && (
            <div className="mb-4">
              <div className="flex items-center justify-between">
                <label htmlFor="file" className="mb-1 block text-sm font-medium text-secondary-700">
                  File <span className="text-red-500">*</span>
                </label>
              </div>
              {!file ? (
                <div
                  className="flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-secondary-300 bg-secondary-50 p-6 hover:bg-secondary-100"
                  onClick={handleFileSelect}
                >
                  <Upload className="mb-2 text-secondary-400" />
                  <p className="mb-1 text-sm font-medium text-secondary-700">Click to select a file</p>
                  <p className="text-xs text-secondary-500">PDF, DOC, DOCX, TXT, JPG, PNG (Max 10MB)</p>
                </div>
              ) : (
                <div className="rounded-md border border-secondary-200 bg-secondary-50 p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="text-secondary-400" />
                      <span className="text-sm font-medium text-secondary-700">
                        {file.name} ({formatFileSize(file.size)})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFile(undefined)}
                      className="rounded-full p-1 text-secondary-400 hover:bg-secondary-200 hover:text-secondary-700"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {type === "url" && (
            <div className="mb-4">
              <label htmlFor="url" className="mb-1 block text-sm font-medium text-secondary-700">
                URL
              </label>
              <input
                type="url"
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full rounded-md border border-secondary-200 px-3 py-2 text-sm focus:border-primary-300 focus:outline-none focus:ring-1 focus:ring-primary-300"
                placeholder="https://example.com"
                required
              />
            </div>
          )}

          <div className="mb-4">
            <label htmlFor="title" className="mb-1 block text-sm font-medium text-secondary-700">
              Title
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md border border-secondary-200 px-3 py-2 text-sm focus:border-primary-300 focus:outline-none focus:ring-1 focus:ring-primary-300"
              placeholder="Document title"
              required
            />
          </div>

          <div className="mb-4">
            <label htmlFor="description" className="mb-1 block text-sm font-medium text-secondary-700">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-md border border-secondary-200 px-3 py-2 text-sm focus:border-primary-300 focus:outline-none focus:ring-1 focus:ring-primary-300"
              placeholder="Brief description of the document"
              rows={3}
            />
          </div>

          <KnowledgeBaseSelector onSelect={setSelectedKnowledgeBase} selectedId={selectedKnowledgeBase} />

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-secondary-200 px-4 py-2 text-sm font-medium text-secondary-700 hover:bg-secondary-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:bg-primary-300"
            >
              {isSubmitting ? "Uploading..." : "Upload"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
