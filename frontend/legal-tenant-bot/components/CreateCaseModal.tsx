"use client"

import type React from "react"
import { useState } from "react"
import { X, AlertCircle, HelpCircle, Scale, MapPin } from "lucide-react"
import { useConversation } from "@/context/ConversationContext"

interface CreateCaseModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function CreateCaseModal({ isOpen, onClose }: CreateCaseModalProps) {
  const [title, setTitle] = useState("")
  const [issueType, setIssueType] = useState("Landlord/Tenant")
  const [priority, setPriority] = useState(3)
  const [summary, setSummary] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [location, setLocation] = useState("San Francisco")
  const [role, setRole] = useState("tenant")
  const { createLegalCase } = useConversation()

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    if (!title.trim()) {
      setError("Please provide a title for the case")
      return
    }
    
    setIsSubmitting(true)

    try {
      // Add location and role to the summary
      const enhancedSummary = `Location: ${location}\nRole: ${role}\n${summary}`;
      await createLegalCase(title, issueType, priority, enhancedSummary)
      onClose()
    } catch (error) {
      console.error("Failed to create case:", error)
      setError(error instanceof Error ? error.message : "Failed to create case. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const getPriorityColor = () => {
    switch (priority) {
      case 1:
        return "bg-green-100 text-green-800"
      case 2:
        return "bg-blue-100 text-blue-800"
      case 3:
        return "bg-amber-100 text-amber-800"
      case 4:
        return "bg-orange-100 text-orange-800"
      case 5:
        return "bg-red-100 text-red-800"
      default:
        return "bg-amber-100 text-amber-800"
    }
  }

  const getPriorityLabel = () => {
    switch (priority) {
      case 1:
        return "Very Low"
      case 2:
        return "Low"
      case 3:
        return "Medium"
      case 4:
        return "High"
      case 5:
        return "Urgent"
      default:
        return "Medium"
    }
  }

  const Tooltip = ({ children, text }: { children: React.ReactNode; text: string }) => (
    <div className="group relative flex items-center">
      {children}
      <div className="absolute left-full ml-2 hidden w-48 rounded bg-secondary-800 p-2 text-xs text-white group-hover:block">
        {text}
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-primary-100 p-2 text-primary-600">
              <Scale size={18} />
            </div>
            <h2 className="text-xl font-semibold text-secondary-800">Create Legal Case</h2>
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

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <label htmlFor="title" className="mb-1 block text-sm font-medium text-secondary-700">
                Case Title <span className="text-red-500">*</span>
              </label>
              <Tooltip text="A clear, descriptive title for the legal case">
                <HelpCircle size={14} className="text-secondary-400" />
              </Tooltip>
            </div>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md border border-secondary-200 px-3 py-2 text-sm focus:border-primary-300 focus:outline-none focus:ring-1 focus:ring-primary-300"
              placeholder="e.g., Mold in Bathroom, Rent Increase Dispute"
              required
            />
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between">
              <label htmlFor="location" className="mb-1 block text-sm font-medium text-secondary-700">
                Location
              </label>
              <Tooltip text="Cal-RentAssist specializes in San Francisco tenant law">
                <HelpCircle size={14} className="text-secondary-400" />
              </Tooltip>
            </div>
            <div className="flex items-center gap-2 rounded-md border border-secondary-200 bg-secondary-50 px-3 py-2">
              <MapPin size={16} className="text-primary-500" />
              <span className="text-sm text-secondary-700">San Francisco, California</span>
            </div>
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between">
              <label htmlFor="role" className="mb-1 block text-sm font-medium text-secondary-700">
                Your Role
              </label>
              <Tooltip text="Are you a tenant or landlord? This helps provide relevant advice.">
                <HelpCircle size={14} className="text-secondary-400" />
              </Tooltip>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                className={`flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium transition ${
                  role === "tenant"
                    ? "border-primary-300 bg-primary-50 text-primary-700"
                    : "border-secondary-200 bg-white text-secondary-700 hover:bg-secondary-50"
                }`}
                onClick={() => setRole("tenant")}
              >
                Tenant
              </button>
              <button
                type="button"
                className={`flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium transition ${
                  role === "landlord"
                    ? "border-primary-300 bg-primary-50 text-primary-700"
                    : "border-secondary-200 bg-white text-secondary-700 hover:bg-secondary-50"
                }`}
                onClick={() => setRole("landlord")}
              >
                Landlord
              </button>
            </div>
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between">
              <label htmlFor="issueType" className="mb-1 block text-sm font-medium text-secondary-700">
                Issue Type
              </label>
              <Tooltip text="The general category of legal issue for this case">
                <HelpCircle size={14} className="text-secondary-400" />
              </Tooltip>
            </div>
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
              <option value="Rent Increase">Rent Increase</option>
              <option value="Habitability">Habitability</option>
              <option value="Discrimination">Discrimination</option>
              <option value="Harassment">Harassment</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between">
              <label htmlFor="summary" className="mb-1 block text-sm font-medium text-secondary-700">
                Case Summary
              </label>
              <Tooltip text="Additional details about the case that will help lawyers understand the issue">
                <HelpCircle size={14} className="text-secondary-400" />
              </Tooltip>
            </div>
            <textarea
              id="summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="h-24 w-full rounded-md border border-secondary-200 px-3 py-2 text-sm focus:border-primary-300 focus:outline-none focus:ring-1 focus:ring-primary-300"
              placeholder="Briefly describe the key details of your case..."
            />
            <p className="mt-1 text-xs text-secondary-500">
              Optional - Cal-RentAssist will generate a legal analysis based on your conversation history
            </p>
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between">
              <label htmlFor="priority" className="mb-1 block text-sm font-medium text-secondary-700">
                Priority
              </label>
              <Tooltip text="How urgent the case is - affects how quickly a lawyer will review it">
                <HelpCircle size={14} className="text-secondary-400" />
              </Tooltip>
            </div>
            <div className="flex items-center gap-4">
              <input
                type="range"
                id="priority"
                min="1"
                max="5"
                value={priority}
                onChange={(e) => setPriority(Number.parseInt(e.target.value))}
                className="w-full"
              />
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${getPriorityColor()}`}>
                {getPriorityLabel()}
              </span>
            </div>
            <div className="mt-1 flex justify-between text-xs text-secondary-500">
              <span>Very Low</span>
              <span>Low</span>
              <span>Medium</span>
              <span>High</span>
              <span>Urgent</span>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-secondary-200 px-4 py-2 text-sm font-medium text-secondary-700 transition hover:bg-secondary-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-primary-300"
            >
              {isSubmitting ? "Creating..." : "Create Case"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
