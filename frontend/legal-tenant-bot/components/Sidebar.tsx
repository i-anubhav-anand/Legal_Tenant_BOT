"use client"

import { useState, useEffect } from "react"
import {
  Search,
  Scale,
  FileText,
  History,
  MessageSquare,
  Plus,
  AlertCircle,
  Wifi,
  WifiOff,
  Terminal,
} from "lucide-react"
import { useConversation } from "@/context/ConversationContext"
import type { Conversation } from "@/types"
import * as api from "@/services/api"
import { API_CONFIG } from "@/config"
import NewConversationModal from "./NewConversationModal"

export default function Sidebar() {
  const [searchQuery, setSearchQuery] = useState("")
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [apiStatus, setApiStatus] = useState<"connected" | "disconnected" | "unknown">("unknown")
  const [isNewConversationModalOpen, setIsNewConversationModalOpen] = useState(false)
  const { activeConversation, setActiveConversation } = useConversation()

  useEffect(() => {
    loadConversations()

    // Set up periodic API status check
    const intervalId = setInterval(checkApiStatus, 30000) // Check every 30 seconds

    return () => clearInterval(intervalId)
  }, [])

  // Function to check API status
  async function checkApiStatus() {
    try {
      // Use AbortController for timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 2000) // 2 second timeout

      try {
        const response = await fetch(`${API_CONFIG.baseUrl}/health-check`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (response.ok) {
          setApiStatus("connected")
        } else {
          setApiStatus("disconnected")
        }
      } catch (error) {
        clearTimeout(timeoutId)
        console.warn("API health check failed in sidebar:", error)
        setApiStatus("disconnected")
      }
    } catch (error) {
      console.error("Error in checkApiStatus:", error)
      setApiStatus("disconnected")
    }
  }

  async function loadConversations() {
    try {
      setIsLoading(true)
      setError(null)

      const data = await api.getConversations()
      
      // Ensure conversations is always an array
      if (Array.isArray(data)) {
        setConversations(data)
      } else {
        console.error("Received non-array conversations data:", data)
        setConversations([]) // Set to empty array if not an array
      }

      // If we got mock data, show a notification
      if (data === api.mockData.mockConversations) {
        if (API_CONFIG.alwaysUseMockData) {
          setError("Connected to demo mode. Using sample data.")
          setApiStatus("disconnected")
        } else {
          setError("Could not connect to server. Using demo data.")
          setApiStatus("disconnected")
        }
      } else {
        setApiStatus("connected")
      }
    } catch (error) {
      console.error("Failed to load conversations:", error)
      setError("Could not connect to server. Using demo data.")
      setApiStatus("disconnected")

      // Set conversations to mock data directly as a fallback
      setConversations(api.mockData.mockConversations || [])
    } finally {
      setIsLoading(false)
    }
  }

  function handleNewConversation() {
    // Open the modal instead of directly creating a conversation
    setIsNewConversationModalOpen(true)
  }

  const navItems = [
    { name: "Ask a Lawyer", icon: MessageSquare, active: true, href: "/" },
    { name: "Know Your Rights", icon: Scale, href: "/" },
    { name: "Upload Lease", icon: FileText, href: "/" },
    { name: "History", icon: History, href: "/" },
    { name: "API Test", icon: Terminal, href: "/api-test" },
  ]

  // Ensure conversations is always an array before filtering
  const filteredConversations = Array.isArray(conversations) 
    ? conversations.filter((conv) => conv.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  return (
    <>
      <aside className="flex h-screen w-64 flex-col border-r border-secondary-200 bg-white">
        <div className="flex items-center gap-2 p-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary-100 text-primary-700">
            <Scale size={18} />
          </div>
          <h2 className="font-semibold text-secondary-800">LegalTenantBot</h2>

          {/* API Status Indicator */}
          <div className="ml-auto" title={apiStatus === "connected" ? "API Connected" : "API Disconnected"}>
            {apiStatus === "connected" ? (
              <Wifi size={16} className="text-green-500" />
            ) : (
              <WifiOff size={16} className="text-red-500" />
            )}
          </div>
        </div>

        <div className="px-3 py-2">
          <div className="relative">
            <Search size={16} className="absolute left-2.5 top-2.5 text-secondary-400" />
            <input
              type="text"
              placeholder="Search chat"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-md border border-secondary-200 bg-secondary-50 py-2 pl-9 pr-3 text-sm placeholder:text-secondary-400 focus:border-primary-300 focus:outline-none focus:ring-1 focus:ring-primary-300"
            />
          </div>
        </div>

        <nav className="mt-2 px-3">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.name}>
                <a
                  href={item.href}
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
                    item.active
                      ? "bg-primary-50 text-primary-700 font-medium"
                      : "text-secondary-700 hover:bg-secondary-50"
                  }`}
                >
                  <item.icon size={18} />
                  <span>{item.name}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-6 px-3">
          <div className="flex items-center justify-between px-3">
            <h3 className="text-xs font-medium uppercase text-secondary-500">Recent Conversations</h3>
            <button
              onClick={handleNewConversation}
              className="rounded-full p-1 text-secondary-500 hover:bg-secondary-100 hover:text-secondary-700"
              aria-label="New conversation"
            >
              <Plus size={16} />
            </button>
          </div>

          {error && (
            <div className="mt-2 flex items-center gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}

          {isLoading ? (
            <div className="mt-2 space-y-2 px-3 py-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-8 w-full animate-pulse rounded-md bg-secondary-100"></div>
              ))}
            </div>
          ) : (
            <ul className="mt-2 space-y-1">
              {filteredConversations.map((conversation) => (
                <li key={conversation.id}>
                  <button
                    onClick={() => setActiveConversation(conversation)}
                    className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${
                      activeConversation?.id === conversation.id
                        ? "bg-primary-50 text-primary-700 font-medium"
                        : "text-secondary-700 hover:bg-secondary-50"
                    }`}
                  >
                    <MessageSquare size={16} className="text-secondary-400" />
                    <span className="truncate">{conversation.title}</span>
                  </button>
                </li>
              ))}
              {filteredConversations.length === 0 && !error && (
                <li className="px-3 py-2 text-sm text-secondary-500">No conversations found</li>
              )}
            </ul>
          )}
        </div>

        <div className="mt-auto p-3">
          <div className="rounded-lg bg-primary-50 p-4">
            <h3 className="font-medium text-primary-700">Upgrade to Pro</h3>
            <p className="mt-1 text-xs text-secondary-600">Get access to document upload, PDF parsing, and more.</p>
            <button className="mt-3 w-full rounded-md bg-primary-600 py-1.5 text-sm font-medium text-white hover:bg-primary-700">
              Upgrade
            </button>
          </div>
        </div>
      </aside>

      {/* New Conversation Modal */}
      <NewConversationModal 
        isOpen={isNewConversationModalOpen} 
        onClose={() => {
          setIsNewConversationModalOpen(false)
          // Refresh the conversation list after creating a new conversation
          loadConversations()
        }} 
      />
    </>
  )
}
