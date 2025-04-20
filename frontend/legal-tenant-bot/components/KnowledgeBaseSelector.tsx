"use client"

import type React from "react"

import { useState } from "react"
import { useConversation } from "@/context/ConversationContext"
import { Plus } from "lucide-react"

interface KnowledgeBaseSelectorProps {
  onSelect: (knowledgeBaseId: string | null) => void
  selectedId: string | null
}

export default function KnowledgeBaseSelector({ onSelect, selectedId }: KnowledgeBaseSelectorProps) {
  const { knowledgeBases, createKnowledgeBase, isLoading } = useConversation()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newKBName, setNewKBName] = useState("")
  const [newKBDescription, setNewKBDescription] = useState("")
  const [newKBFolderName, setNewKBFolderName] = useState("")

  const handleCreateKB = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newKBName || !newKBFolderName) return

    try {
      const kb = await createKnowledgeBase(newKBName, newKBDescription, newKBFolderName)
      onSelect(kb.id)
      setShowCreateForm(false)
      setNewKBName("")
      setNewKBDescription("")
      setNewKBFolderName("")
    } catch (error) {
      console.error("Failed to create knowledge base:", error)
    }
  }

  const generateFolderName = (name: string) => {
    return (
      name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "_")
        .substring(0, 30) +
      "_" +
      Date.now().toString().substring(8)
    )
  }

  return (
    <div className="mb-4">
      <label htmlFor="knowledgeBase" className="mb-1 block text-sm font-medium text-secondary-700">
        Knowledge Base (Optional)
      </label>

      <div className="flex gap-2">
        <select
          id="knowledgeBase"
          value={selectedId || ""}
          onChange={(e) => onSelect(e.target.value || null)}
          className="w-full rounded-md border border-secondary-200 px-3 py-2 text-sm focus:border-primary-300 focus:outline-none focus:ring-1 focus:ring-primary-300"
        >
          <option value="">None (Conversation Only)</option>
          {knowledgeBases.map((kb) => (
            <option key={kb.id} value={kb.id}>
              {kb.name} ({kb.document_count} documents)
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-1 rounded-md border border-secondary-200 px-3 py-2 text-sm text-secondary-700 hover:bg-secondary-50"
        >
          <Plus size={16} />
          <span>New</span>
        </button>
      </div>

      {showCreateForm && (
        <form onSubmit={handleCreateKB} className="mt-3 rounded-md border border-secondary-200 bg-secondary-50 p-3">
          <div className="mb-3">
            <label htmlFor="newKBName" className="mb-1 block text-xs font-medium text-secondary-700">
              Name
            </label>
            <input
              type="text"
              id="newKBName"
              value={newKBName}
              onChange={(e) => {
                setNewKBName(e.target.value)
                if (!newKBFolderName) {
                  setNewKBFolderName(generateFolderName(e.target.value))
                }
              }}
              className="w-full rounded-md border border-secondary-200 px-3 py-1.5 text-sm focus:border-primary-300 focus:outline-none focus:ring-1 focus:ring-primary-300"
              placeholder="e.g., Tenant Rights"
              required
            />
          </div>

          <div className="mb-3">
            <label htmlFor="newKBDescription" className="mb-1 block text-xs font-medium text-secondary-700">
              Description
            </label>
            <input
              type="text"
              id="newKBDescription"
              value={newKBDescription}
              onChange={(e) => setNewKBDescription(e.target.value)}
              className="w-full rounded-md border border-secondary-200 px-3 py-1.5 text-sm focus:border-primary-300 focus:outline-none focus:ring-1 focus:ring-primary-300"
              placeholder="e.g., Resources about tenant rights in California"
            />
          </div>

          <div className="mb-3">
            <label htmlFor="newKBFolderName" className="mb-1 block text-xs font-medium text-secondary-700">
              Folder Name (system identifier, no spaces)
            </label>
            <input
              type="text"
              id="newKBFolderName"
              value={newKBFolderName}
              onChange={(e) => setNewKBFolderName(e.target.value.replace(/[^a-z0-9_]/g, "_"))}
              className="w-full rounded-md border border-secondary-200 px-3 py-1.5 text-sm focus:border-primary-300 focus:outline-none focus:ring-1 focus:ring-primary-300"
              placeholder="e.g., tenant_rights_kb_001"
              pattern="[a-z0-9_]+"
              required
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="rounded-md border border-secondary-200 px-3 py-1.5 text-xs font-medium text-secondary-700 hover:bg-secondary-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !newKBName || !newKBFolderName}
              className="rounded-md bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700 disabled:bg-primary-300"
            >
              Create
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
