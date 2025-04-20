"use client"

import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from "react"
import type { Conversation, Message, Document, Case, QueryResult, KnowledgeBase } from "@/types"
import { 
  getMessages, 
  createConversation, 
  updateConversation as updateConversationApi, 
  deleteConversation as deleteConversationApi,
  getConversationDocuments as getConversationDocsApi,
  getConversationCase as getConversationCaseApi,
  getKnowledgeBases as getKnowledgeBasesApi,
  createKnowledgeBase as createKnowledgeBaseApi,
  ingestUrl,
  ingestFile,
  queryRag,
  createCase,
  createMessage,
  getDocuments
} from "@/services/api"
import logger from "@/utils/logger"

// Import mockData directly from the mockData file
import { mockDocuments, mockCases, mockKnowledgeBases, mockMessages } from "@/services/mockData"

interface ConversationContextType {
  activeConversation: Conversation | null
  messages: Message[]
  documents: Document[]
  currentCase: Case | null
  knowledgeBases: KnowledgeBase[]
  isLoading: boolean
  processingDocuments: string[] // IDs of documents currently being processed
  error: string | null
  setActiveConversation: (conversation: Conversation | null) => void
  startNewConversation: (title: string, initialMessage: string) => Promise<Conversation>
  sendMessage: (content: string) => Promise<void>
  uploadUrl: (url: string, title: string, description: string, knowledgeBaseId?: string) => Promise<Document>
  uploadFile: (file: File, title: string, description: string, knowledgeBaseId?: string) => Promise<Document>
  createLegalCase: (title: string, issueType: string, priority: number, summary?: string) => Promise<Case>
  updateConversation: (data: Partial<Conversation>) => Promise<Conversation>
  deleteConversation: () => Promise<void>
  getConversationDocuments: () => Promise<Document[]>
  getConversationCase: () => Promise<Case | null>
  askSpecificQuestion: (question: string, documentId?: string, knowledgeBaseId?: string) => Promise<string | void>
  createKnowledgeBase: (name: string, description: string, folderName: string) => Promise<KnowledgeBase>
  getKnowledgeBases: () => Promise<KnowledgeBase[]>
  clearError: () => void
  apiError: string | null
  resetApiError: () => void
  retryLastApiCall: () => Promise<void>
}

const ConversationContext = createContext<ConversationContextType | undefined>(undefined)

