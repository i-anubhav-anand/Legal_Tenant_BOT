"use client"

import { useState, useEffect } from "react"
import { Wifi, WifiOff, AlertCircle, RefreshCw } from "lucide-react"
import { useConversation } from "@/context/ConversationContext"
import { API_CONFIG } from "@/config"

export default function NetworkStatusBar() {
  const [apiStatus, setApiStatus] = useState<"connected" | "disconnected" | "unknown">("unknown")
  const [isChecking, setIsChecking] = useState(false)
  const [lastCheckError, setLastCheckError] = useState<string | null>(null)
  const { apiError, resetApiError, retryLastApiCall } = useConversation()

  useEffect(() => {
    // Initial check with a slight delay to allow the app to stabilize
    const timer = setTimeout(() => {
      checkApiStatus()
    }, 1000)

    // Set up periodic API status check
    const intervalId = setInterval(checkApiStatus, 30000) // Check every 30 seconds

    return () => {
      clearTimeout(timer)
      clearInterval(intervalId)
    }
  }, [])

  // Function to check API status
  async function checkApiStatus() {
    // If we're in forced mock data mode, don't actually check
    if (API_CONFIG.alwaysUseMockData) {
      setApiStatus("disconnected")
      return
    }

    try {
      setIsChecking(true)
      setLastCheckError(null)

      // Use AbortController for timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000) // 3 second timeout

      try {
        // Try to fetch from a simple endpoint
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
          setLastCheckError(`API returned status: ${response.status}`)
        }
      } catch (error) {
        clearTimeout(timeoutId)

        // Handle specific error types
        if (error instanceof DOMException && error.name === "AbortError") {
          setLastCheckError("Request timed out")
        } else {
          setLastCheckError(error instanceof Error ? error.message : "Unknown network error")
        }

        console.warn("API health check failed:", error)
        setApiStatus("disconnected")
      }
    } catch (error) {
      // This catch block handles any errors in the outer try block
      console.error("Error in checkApiStatus:", error)
      setApiStatus("disconnected")
      setLastCheckError("Internal error checking API status")
    } finally {
      setIsChecking(false)
    }
  }

  // If there's no error and we're not in forced mock mode, don't show the bar
  if (!apiError && apiStatus === "connected" && !API_CONFIG.alwaysUseMockData) {
    return null
  }

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 p-2 text-sm ${
        apiStatus === "disconnected" || apiError ? "bg-amber-50 text-amber-800" : "bg-green-50 text-green-800"
      }`}
    >
      <div className="container mx-auto flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {apiStatus === "connected" ? (
            <Wifi size={16} className="text-green-500" />
          ) : (
            <WifiOff size={16} className="text-amber-500" />
          )}

          <span>
            {apiStatus === "connected"
              ? "Connected to API"
              : API_CONFIG.alwaysUseMockData
                ? "Using demo mode (mock data)"
                : "API connection failed - using demo mode"}
          </span>

          {lastCheckError && <span className="text-xs text-amber-600">({lastCheckError})</span>}
        </div>

        {apiError && (
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-red-500" />
            <span className="text-red-700">{apiError}</span>
          </div>
        )}

        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={async () => {
              resetApiError()
              await checkApiStatus()
              if (apiStatus === "connected") {
                await retryLastApiCall()
              }
            }}
            disabled={isChecking}
            className="flex items-center gap-1 rounded-md bg-white px-2 py-1 text-xs font-medium text-amber-800 shadow-sm hover:bg-amber-50"
          >
            <RefreshCw size={14} className={isChecking ? "animate-spin" : ""} />
            {isChecking ? "Checking..." : "Retry Connection"}
          </button>
        </div>
      </div>
    </div>
  )
}
