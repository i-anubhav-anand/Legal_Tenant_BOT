"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { FileText, AlertTriangle, Upload, Info, CheckCircle, BookOpen, Scale } from "lucide-react"
import { useConversation } from "@/context/ConversationContext"
import ChatMessage from "./ChatMessage"
import DocumentList from "./DocumentList"
import CaseStatus from "./CaseStatus"

type ActionCardProps = {
  icon: React.ElementType
  title: string
  description: string
  onClick: () => void
}

function ActionCard({ icon: Icon, title, description, onClick }: ActionCardProps) {
  return (
    <button
      className="flex flex-col items-start rounded-lg border border-secondary-200 bg-white p-4 text-left transition-all hover:border-primary-300 hover:shadow-md"
      onClick={onClick}
    >
      <div className="mb-2 rounded-full bg-primary-100 p-2 text-primary-600">
        <Icon size={20} />
      </div>
      <h3 className="text-sm font-medium text-secondary-800">{title}</h3>
      <p className="mt-1 text-xs text-secondary-500">{description}</p>
    </button>
  )
}

export default function MainContent() {
  const { activeConversation, messages, documents, sendMessage, currentCase, isLoading } = useConversation()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [newMessageIds, setNewMessageIds] = useState<Set<string>>(new Set())

  // Track new messages for animation
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1]
      setNewMessageIds((prev) => {
        const updated = new Set(prev)
        updated.add(lastMessage.id)
        // Remove the ID after animation completes
        setTimeout(() => {
          setNewMessageIds((current) => {
            const next = new Set(current)
            next.delete(lastMessage.id)
            return next
          })
        }, 2000)
        return updated
      })
    }
  }, [messages])

  // Add additional debug logging to track message content
  useEffect(() => {
    console.log("MainContent rendered with messages:", messages)
    if (messages.length > 0) {
      console.log(`Latest message (${messages[messages.length-1].id}): ${messages[messages.length-1].content.substring(0, 50)}...`)
      console.log(`Total message content length: ${messages[messages.length-1].content.length}`)
    }
  }, [messages])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const actionCards = [
    {
      icon: FileText,
      title: "File a Housing Complaint",
      description: "Report issues with your rental unit",
      onClick: () => sendMessage("I need help filing a housing complaint for my rental unit."),
    },
    {
      icon: AlertTriangle,
      title: "Understand Eviction Notice",
      description: "Learn about your rights and next steps",
      onClick: () => sendMessage("I received an eviction notice. What are my rights and what should I do next?"),
    },
    {
      icon: Upload,
      title: "Upload Your Lease for Review",
      description: "Get insights on your rental agreement",
      onClick: () => sendMessage("I'd like to upload my lease agreement for review."),
    },
  ]

  // Capabilities of the legal assistant
  const capabilities = [
    {
      icon: CheckCircle,
      title: "Tenant Rights",
      description: "Explain your rights regarding repairs, privacy, and habitability",
    },
    {
      icon: Scale,
      title: "Legal Documents",
      description: "Review leases, notices, and other rental documents",
    },
    {
      icon: AlertTriangle,
      title: "Eviction Defense",
      description: "Help with eviction notices and understanding your options",
    },
    {
      icon: BookOpen,
      title: "Legal Information",
      description: "Provide information on housing laws in California",
    },
  ]

  if (!activeConversation) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8">
        <div className="max-w-md text-center">
          <h2 className="text-2xl font-bold text-primary-700">Welcome to LegalTenantBot</h2>
          <p className="mt-2 text-secondary-600">
            Select an existing conversation or start a new one to get legal assistance with your tenant issues.
          </p>
        </div>
      </div>
    )
  }

  const showWelcome = messages.length === 0 || (messages.length === 1 && messages[0].is_from_user);
  
  return (
    <div className="flex-1 overflow-auto px-4 py-6 md:px-8">
      <div className="mx-auto max-w-4xl">
        {/* Case status information if available */}
        {currentCase && <CaseStatus case={currentCase} />}

        {/* Conversation Title */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-secondary-800">{activeConversation.title}</h1>
          <p className="text-sm text-secondary-500">
            Started {new Date(activeConversation.created_at).toLocaleDateString()}
          </p>
        </div>

        {/* Document list section with empty state handling */}
        {Array.isArray(documents) && documents.length > 0 ? (
          <DocumentList />
        ) : (
          <div className="mb-6 rounded-lg border border-dashed border-secondary-200 bg-secondary-50 p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-secondary-100 p-2">
                <FileText size={18} className="text-secondary-500" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-secondary-700">No documents attached</h3>
                <p className="text-xs text-secondary-500">
                  Upload your lease, notices, or other documents to get more accurate help.
                </p>
              </div>
            </div>
          </div>
        )}

        {showWelcome ? (
          <div className="space-y-6">
            <div className="rounded-lg border border-primary-100 bg-primary-50 p-6">
              <div className="flex items-start gap-4">
                <div className="rounded-full bg-primary-100 p-3">
                  <Info size={24} className="text-primary-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-primary-800">
                    Welcome to your conversation
                  </h2>
                  <p className="mt-2 text-secondary-700">
                    I'm your legal assistant powered by legal RAG technology, here to help with tenant issues in California.
                    I can provide information and guidance based on California tenant law.
                  </p>
                  <div className="mt-4 text-xs text-secondary-600">
                    <p className="font-medium">Note: I'm not a licensed attorney and cannot provide legal advice.</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-base font-medium text-secondary-800">I can help you with:</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {capabilities.map((capability, index) => (
                  <div key={index} className="flex gap-3 rounded-lg border border-secondary-100 bg-white p-3">
                    <capability.icon size={18} className="mt-0.5 flex-shrink-0 text-primary-500" />
                    <div>
                      <h4 className="font-medium text-secondary-800">{capability.title}</h4>
                      <p className="text-xs text-secondary-600">{capability.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-base font-medium text-secondary-800">Common issues:</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {actionCards.map((card, index) => (
                  <ActionCard key={index} {...card} />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => {
              console.log(`Rendering message ${message.id} with content length: ${message.content.length}`);
              return (
                <ChatMessage 
                  key={message.id} 
                  message={message} 
                  isNew={newMessageIds.has(message.id)} 
                />
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
    </div>
  )
}
