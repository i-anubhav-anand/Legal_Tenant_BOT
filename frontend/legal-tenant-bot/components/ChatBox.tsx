"use client"

import type React from "react"

import { useState, useRef, useCallback, useEffect } from "react"
import { Send, Upload, Link2, Scale } from "lucide-react"
import { useConversation } from "@/context/ConversationContext"

interface ChatBoxProps {
  onFileUpload: (file: File) => void
  onUrlUpload: () => void
  onCreateCase: () => void
}

export default function ChatBox({ onFileUpload, onUrlUpload, onCreateCase }: ChatBoxProps) {
  const { sendMessage, isLoading, activeConversation } = useConversation()
  const [message, setMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<{show: boolean, success: boolean, message: string}>({
    show: false,
    success: false,
    message: ""
  })
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim() === "") return

    setIsSubmitting(true)
    try {
      await sendMessage(message)
      setMessage("")
    } catch (error) {
      console.error("Error sending message:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  // Handle file selection
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      try {
        setUploadStatus({
          show: true,
          success: true,
          message: `Uploading "${file.name}"...`
        })
        
        onFileUpload(file)
        
        // Reset the input so the same file can be uploaded again
        e.target.value = ""
        
        setTimeout(() => {
          setUploadStatus({
            show: true,
            success: true,
            message: `File "${file.name}" uploaded successfully! It's being processed now.`
          })
          
          // Hide the message after 5 seconds
          setTimeout(() => {
            setUploadStatus({show: false, success: false, message: ""})
          }, 5000)
        }, 1000)
      } catch (error) {
        console.error("Error uploading file:", error)
        setUploadStatus({
          show: true,
          success: false,
          message: `Error uploading file: ${error instanceof Error ? error.message : 'Unknown error'}`
        })
        
        // Hide error message after 5 seconds
        setTimeout(() => {
          setUploadStatus({show: false, success: false, message: ""})
        }, 5000)
      }
    }
  }, [onFileUpload])

  // Auto-adjust height of textarea
  useEffect(() => {
    const adjustHeight = () => {
      const textarea = textareaRef.current
      if (textarea) {
        textarea.style.height = "auto"
        textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
      }
    }

    adjustHeight()
    window.addEventListener("resize", adjustHeight)
    return () => window.removeEventListener("resize", adjustHeight)
  }, [message])

  return (
    <div className="border-t border-secondary-200 bg-white px-4 py-3">
      <div className="mx-auto max-w-4xl">
        {/* Upload Status Message */}
        {uploadStatus.show && (
          <div className={`mb-3 rounded-md px-3 py-2 text-sm ${
            uploadStatus.success 
              ? 'bg-green-50 text-green-700 border border-green-200' 
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {uploadStatus.message}
          </div>
        )}
        
        <div className="flex justify-between gap-3">
          {/* Document/URL Upload Buttons */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleFileUpload}
              className="flex h-10 items-center gap-1 rounded-md border border-secondary-200 bg-white px-3 text-xs text-secondary-700 transition-colors hover:bg-secondary-50"
            >
              <Upload size={14} />
              <span className="hidden sm:inline">Upload</span>
            </button>
            <button
              type="button"
              onClick={onUrlUpload}
              className="flex h-10 items-center gap-1 rounded-md border border-secondary-200 bg-white px-3 text-xs text-secondary-700 transition-colors hover:bg-secondary-50"
            >
              <Link2 size={14} />
              <span className="hidden sm:inline">Add URL</span>
            </button>
          </div>

          {/* Create Case Button */}
          <button
            type="button"
            onClick={onCreateCase}
            className="flex h-10 items-center gap-1 rounded-md border border-primary-200 bg-primary-50 px-3 text-xs text-primary-700 transition-colors hover:bg-primary-100"
          >
            <Scale size={14} />
            <span>Create Case</span>
          </button>
        </div>

        {/* Message Input Form */}
        <form onSubmit={handleSubmit} className="mt-3">
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              className="w-full resize-none rounded-lg border border-secondary-200 bg-white py-3 pl-4 pr-10 text-sm text-secondary-900 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
              rows={1}
              disabled={isLoading || isSubmitting || !activeConversation}
            />
            <button
              type="submit"
              disabled={message.trim() === "" || isLoading || isSubmitting || !activeConversation}
              className="absolute bottom-3 right-3 rounded-md p-1 text-primary-600 transition-colors hover:bg-primary-50 disabled:text-secondary-300 disabled:hover:bg-transparent"
            >
              <Send size={18} />
            </button>
          </div>
        </form>

        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept=".pdf,.docx,.txt,.doc,.rtf"
          onChange={handleFileChange}
        />
      </div>
    </div>
  )
}
