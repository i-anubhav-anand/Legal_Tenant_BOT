"use client"

import { useState } from "react"
import { ChevronDown, User } from "lucide-react"
import { useConversation } from "@/context/ConversationContext"

export default function Header() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const { activeConversation } = useConversation()

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-secondary-200 bg-white px-4 shadow-subtle">
      <div className="flex items-center">
        <h1 className="text-xl font-semibold text-primary-700">LegalTenantBot</h1>
      </div>

      <div className="relative">
        <button
          className="flex items-center gap-2 rounded-md border border-secondary-200 px-3 py-1.5 text-sm text-secondary-700 hover:bg-secondary-50"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        >
          <span>v1.0</span>
          <ChevronDown size={16} />
        </button>

        {isDropdownOpen && (
          <div className="absolute right-0 mt-1 w-32 rounded-md border border-secondary-200 bg-white py-1 shadow-md">
            <button className="block w-full px-4 py-1.5 text-left text-sm hover:bg-secondary-50">v1.0</button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="text-right">
          <p className="text-sm font-medium text-secondary-800">Marcus Aurelius</p>
          <p className="text-xs text-secondary-500">marcus@example.com</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-primary-700">
          <User size={18} />
        </div>
      </div>
    </header>
  )
}
