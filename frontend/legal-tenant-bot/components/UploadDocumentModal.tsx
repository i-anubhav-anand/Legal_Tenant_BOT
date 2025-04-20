"use client"

import type React from "react"

import { useState } from "react"
import { X } from "lucide-react"
import { useConversation } from "@/context/ConversationContext"
import KnowledgeBaseSelector from "./KnowledgeBaseSelector"

interface UploadDocumentModalProps {
  isOpen: boolean
  onClose: () => void
  type: "file" | "url"
  file?: File
}

export default function UploadDocumentModal({ isOpen, onClose, type, file }: UploadDocumentModalProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [url, setUrl] = useState("")
  const [selectedKnowledgeBaseId, setSelectedKnowledgeBaseId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { uploadFile, uploadUrl } = useConversation()

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (type === "file" && file) {
        await uploadFile(file, title, description, selectedKnowledgeBaseId || undefined)
      } else if (type === "url") {
        await uploadUrl(url, title, description, selectedKnowledgeBaseId || undefined)
      }
      onClose()
    } catch (error) {
      console.error("Upload failed:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-secondary-800">
            {type === "file" ? "Upload Document" : "Add URL"}
          </h2>
          <button onClick={onClose} className="rounded-full p-1 text-secondary-500 hover:bg-secondary-100">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
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

          <KnowledgeBaseSelector onSelect={setSelectedKnowledgeBaseId} selectedId={selectedKnowledgeBaseId} />

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
