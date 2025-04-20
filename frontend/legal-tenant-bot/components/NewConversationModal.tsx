"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { useConversation } from "@/context/ConversationContext"

interface NewConversationModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function NewConversationModal({ isOpen, onClose }: NewConversationModalProps) {
  const [title, setTitle] = useState("New Conversation")
  const [initialMessage, setInitialMessage] = useState("Hello, I need legal assistance with a tenant issue.")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { startNewConversation, error } = useConversation()

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!title.trim() || !initialMessage.trim()) {
      return
    }
    
    try {
      setIsSubmitting(true)
      await startNewConversation(title, initialMessage)
      onClose()
    } catch (error) {
      console.error("Error creating conversation:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium text-secondary-900">Start New Conversation</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-secondary-500 hover:bg-secondary-100 hover:text-secondary-700"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="title" className="mb-1 block text-sm font-medium text-secondary-700">
              Title
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="E.g., Lease Question, Rent Increase, Repairs Issue"
              className="w-full rounded-md border border-secondary-300 p-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              required
            />
          </div>

          <div className="mb-6">
            <label htmlFor="initialMessage" className="mb-1 block text-sm font-medium text-secondary-700">
              What's your legal question or issue?
            </label>
            <textarea
              id="initialMessage"
              value={initialMessage}
              onChange={(e) => setInitialMessage(e.target.value)}
              placeholder="Describe your legal issue or question in detail..."
              className="h-32 w-full rounded-md border border-secondary-300 p-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              required
            />
            <p className="mt-1 text-xs text-secondary-500">
              This will help us understand your issue and provide better assistance.
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-secondary-300 bg-white px-4 py-2 text-sm font-medium text-secondary-700 hover:bg-secondary-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim() || !initialMessage.trim()}
              className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:bg-primary-300"
            >
              {isSubmitting ? "Creating..." : "Start Conversation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 