export function ConversationProvider({ children }: { children: ReactNode }) {
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [currentCase, setCurrentCase] = useState<Case | null>(null)
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [processingDocuments, setProcessingDocuments] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)
  const [lastApiCall, setLastApiCall] = useState<(() => Promise<void>) | null>(null)

  // Use refs to track initialization state
  const kbInitialized = useRef(false)

  const resetApiError = useCallback(() => {
    setApiError(null)
  }, [])

  const retryLastApiCall = useCallback(async () => {
    if (lastApiCall) {
      resetApiError()
      await lastApiCall()
    }
  }, [lastApiCall, resetApiError])

  // Load knowledge bases on initial load - only once
  useEffect(() => {
    if (!kbInitialized.current) {
      kbInitialized.current = true
      loadKnowledgeBases()
    }
  }, [])

  // Load messages when active conversation changes
  useEffect(() => {
    if (activeConversation) {
      loadMessages(activeConversation.id)
      loadDocuments(activeConversation.id)
      loadCase(activeConversation.id)
    } else {
      setMessages([])
      setDocuments([])
      setCurrentCase(null)
    }
  }, [activeConversation])

  // Poll for document processing status
  useEffect(() => {
    if (processingDocuments.length === 0) return

    logger.info(`Setting up polling for ${processingDocuments.length} documents in processing state`, processingDocuments)
    
    const interval = setInterval(async () => {
      try {
        // If we have an active conversation, check its documents
        if (activeConversation) {
          logger.debug(`Polling for document status updates (conversation: ${activeConversation.id})`)
          const updatedDocs = await getConversationDocsApi(activeConversation.id)
          logger.debug(`Received ${updatedDocs?.length || 0} documents from poll:`, updatedDocs)
          await updateDocumentsStatus(updatedDocs)
        } else {
          // Otherwise, check all documents
          logger.debug(`Polling for document status updates (all documents)`)
          const allDocs = await getDocuments()
          await updateDocumentsStatus(allDocs)
        }
      } catch (err) {
        logger.error("Error polling document status:", err)
      }
    }, 5000) // Poll every 5 seconds

    return () => {
      logger.debug("Clearing document polling interval")
      clearInterval(interval)
    }
  }, [processingDocuments, activeConversation?.id]) // Only depend on the ID, not the entire object

  // Helper to update document status
  const updateDocumentsStatus = async (updatedDocs: any) => {
    // Ensure updatedDocs is an array
    const docsArray = Array.isArray(updatedDocs) 
      ? updatedDocs 
      : (updatedDocs && updatedDocs.results && Array.isArray(updatedDocs.results))
        ? updatedDocs.results
        : [];

    // Update documents in state
    setDocuments((prevDocs) => {
      // Handle case where prevDocs might not be an array
      const prevDocsArray = Array.isArray(prevDocs) ? prevDocs : [];
      
      // Only update documents that are in the current view
      const currentDocIds = prevDocsArray.map((d: Document) => d.document_id)
      const relevantUpdatedDocs = docsArray.filter((d: Document) => currentDocIds.includes(d.document_id))

      if (relevantUpdatedDocs.length === 0) return prevDocsArray

      return prevDocsArray.map((doc: Document) => {
        const updatedDoc = relevantUpdatedDocs.find((d: Document) => d.document_id === doc.document_id)
        return updatedDoc || doc
      })
    })

    // Check if any documents are still processing
    const stillProcessing = docsArray.filter((doc: Document) => doc.status === "processing").map((doc: Document) => doc.document_id)

    setProcessingDocuments(stillProcessing)

    // If a document finished processing, add a system message
    const finishedDocs = processingDocuments.filter(
      (id) =>
        !stillProcessing.includes(id) && 
        (() => {
          const doc = docsArray.find((doc: Document) => doc.document_id === id);
          return doc && (doc.status === "processed" || doc.status === "indexed");
        })()
    )

    if (finishedDocs.length > 0 && activeConversation) {
      for (const docId of finishedDocs) {
        const doc = docsArray.find((d: Document) => d.document_id === docId)
        if (doc) {
          await createMessage({
            conversationId: activeConversation.id,
            text: `I've finished processing your document: "${doc.title}". You can now ask me questions about it.`,
            role: "assistant"
          })
          await loadMessages(activeConversation.id)
        }
      }
    }
  }

  const clearError = () => setError(null)

  async function loadKnowledgeBases() {
    try {
      const fetchedKBs = await getKnowledgeBasesApi()
      // Ensure we're setting an array, even if the API returns something unexpected
      setKnowledgeBases(Array.isArray(fetchedKBs) ? fetchedKBs : [])
    } catch (err) {
      console.error("Failed to load knowledge bases:", err)
      // Don't set error here to avoid disrupting the UI
      // Ensure we initialize to an empty array on error
      setKnowledgeBases([])
    }
  }

  async function loadMessages(conversationId: string) {
    try {
      setIsLoading(true)
      clearError()
      console.log(`Loading messages for conversation: ${conversationId}`)
      const fetchedMessages = await getMessages(conversationId)
      console.log(`Loaded ${fetchedMessages.length} messages:`, 
        fetchedMessages.map(m => ({id: m.id, length: m.content.length, preview: m.content.substring(0, 30)}))
      )
      setMessages(fetchedMessages)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load messages"
      console.error("Error loading messages:", errorMessage, err)
      setError(
        errorMessage.includes("Failed to fetch") ? "Could not connect to the server. Using demo data." : errorMessage,
      )
    } finally {
      setIsLoading(false)
    }
  }

  async function loadDocuments(conversationId: string) {
    try {
      console.log(`Loading documents for conversation: ${conversationId}`)
      const fetchedDocuments = await getConversationDocsApi(conversationId)
      console.log(`Fetched ${fetchedDocuments?.length || 0} documents:`, fetchedDocuments)
      
      // Deduplicate documents by document_id
      const uniqueDocuments = Array.isArray(fetchedDocuments) 
        ? Array.from(new Map(fetchedDocuments.map(doc => [doc.document_id, doc])).values())
        : [];
      
      console.log(`After deduplication: ${uniqueDocuments.length} unique documents`)
      setDocuments(uniqueDocuments)

      // Track processing documents
      const docsProcessing = uniqueDocuments
        .filter((doc) => doc.status === "processing")
        .map((doc) => doc.document_id);

      setProcessingDocuments(docsProcessing)
    } catch (err) {
      console.error("Failed to load documents:", err)
      // Don't set error here to avoid overriding message loading errors
      setDocuments([]) // Ensure documents is always an array
    }
  }

  async function loadCase(conversationId: string) {
    try {
      const fetchedCase = await getConversationCaseApi(conversationId)
      setCurrentCase(fetchedCase)
    } catch (err) {
      console.error("Failed to load case:", err)
      // Don't set error here to avoid overriding other errors
    }
  }

  const sendMessage = useCallback(
    async (content: string) => {
      if (!activeConversation) {
        console.error("No active conversation")
        setApiError("No active conversation. Please start a new conversation.")
        return
      }

      try {
        setIsLoading(true)
        console.log(`Sending message to conversation: ${activeConversation.id}`, {content})

        // Add user message immediately for better UX
        const tempUserMessage: Message = {
          id: `temp-user-${Date.now()}`,
          conversation_id: activeConversation.id,
          content,
          is_from_user: true,
          created_at: new Date().toISOString(),
        }

        setMessages((prev) => [...prev, tempUserMessage])

        // Scroll to bottom
        setTimeout(() => {
          const messagesEnd = document.getElementById("messages-end")
          messagesEnd?.scrollIntoView({ behavior: "smooth" })
        }, 100)

        // Add user message to API
        console.log("Creating user message in API")
        const userMessage = await createMessage({
          conversationId: activeConversation.id,
          text: content,
          role: "user"
        })
        console.log("User message created:", {id: userMessage.id, length: userMessage.content.length})

        // Replace temp message with real one
        setMessages((prev) => prev.map((msg) => (msg.id === tempUserMessage.id ? userMessage : msg)))

        // Add thinking indicator while waiting for API response
        const thinkingMessage: Message = {
          id: `thinking-${Date.now()}`,
          conversation_id: activeConversation.id,
          content: "Thinking...",
          is_from_user: false,
          created_at: new Date().toISOString(),
          isThinking: true
        }
        
        setMessages((prev) => [...prev, thinkingMessage])
        
        // Scroll to bottom again to show the thinking indicator
        setTimeout(() => {
          const messagesEnd = document.getElementById("messages-end")
          messagesEnd?.scrollIntoView({ behavior: "smooth" })
        }, 100)

        // Query RAG for response
        console.log("Querying RAG for response")
        const queryResult = await queryRag(content, 3, 0.0, activeConversation.id)
        console.log("RAG query response:", {answer: queryResult.answer.substring(0, 50), length: queryResult.answer.length})

        // Remove thinking message
        setMessages((prev) => prev.filter(msg => !msg.id.startsWith('thinking-')))

        // Format combined message with answer and citations if available
        let fullContent = queryResult.answer;
        if (queryResult.sources && queryResult.sources.length > 0) {
          console.log(`Adding citations for ${queryResult.sources.length} sources`)
          const citationsMessage = formatCitations(queryResult)
          console.log("Citations message length:", citationsMessage.length)
          
          // Combine answer and citations into one message
          fullContent = `${queryResult.answer}\n\n${citationsMessage}`;
        }

        // Add assistant message with the answer and citations combined
        console.log("Creating assistant message in API")
        const assistantMessage = await createMessage({
          conversationId: activeConversation.id,
          text: fullContent,
          role: "assistant"
        })
        console.log("Assistant message created:", {id: assistantMessage.id, length: assistantMessage.content.length})

        // Important: Ensure we're saving the complete content and marking as new for the typing effect
        const newAssistantMessage = {
          ...assistantMessage, 
          content: fullContent,
          isNew: true
        };
        
        setMessages((prev) => [...prev, newAssistantMessage])
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to send message"
        console.error("Error in sendMessage:", errorMessage, err)
        setApiError(
          errorMessage.includes("Failed to fetch")
            ? "Could not connect to the server. Using demo data."
            : `Error sending message: ${errorMessage}`,
        )

        // Remove thinking message if it exists
        setMessages((prev) => prev.filter(msg => !msg.id.startsWith('thinking-')))

        // If we're using mock data, we should still add the messages to the UI
        if (errorMessage.includes("Failed to fetch")) {
          // Add mock assistant response
          const mockAssistantMessage: Message = {
            id: `msg-assistant-${Date.now() + 1}`,
            conversation_id: activeConversation.id,
            content: `This is a demo response to your question about "${content}". In a real environment, this would be generated by the AI based on your conversation history and uploaded documents.`,
            is_from_user: false,
            created_at: new Date(Date.now() + 1000).toISOString(),
            isNew: true
          }

          setMessages((prev) => [...prev, mockAssistantMessage])
        }
      } finally {
        // Delay turning off loading state for better UX
        setTimeout(() => {
          setIsLoading(false)
        }, 500)
      }
    },
    [activeConversation],
  )

  // Format citations from query result
  function formatCitations(queryResult: QueryResult): string {
    if (!queryResult.sources || queryResult.sources.length === 0) {
      return ""
    }

    // Use a Map to deduplicate sources by document title and knowledge base
    const uniqueSources = new Map<string, typeof queryResult.sources[0]>();
    
    // Create a unique key for each source based on title and knowledge base
    queryResult.sources.forEach(source => {
      const uniqueKey = `${source.document_title}${source.source_kb ? `-${source.source_kb}` : ''}`;
      // Only add if not already present or if this one has a higher relevance score
      if (!uniqueSources.has(uniqueKey) || 
          source.relevance_score > uniqueSources.get(uniqueKey)!.relevance_score) {
        uniqueSources.set(uniqueKey, source);
      }
    });
    
    // Convert Map values back to array
    const deduplicatedSources = Array.from(uniqueSources.values());

    let citationsText = "**Sources:**\n\n"
    deduplicatedSources.forEach((source, index) => {
      citationsText += `${index + 1}. **${source.document_title}**`
      
      // Add knowledge base source if available
      if (source.source_kb) {
        citationsText += ` (from ${source.source_kb})`
      }
      
      citationsText += `\n`
      
      // Add extract if available
      if (source.content) {
        // Add quotes around the content and ellipsis if it's too long
        citationsText += `   "${source.content.substring(0, 500)}${source.content.length > 500 ? "..." : ""}"\n\n`
      } else {
        // Get content from chunk_id if available
        const chunkIndex = source.chunk_index !== undefined ? source.chunk_index : "unknown";
        const chunkContent = source.chunk_id ? `Chunk ${chunkIndex} from document` : ""
        if (chunkContent) {
          citationsText += `   "${chunkContent}"\n\n`
        } else {
          citationsText += `\n`
        }
      }
    })

    console.log("Generated citations:", citationsText)
    return citationsText
  }

  async function startNewConversation(title: string, initialMessage: string) {
    try {
      setIsLoading(true)
      clearError()
      const conversation = await createConversation(title, initialMessage)
      setActiveConversation(conversation)
      await loadMessages(conversation.id)
      return conversation
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create conversation"
      console.error(errorMessage, err)
      setError(
        errorMessage.includes("Failed to fetch") ? "Could not connect to the server. Using demo data." : errorMessage,
      )

      // If we're using mock data, we should still get a conversation back
      if (errorMessage.includes("Failed to fetch")) {
        const mockConversation = {
          id: `conv-${Date.now()}`,
          title,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          active: true,
          message_count: 1,
          document_count: 0,
        }
        setActiveConversation(mockConversation)
        return mockConversation
      }

      throw err
    } finally {
      setIsLoading(false)
    }
  }

  // Ask a specific question about a document or knowledge base
  async function askSpecificQuestion(question: string, documentId?: string, knowledgeBaseId?: string): Promise<string | void> {
    if (!activeConversation && !documentId && !knowledgeBaseId) {
      setError("No active conversation or document/knowledge base specified")
      return
    }

    try {
      setIsLoading(true)
      clearError()

      // Add user message
      let userMessage: Message

      if (activeConversation) {
        userMessage = await createMessage({
          conversationId: activeConversation.id,
          text: question,
          role: "user"
        })
        setMessages((prev) => [...prev, userMessage])
        
        // Add thinking indicator while waiting for API response
        const thinkingMessage: Message = {
          id: `thinking-${Date.now()}`,
          conversation_id: activeConversation.id,
          content: "Thinking...",
          is_from_user: false,
          created_at: new Date().toISOString(),
          isThinking: true
        }
        
        setMessages((prev) => [...prev, thinkingMessage])
        
        // Scroll to bottom to show thinking indicator
        setTimeout(() => {
          const messagesEnd = document.getElementById("messages-end")
          messagesEnd?.scrollIntoView({ behavior: "smooth" })
        }, 100)
      } else {
        // If no active conversation, just create a temporary message object for UI
        userMessage = {
          id: `temp-msg-${Date.now()}`,
          conversation_id: "",
          content: question,
          is_from_user: true,
          created_at: new Date().toISOString(),
        }
      }

      // Query RAG for response with specific document or knowledge base if provided
      const queryResult = await queryRag(
        question,
        3, // topK
        0.0, // temperature
        activeConversation?.id, // Optional conversation ID
        knowledgeBaseId, // Optional knowledge base to focus on
        documentId, // Optional document to focus on
      )
      
      // Remove thinking message if it exists
      if (activeConversation) {
        setMessages((prev) => prev.filter(msg => !msg.id.startsWith('thinking-')))
      }

      // Format combined message with answer and citations if available
      let fullContent = queryResult.answer;
      if (queryResult.sources && queryResult.sources.length > 0) {
        const citationsMessage = formatCitations(queryResult)
        // Combine answer and citations into one message
        fullContent = `${queryResult.answer}\n\n${citationsMessage}`;
      }

      // Add assistant message with the answer
      let assistantMessage: Message

      if (activeConversation) {
        assistantMessage = await createMessage({
          conversationId: activeConversation.id,
          text: fullContent,
          role: "assistant"
        })
        
        // Add with isNew flag for typing effect
        setMessages((prev) => [...prev, {...assistantMessage, content: fullContent, isNew: true}])
      } else {
        // If no active conversation, just return the answer (for document preview)
        return queryResult.answer
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to send message"
      console.error(errorMessage, err)
      setError(
        errorMessage.includes("Failed to fetch") ? "Could not connect to the server. Using demo data." : errorMessage,
      )
      
      // Remove any thinking messages
      if (activeConversation) {
        setMessages((prev) => prev.filter(msg => !msg.id.startsWith('thinking-')))
      }

      // Mock response for demo mode
      if (errorMessage.includes("Failed to fetch")) {
        handleMockResponse(question, documentId, knowledgeBaseId)
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Helper for mock responses
  function handleMockResponse(question: string, documentId?: string, knowledgeBaseId?: string) {
    if (!activeConversation) return

    // Add mock user message
    const mockUserMessage: Message = {
      id: `msg-user-${Date.now()}`,
      conversation_id: activeConversation.id,
      content: question,
      is_from_user: true,
      created_at: new Date().toISOString(),
    }

    // Create mock response based on document if specified
    let responseContent = `This is a demo response to your question about "${question}".`

    if (documentId) {
      const doc = documents.find((d) => d.document_id === documentId)
      if (doc) {
        responseContent = `Based on your question about "${question}" regarding the document "${doc.title}": This is a simulated response that would normally be generated from the content of your document.`
      }
    } else if (knowledgeBaseId) {
      const kb = knowledgeBases.find((k) => k.id === knowledgeBaseId)
      if (kb) {
        responseContent = `Based on your question about "${question}" using the knowledge base "${kb.name}": This is a simulated response that would normally be generated from the documents in this knowledge base.`
      }
    }

    // Add mock assistant response with isNew flag for typing effect
    const mockAssistantMessage: Message = {
      id: `msg-assistant-${Date.now() + 1}`,
      conversation_id: activeConversation.id,
      content: responseContent,
      is_from_user: false,
      created_at: new Date(Date.now() + 1000).toISOString(),
      isNew: true
    }

    setMessages((prev) => [...prev, mockUserMessage, mockAssistantMessage])
  }

  async function uploadUrl(url: string, title: string, description: string, knowledgeBaseId?: string) {
    if (!activeConversation && !knowledgeBaseId) {
      throw new Error("No active conversation or knowledge base specified")
    }

    try {
      setIsLoading(true)
      clearError()
      console.log("Uploading URL:", url, "to conversation:", activeConversation?.id || "none")

      const document = await ingestUrl({
        url,
        title,
        description,
        conversation_id: activeConversation?.id,
        knowledge_base_id: knowledgeBaseId,
      })

      console.log("URL document created:", document)

      // Add to processing documents if needed
      if (document.status === "processing") {
        setProcessingDocuments((prev) => [...prev, document.document_id])
      }

      // Explicitly refresh document list
      if (activeConversation) {
        console.log("Refreshing document list after URL upload")
        const updatedDocs = await getConversationDocsApi(activeConversation.id)
        console.log("Retrieved documents after URL upload:", updatedDocs)
        setDocuments(prev => {
          const newDocs = [...prev, document]
          console.log("Updated documents state:", newDocs)
          return newDocs
        })
      }

      // Add a message about the document if we have an active conversation
      if (activeConversation) {
        await createMessage({
          conversationId: activeConversation.id,
          text: `I've uploaded content from ${url} for processing: ${title} - ${description}. I'll notify you when it's ready for questions.`,
          role: "assistant"
        })

        await loadMessages(activeConversation.id)
      }

      return document
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to upload URL"
      console.error(errorMessage, err)
      setError(
        errorMessage.includes("Failed to fetch") ? "Could not connect to the server. Using demo data." : errorMessage,
      )

      // If we're using mock data, we should still add a mock document
      if (errorMessage.includes("Failed to fetch")) {
        const mockDocument: Document = {
          document_id: `doc-url-${Date.now()}`,
          title,
          description,
          status: "processed", // Assume processed immediately in mock mode
          chunks_count: 10,
          conversation_id: activeConversation?.id,
          knowledge_base_id: knowledgeBaseId,
          url,
        }

        setDocuments((prev) => [...prev, mockDocument])

        // Add mock messages if we have an active conversation
        if (activeConversation) {
          const mockUserMessage: Message = {
            id: `msg-doc-${Date.now()}`,
            conversation_id: activeConversation.id,
            content: `I've uploaded content from ${url} for processing.`,
            is_from_user: true,
            created_at: new Date().toISOString(),
          }

          const mockAssistantMessage: Message = {
            id: `msg-assistant-${Date.now() + 1}`,
            conversation_id: activeConversation.id,
            content: `I've processed the content from "${url}". You can now ask me questions about it.`,
            is_from_user: false,
            created_at: new Date(Date.now() + 1000).toISOString(),
          }

          setMessages((prev) => [...prev, mockUserMessage, mockAssistantMessage])
        }

        return mockDocument
      }

      throw err
    } finally {
      setIsLoading(false)
    }
  }

  async function uploadFile(file: File, title: string, description: string, knowledgeBaseId?: string) {
    if (!activeConversation && !knowledgeBaseId) {
      throw new Error("No active conversation or knowledge base specified")
    }

    try {
      setIsLoading(true)
      clearError()
      console.log("Uploading file:", file.name, "to conversation:", activeConversation?.id || "none")

      const document = await ingestFile(file, title, description, activeConversation?.id, knowledgeBaseId)
      console.log("File document created:", document)

      // Add to processing documents if needed
      if (document.status === "processing") {
        setProcessingDocuments((prev) => [...prev, document.document_id])
      }

      // Explicitly add to documents state
      console.log("Adding document to state:", document)
      setDocuments(prev => {
        const newDocs = [...prev, document]
        console.log("Updated documents state:", newDocs)
        return newDocs
      })

      // Explicitly refresh document list to ensure we have latest data
      if (activeConversation) {
        console.log("Refreshing document list after file upload")
        try {
          const updatedDocs = await getConversationDocsApi(activeConversation.id)
          console.log("Retrieved documents after file upload:", updatedDocs)
          if (updatedDocs && updatedDocs.length > 0) {
            setDocuments(updatedDocs)
          }
        } catch (refreshErr) {
          console.error("Error refreshing documents:", refreshErr)
          // Don't throw here, as we already have the document in state
        }
      }

      // Add a message about the document if we have an active conversation
      if (activeConversation) {
        await createMessage({
          conversationId: activeConversation.id,
          text: `I've uploaded a document for processing: ${title} - ${description}. I'll notify you when it's ready for questions.`,
          role: "assistant"
        })

        await loadMessages(activeConversation.id)
      }

      return document
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to upload file"
      console.error(errorMessage, err)
      setError(
        errorMessage.includes("Failed to fetch") ? "Could not connect to the server. Using demo data." : errorMessage,
      )

      // If we're using mock data, we should still add a mock document
      if (errorMessage.includes("Failed to fetch")) {
        const mockDocument: Document = {
          document_id: `doc-file-${Date.now()}`,
          title,
          description,
          status: "processed", // Assume processed immediately in mock mode
          chunks_count: 10,
          conversation_id: activeConversation?.id,
          knowledge_base_id: knowledgeBaseId,
          file_type: file.type.split("/")[1] || "pdf",
        }

        setDocuments((prev) => [...prev, mockDocument])

        // Add mock messages if we have an active conversation
        if (activeConversation) {
          const mockUserMessage: Message = {
            id: `msg-doc-${Date.now()}`,
            conversation_id: activeConversation.id,
            content: `I've uploaded a document for processing: ${title} - ${description}.`,
            is_from_user: true,
            created_at: new Date().toISOString(),
          }

          const mockAssistantMessage: Message = {
            id: `msg-assistant-${Date.now() + 1}`,
            conversation_id: activeConversation.id,
            content: `I've processed the document you uploaded. You can now ask me questions about "${title}".`,
            is_from_user: false,
            created_at: new Date(Date.now() + 1000).toISOString(),
          }

          setMessages((prev) => [...prev, mockUserMessage, mockAssistantMessage])
        }

        return mockDocument
      }

      throw err
    } finally {
      setIsLoading(false)
    }
  }

  async function createLegalCase(title: string, issueType: string, priority: number, summary?: string) {
    if (!activeConversation) {
      throw new Error("No active conversation")
    }

    try {
      setIsLoading(true)
      clearError()

      const caseData = {
        conversation_id: activeConversation.id,
        title,
        issue_type: issueType,
        priority,
        summary,
      }

      const legalCase = await createCase(caseData)

      setCurrentCase(legalCase)

      // Add a message about the case creation
      await createMessage({
        conversationId: activeConversation.id,
        text: `I've created a legal case: "${title}" with priority ${priority}/5. A lawyer will review your case soon.`,
        role: "assistant"
      })

      await loadMessages(activeConversation.id)
      return legalCase
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create case"
      console.error(errorMessage, err)
      setError(
        errorMessage.includes("Failed to fetch") ? "Could not connect to the server. Using demo data." : errorMessage,
      )

      // If we're using mock data, we should still return a mock case
      if (errorMessage.includes("Failed to fetch")) {
        const mockCase: Case = {
          id: `case-${Date.now()}`,
          conversation_id: activeConversation.id,
          title,
          issue_type: issueType,
          priority,
          status: "new",
          legal_analysis:
            "This is a mock legal analysis for the case. In a real environment, this would be generated by the AI based on the conversation history and uploaded documents.",
          created_at: new Date().toISOString(),
        }

        setCurrentCase(mockCase)

        // Add a mock message about the case creation
        const mockMessage: Message = {
          id: `msg-case-${Date.now()}`,
          conversation_id: activeConversation.id,
          content: `I've created a legal case: "${title}" with priority ${priority}/5. A lawyer will review your case soon.`,
          is_from_user: false,
          created_at: new Date().toISOString(),
        }

        setMessages((prev) => [...prev, mockMessage])
        return mockCase
      }

      throw err
    } finally {
      setIsLoading(false)
    }
  }

  async function updateConversation(data: Partial<Conversation>) {
    if (!activeConversation) {
      throw new Error("No active conversation")
    }

    try {
      setIsLoading(true)
      clearError()
      const updatedConversation = await updateConversationApi(activeConversation.id, data)
      setActiveConversation(updatedConversation)
      return updatedConversation
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update conversation"
      console.error(errorMessage, err)
      setError(
        errorMessage.includes("Failed to fetch") ? "Could not connect to the server. Using demo data." : errorMessage,
      )

      // If we're using mock data, we should still update the conversation in the UI
      if (errorMessage.includes("Failed to fetch")) {
        const updatedConversation = {
          ...activeConversation,
          ...data,
          updated_at: new Date().toISOString(),
        }
        setActiveConversation(updatedConversation)
        return updatedConversation
      }

      throw err
    } finally {
      setIsLoading(false)
    }
  }

  async function deleteConversation() {
    if (!activeConversation) {
      throw new Error("No active conversation")
    }

    try {
      setIsLoading(true)
      clearError()
      await deleteConversationApi(activeConversation.id)
      setActiveConversation(null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete conversation"
      console.error(errorMessage, err)
      setError(
        errorMessage.includes("Failed to fetch") ? "Could not connect to the server. Using demo data." : errorMessage,
      )

      // If we're using mock data, we should still remove the conversation from the UI
      if (errorMessage.includes("Failed to fetch")) {
        setActiveConversation(null)
      } else {
        throw err
      }
    } finally {
      setIsLoading(false)
    }
  }

  async function getConversationDocuments() {
    if (!activeConversation) {
      throw new Error("No active conversation")
    }

    try {
      const docs = await getConversationDocsApi(activeConversation.id)
      setDocuments(docs)
      return docs
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to get conversation documents"
      console.error(errorMessage, err)

      // If we're using mock data, return mock documents
      if (errorMessage.includes("Failed to fetch")) {
        const mockDocs = mockDocuments.filter((doc) => doc.conversation_id === activeConversation.id)
        setDocuments(mockDocs)
        return mockDocs
      }

      throw err
    }
  }

  async function getConversationCase() {
    if (!activeConversation) {
      throw new Error("No active conversation")
    }

    try {
      const caseData = await getConversationCaseApi(activeConversation.id)
      setCurrentCase(caseData)
      return caseData
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to get conversation case"
      console.error(errorMessage, err)

      // If we're using mock data, return mock case
      if (errorMessage.includes("Failed to fetch")) {
        const mockCase = mockCases.find((c) => c.conversation_id === activeConversation.id) || null
        setCurrentCase(mockCase)
        return mockCase
      }

      return null
    }
  }

  async function createKnowledgeBase(name: string, description: string, folderName: string) {
    try {
      setIsLoading(true)
      clearError()
      const kb = await createKnowledgeBaseApi(name, description, folderName)
      setKnowledgeBases((prev) => [...prev, kb])
      return kb
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create knowledge base"
      console.error(errorMessage, err)
      setError(
        errorMessage.includes("Failed to fetch") ? "Could not connect to the server. Using demo data." : errorMessage,
      )

      // If we're using mock data, create a mock KB
      if (errorMessage.includes("Failed to fetch")) {
        const mockKB: KnowledgeBase = {
          id: `kb-${Date.now()}`,
          name,
          description,
          folder_name: folderName,
          document_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        setKnowledgeBases((prev) => [...prev, mockKB])
        return mockKB
      }

      throw err
    } finally {
      setIsLoading(false)
    }
  }

  async function getKnowledgeBases() {
    try {
      const kbs = await getKnowledgeBasesApi()
      // Ensure knowledgeBases is always an array
      const kbArray = Array.isArray(kbs) ? kbs : []
      setKnowledgeBases(kbArray)
      return kbArray
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to get knowledge bases"
      console.error(errorMessage, err)

      // If we're using mock data, return mock KBs
      if (errorMessage.includes("Failed to fetch")) {
        const mockKBs = Array.isArray(mockKnowledgeBases) 
          ? mockKnowledgeBases 
          : []
        setKnowledgeBases(mockKBs)
        return mockKBs
      }
      
      // Return empty array on error
      setKnowledgeBases([])
      return []
    }
  }

  const value = {
    activeConversation,
    messages,
    documents,
    currentCase,
    knowledgeBases,
    isLoading,
    processingDocuments,
    error,
    setActiveConversation,
    startNewConversation,
    sendMessage,
    uploadUrl,
    uploadFile,
    createLegalCase,
    updateConversation,
    deleteConversation,
    getConversationDocuments,
    getConversationCase,
    askSpecificQuestion,
    createKnowledgeBase,
    getKnowledgeBases,
    clearError,
    apiError,
    resetApiError,
    retryLastApiCall,
  }

  return <ConversationContext.Provider value={value}>{children}</ConversationContext.Provider>
}

export function useConversation() {
  const context = useContext(ConversationContext)
  if (context === undefined) {
    throw new Error("useConversation must be used within a ConversationProvider")
  }
  return context
}
