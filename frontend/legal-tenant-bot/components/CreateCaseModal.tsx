"use client"

import type React from "react"

import { useState } from "react"
import { X } from "lucide-react"
import { useConversation } from "@/context/ConversationContext"

interface CreateCaseModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function CreateCaseModal({ isOpen, onClose }: CreateCaseModalProps) {
  const [title, setTitle] = useState("")
  const [issueType, setIssueType] = useState("Landlord/Tenant")
  const [priority, setPriority] = useState(3)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { createLegalCase } = useConversation()

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      await createLegalCase(title, issueType, priority)
      onClose()
    } catch (error) {
      console.error("Failed to create case:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-secondary-800">Create Legal Case</h2>
          <button onClick={onClose} className="rounded-full p-1 text-secondary-500 hover:bg-secondary-100">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="title" className="mb-1 block text-sm font-medium text-secondary-700">
              Case Title
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md border border-secondary-200 px-3 py-2 text-sm focus:border-primary-300 focus:outline-none focus:ring-1 focus:ring-primary-300"
              placeholder="e.g., Rent Increase Dispute"
              required
            />
          </div>

          <div className="mb-4">
            <label htmlFor="issueType" className="mb-1 block text-sm font-medium text-secondary-700">
              Issue Type
            </label>
            <select
              id="issueType"
              value={issueType}
              onChange={(e) => setIssueType(e.target.value)}
              className="w-full rounded-md border border-secondary-200 px-3 py-2 text-sm focus:border-primary-300 focus:outline-none focus:ring-1 focus:ring-primary-300"
            >
              <option value="Landlord/Tenant">Landlord/Tenant</option>
              <option value="Eviction">Eviction</option>
              <option value="Repairs">Repairs</option>
              <option value="Lease Dispute">Lease Dispute</option>
              <option value="Security Deposit">Security Deposit</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="mb-6">
            <label htmlFor="priority" className="mb-1 block text-sm font-medium text-secondary-700">
              Priority (1-5)
            </label>
            <input
              type="range"
              id="priority"
              min="1"
              max="5"
              value={priority}
              onChange={(e) => setPriority(Number.parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-secondary-500">
              <span>Low</span>
              <span>Medium</span>
              <span>High</span>
            </div>
          </div>

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
              {isSubmitting ? "Creating..." : "Create Case"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
