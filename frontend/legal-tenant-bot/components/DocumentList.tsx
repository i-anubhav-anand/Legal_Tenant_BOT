"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { FileText, Link2, Clock, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { useConversation } from "@/context/ConversationContext"
import type { Document } from "@/types"

export default function DocumentList() {
  const { documents, processingDocuments, askSpecificQuestion } = useConversation()
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [question, setQuestion] = useState("")
  const [showQuestionForm, setShowQuestionForm] = useState(false)
  const [refreshCount, setRefreshCount] = useState(0)

  useEffect(() => {
    // Refresh the component when processing documents change
    if (processingDocuments.length > 0) {
      const interval = setInterval(() => {
        setRefreshCount(count => count + 1)
      }, 2000) // Update UI every 2 seconds while documents are processing
      
      return () => clearInterval(interval)
    }
  }, [processingDocuments.length])

  useEffect(() => {
    console.log("DocumentList rendered with documents:", documents)
  }, [documents, refreshCount])

  if (!documents || documents.length === 0) {
    return null
  }

  // Deduplicate documents by document_id (this is a safety measure in case the context doesn't properly deduplicate)
  const uniqueDocuments = Array.from(
    new Map(documents.map(doc => [doc.document_id, doc])).values()
  );

  const handleAskQuestion = (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedDocument && question.trim()) {
      askSpecificQuestion(question, selectedDocument.document_id)
      setQuestion("")
      setShowQuestionForm(false)
    }
  }

  const getStatusIcon = (doc: Document) => {
    if (processingDocuments.includes(doc.document_id)) {
      return <Loader2 size={16} className="text-amber-500 animate-spin" />
    } else if (doc.status === "processing") {
      return <Clock size={16} className="text-amber-500" />
    } else if (doc.status === "processed" || doc.status === "indexed") {
      return <CheckCircle size={16} className="text-green-500" />
    } else if (doc.status === "failed") {
      return <AlertCircle size={16} className="text-red-500" />
    } else {
      return <FileText size={16} className="text-secondary-400" />
    }
  }

  const getStatusText = (doc: Document) => {
    if (processingDocuments.includes(doc.document_id)) {
      return "Processing..."
    } else if (doc.status === "indexed") {
      return "Indexed"
    } else {
      return doc.status.charAt(0).toUpperCase() + doc.status.slice(1)
    }
  }

  return (
    <div className="mb-6">
      <h3 className="mb-2 flex items-center text-sm font-medium text-secondary-700">
        Documents
        <span className="ml-2 rounded-full bg-primary-100 px-2 py-0.5 text-xs text-primary-700">
          {uniqueDocuments.length}
        </span>
      </h3>
      <div className="space-y-2">
        {uniqueDocuments.map((doc) => (
          <div 
            key={doc.document_id}
            className={`rounded-md border ${
              processingDocuments.includes(doc.document_id)
                ? 'border-amber-200 bg-amber-50'
                : doc.status === 'processed' || doc.status === 'indexed'
                  ? 'border-green-100 bg-white'
                  : doc.status === 'failed'
                    ? 'border-red-200 bg-red-50'
                    : 'border-secondary-200 bg-white'
            } p-3 transition-colors duration-200`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-2">
                {doc.url ? (
                  <Link2 size={16} className="mt-0.5 text-secondary-400" />
                ) : (
                  <FileText size={16} className="mt-0.5 text-secondary-400" />
                )}
                <div>
                  <h4 className="text-sm font-medium text-secondary-800">{doc.title}</h4>
                  <p className="text-xs text-secondary-500">{doc.description}</p>
                  {doc.file_type && (
                    <p className="text-xs text-secondary-400 mt-1">
                      Type: {doc.file_type.toUpperCase()}
                    </p>
                  )}
                  {doc.url && (
                    <a 
                      href={doc.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="mt-1 block text-xs text-primary-600 hover:underline"
                    >
                      {doc.url.length > 50 ? `${doc.url.substring(0, 47)}...` : doc.url}
                    </a>
                  )}
                </div>
              </div>
              <div className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
                processingDocuments.includes(doc.document_id)
                  ? 'bg-amber-100 text-amber-700'
                  : doc.status === 'processed' || doc.status === 'indexed'
                    ? 'bg-green-100 text-green-700'
                    : doc.status === 'failed'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-secondary-100 text-secondary-700'
              }`}>
                {getStatusIcon(doc)}
                <span>{getStatusText(doc)}</span>
              </div>
            </div>

            {(doc.status === "processed" || doc.status === "indexed") && (
              <div className="mt-2 flex justify-end">
                <button
                  onClick={() => {
                    setSelectedDocument(doc)
                    setShowQuestionForm(!showQuestionForm || selectedDocument?.document_id !== doc.document_id)
                  }}
                  className="flex items-center gap-1 rounded-md bg-primary-50 px-2 py-1 text-xs font-medium text-primary-600 hover:bg-primary-100"
                >
                  <FileText size={12} />
                  Ask about this document
                </button>
              </div>
            )}

            {showQuestionForm && selectedDocument?.document_id === doc.document_id && (
              <form onSubmit={handleAskQuestion} className="mt-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder={`Ask about ${doc.title}...`}
                    className="flex-1 rounded-md border border-secondary-200 px-2 py-1 text-xs focus:border-primary-300 focus:outline-none focus:ring-1 focus:ring-primary-300"
                  />
                  <button
                    type="submit"
                    disabled={!question.trim()}
                    className="rounded-md bg-primary-600 px-2 py-1 text-xs text-white hover:bg-primary-700 disabled:bg-primary-300"
                  >
                    Ask
                  </button>
                </div>
              </form>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
