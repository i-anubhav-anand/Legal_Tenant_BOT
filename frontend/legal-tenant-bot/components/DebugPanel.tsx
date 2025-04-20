"use client"

import { useState, useEffect } from "react"
import { useConversation } from "@/context/ConversationContext"
import { API_CONFIG } from "@/config"

export default function DebugPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const [apiUrl, setApiUrl] = useState(API_CONFIG.baseUrl)
  const [useMockData, setUseMockData] = useState(API_CONFIG.useMockDataFallback)
  const { activeConversation, error } = useConversation()
  const [logs, setLogs] = useState<string[]>([])

  // Capture console logs
  useEffect(() => {
    if (!isOpen) return

    const originalConsoleLog = console.log
    const originalConsoleError = console.error

    console.log = (...args) => {
      originalConsoleLog(...args)
      const message = args.map((arg) => (typeof arg === "object" ? JSON.stringify(arg) : String(arg))).join(" ")

      setLogs((prev) => [...prev.slice(-19), `LOG: ${message}`])
    }

    console.error = (...args) => {
      originalConsoleError(...args)
      const message = args.map((arg) => (typeof arg === "object" ? JSON.stringify(arg) : String(arg))).join(" ")

      setLogs((prev) => [...prev.slice(-19), `ERROR: ${message}`])
    }

    return () => {
      console.log = originalConsoleLog
      console.error = originalConsoleError
    }
  }, [isOpen])

  const toggleMockData = () => {
    // This is just for UI - can't actually change the config at runtime
    setUseMockData(!useMockData)
  }

  if (!API_CONFIG.debug) return null

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 z-50 rounded-full bg-secondary-800 p-2 text-white shadow-lg"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path>
          <path d="m9 12 2 2 4-4"></path>
        </svg>
      </button>

      {isOpen && (
        <div className="fixed bottom-16 right-4 z-50 w-96 rounded-lg border border-secondary-200 bg-white p-4 shadow-xl">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Debug Panel</h3>
            <button onClick={() => setIsOpen(false)} className="text-secondary-500 hover:text-secondary-700">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6 6 18"></path>
                <path d="m6 6 12 12"></path>
              </svg>
            </button>
          </div>

          <div className="mb-3 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="font-medium">API URL:</span>
              <span className="text-secondary-600">{apiUrl}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Mock Data:</span>
              <button
                onClick={toggleMockData}
                className={`rounded px-2 py-0.5 text-white ${useMockData ? "bg-green-500" : "bg-red-500"}`}
              >
                {useMockData ? "Enabled" : "Disabled"}
              </button>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Active Conversation:</span>
              <span className="text-secondary-600">{activeConversation?.id || "None"}</span>
            </div>
            {error && (
              <div className="rounded-md bg-red-50 p-2 text-red-700">
                <span className="font-medium">Error:</span> {error}
              </div>
            )}
          </div>

          <div className="h-40 overflow-auto rounded border border-secondary-200 bg-secondary-50 p-2">
            <pre className="text-xs text-secondary-700">{logs.length > 0 ? logs.join("\n") : "No logs yet..."}</pre>
          </div>

          <div className="mt-2 text-right">
            <button onClick={() => setLogs([])} className="text-xs text-secondary-500 hover:text-secondary-700">
              Clear Logs
            </button>
          </div>
        </div>
      )}
    </>
  )
}
