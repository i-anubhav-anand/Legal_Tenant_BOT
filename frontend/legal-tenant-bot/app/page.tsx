"use client"

import { useState, useEffect, useRef } from "react"
import Layout from "@/components/Layout"
import MainContent from "@/components/MainContent"
import ChatBox from "@/components/ChatBox"
import UploadDocumentModal from "@/components/UploadDocumentModal"
import CreateCaseModal from "@/components/CreateCaseModal"
import { useConversation } from "@/context/ConversationContext"

function ChatInterface() {
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [uploadType, setUploadType] = useState<"file" | "url">("file")
  const [selectedFile, setSelectedFile] = useState<File | undefined>(undefined)
  const [createCaseModalOpen, setCreateCaseModalOpen] = useState(false)
  const { activeConversation, startNewConversation, error, isLoading } = useConversation()
  const [initializing, setInitializing] = useState(true)
  const initializationAttempted = useRef(false)

  // Ensure we have an active conversation - with proper dependency tracking
  useEffect(() => {
    const initializeConversation = async () => {
      // Only attempt initialization once
      if (initializationAttempted.current) {
        return
      }

      // Mark that we've attempted initialization
      initializationAttempted.current = true

      if (!activeConversation && !isLoading) {
        console.log("No active conversation, creating a new one")
        try {
          await startNewConversation("New Conversation", "Hello, I need legal assistance with a tenant issue.")
        } catch (err) {
          console.error("Failed to create initial conversation:", err)
        } finally {
          setInitializing(false)
        }
      } else {
        setInitializing(false)
      }
    }

    initializeConversation()
  }, [activeConversation, startNewConversation, isLoading])

  const handleFileUpload = (file: File) => {
    setSelectedFile(file)
    setUploadType("file")
    setUploadModalOpen(true)
  }

  const handleUrlUpload = () => {
    setUploadType("url")
    setUploadModalOpen(true)
  }

  if (initializing) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="flex space-x-2">
            <div className="h-3 w-3 animate-bounce rounded-full bg-primary-500" style={{ animationDelay: "0ms" }}></div>
            <div
              className="h-3 w-3 animate-bounce rounded-full bg-primary-500"
              style={{ animationDelay: "150ms" }}
            ></div>
            <div
              className="h-3 w-3 animate-bounce rounded-full bg-primary-500"
              style={{ animationDelay: "300ms" }}
            ></div>
          </div>
          <p className="text-sm text-secondary-500">Initializing conversation...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <MainContent />
      <ChatBox
        onFileUpload={handleFileUpload}
        onUrlUpload={handleUrlUpload}
        onCreateCase={() => setCreateCaseModalOpen(true)}
      />

      <UploadDocumentModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        type={uploadType}
        file={selectedFile}
      />

      <CreateCaseModal isOpen={createCaseModalOpen} onClose={() => setCreateCaseModalOpen(false)} />

      {/* Hidden element for scrolling */}
      <div id="messages-end" />
    </div>
  )
}

export default function Home() {
  return (
    <Layout>
      <ChatInterface />
    </Layout>
  )
}
