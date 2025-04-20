import type {
  Conversation,
  Message,
  Document,
  QueryResult,
  Case,
  Lawyer,
  IngestUrlFormData,
  CreateCaseFormData,
  KnowledgeBase,
} from "@/types"
import { API_CONFIG } from "@/config"
import * as mockData from "./mockData"
import logger from "@/utils/logger"

// Add this line near the top of the file, after the imports
export { mockData }

const API_BASE_URL = API_CONFIG.baseUrl

// Add these type definitions at the top of the file with other interfaces
export interface CreateMessageParams {
  conversationId: string;
  /**
   * The message content (maps to 'content' in the backend API)
   */
  text: string;
  /**
   * The message role (maps to 'is_from_user' in the backend API)
   * 'user' -> is_from_user=true
   * 'assistant' or 'system' -> is_from_user=false
   */
  role?: "user" | "assistant" | "system";
  file?: File | null;
  url?: string;
  case_id?: string;
}

// Add this helper function near other utility functions
function generateRandomId(): string {
  return `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

// Helper function for handling API responses
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => null)
    throw new Error(errorData?.error || `API error: ${response.status} ${response.statusText}`)
  }
  return response.json() as Promise<T>
}

// Helper function to handle API requests with timeout and fallback
async function apiRequest<T>(url: string, options: RequestInit, mockFallback: T): Promise<T> {
  // Set default timeout (15 seconds for regular requests)
  const DEFAULT_TIMEOUT = 15000;
  // Set longer timeout (60 seconds) for document ingestion
  const INGEST_TIMEOUT = 60000;
  
  // Determine if this is an ingestion request (which needs longer timeout)
  const isIngestRequest = url.includes('/ingest/');
  const timeoutDuration = isIngestRequest ? INGEST_TIMEOUT : DEFAULT_TIMEOUT;
  
  try {
    logger.debug(`API request to ${url}`, options)
    
    // Create an AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);
    
    // Add the signal to options
    const enhancedOptions = {
      ...options,
      signal: controller.signal
    };
    
    const response = await fetch(url, enhancedOptions);
    clearTimeout(timeoutId);
    
    // For ingest endpoint, if we get a 202 Accepted status, the request is being processed
    // but not yet complete. Return a partial response with processing status.
    if (isIngestRequest && response.status === 202) {
      const responseData = await response.json();
      logger.info("Document ingest accepted, processing in background", responseData);
      
      // Return partial response with processing status
      return {
        document_id: responseData.document_id,
        status: "processing",
        title: responseData.title || "",
        description: responseData.description || "",
        ...(responseData)
      } as unknown as T;
    }
    
    return await handleResponse<T>(response);
  } catch (error) {
    // Handle AbortController timeout
    if (error instanceof DOMException && error.name === 'AbortError') {
      logger.warn(`Request timeout for ${url}`);
      
      // For ingest requests that timeout, still return a mock response with processing status
      // since the file is likely still being processed in the backend
      if (isIngestRequest && options.method === 'POST') {
        logger.info("Document ingest timeout but likely still processing in background");
        
        // Extract data from FormData if available
        let title = "Uploaded Document";
        let description = "";
        
        if (options.body instanceof FormData) {
          title = options.body.get('title')?.toString() || title;
          description = options.body.get('description')?.toString() || description;
        } else if (typeof options.body === 'string') {
          try {
            const jsonBody = JSON.parse(options.body);
            title = jsonBody.title || title;
            description = jsonBody.description || description;
          } catch {}
        }
        
        // Return mock document with processing status
        return {
          document_id: `doc-${Date.now()}`,
          title,
          description,
          status: "processing",
          message: "Document is being processed. The server is still working on it even though the request timed out."
        } as unknown as T;
      }
      
      // For other timeouts, log error and use fallback
      logger.error(`Request timeout for ${url}`, mockFallback);
      return mockFallback;
    }
    
    // Handle other errors
    logger.error(`API error for ${url}:`, error)
    
    if (API_CONFIG.debug) {
      console.error('API Error Details:', {
        url,
        error,
        mockFallbackUsed: true
      });
    }
    
    // Return mock data as fallback
    if (API_CONFIG.useMockDataFallback) {
      return mockFallback
    }
    
    throw error
  }
}

// Knowledge Base endpoints
export async function getKnowledgeBases(): Promise<KnowledgeBase[]> {
  const response = await apiRequest<any>(
    `${API_BASE_URL}/knowledge-bases/`, 
    { method: "GET" }, 
    mockData.mockKnowledgeBases
  );
  
  // Handle different response formats:
  // 1. If it's already an array, return it directly
  if (Array.isArray(response)) {
    return response;
  }
  
  // 2. Check if it's a paginated response (Django REST Framework format)
  if (response && response.results && Array.isArray(response.results)) {
    return response.results;
  }
  
  // 3. If it's an object with knowledge base properties, convert to array
  if (response && typeof response === 'object' && Object.keys(response).length > 0) {
    // Try to convert object to array if possible
    const kbArray = Object.values(response).filter(item => 
      item && typeof item === 'object' && 'id' in item
    ) as KnowledgeBase[];
    
    if (kbArray.length > 0) {
      return kbArray;
    }
  }
  
  // 4. If all else fails, return empty array
  console.warn('Received unexpected format for knowledge bases data:', response);
  return [];
}

export async function createKnowledgeBase(
  name: string,
  description: string,
  folderName: string,
): Promise<KnowledgeBase> {
  const options = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, description, folder_name: folderName }),
  }

  return apiRequest<KnowledgeBase>(
    `${API_BASE_URL}/knowledge-bases/`,
    options,
    // Create a new mock knowledge base as fallback
    {
      id: `kb-${Date.now()}`,
      name,
      description,
      folder_name: folderName,
      document_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  )
}

export async function getKnowledgeBaseDocuments(knowledgeBaseId: string): Promise<Document[]> {
  return apiRequest<Document[]>(
    `${API_BASE_URL}/knowledge-bases/${knowledgeBaseId}/documents/`,
    { method: "GET" },
    mockData.mockDocuments.filter((doc) => doc.knowledge_base_id === knowledgeBaseId),
  )
}

// Conversation endpoints
export async function getConversations(): Promise<Conversation[]> {
  const response = await apiRequest<any>(
    `${API_BASE_URL}/conversations/`, 
    { method: "GET" }, 
    mockData.mockConversations
  );
  
  // Handle different response formats:
  // 1. If it's already an array, return it directly
  if (Array.isArray(response)) {
    return response;
  }
  
  // 2. Check if it's a paginated response (Django REST Framework format)
  if (response && response.results && Array.isArray(response.results)) {
    return response.results;
  }
  
  // 3. If it's an object with conversation properties, convert to array
  if (response && typeof response === 'object' && Object.keys(response).length > 0) {
    // Try to convert object to array if possible
    const conversationsArray = Object.values(response).filter(item => 
      item && typeof item === 'object' && 'id' in item && ('active' in item ? item.active : true)
    ) as Conversation[];
    
    if (conversationsArray.length > 0) {
      return conversationsArray;
    }
  }
  
  // 4. If all else fails, return empty array instead of empty object
  console.warn('Received unexpected format for conversations data:', response);
  return [];
}

export async function getActiveConversations(): Promise<Conversation[]> {
  // First try to fetch active conversations directly from API endpoint
  const response = await apiRequest<any>(
    `${API_BASE_URL}/conversations/active/`, 
    { method: "GET" }, 
    mockData.mockConversations.filter((conv) => conv.active)
  );
  
  // Handle different response formats:
  // 1. If it's already an array, return it directly
  if (Array.isArray(response)) {
    return response;
  }
  
  // 2. Check if it's a paginated response (Django REST Framework format)
  if (response && response.results && Array.isArray(response.results)) {
    return response.results;
  }
  
  // 3. If it's an object with conversation properties, convert to array
  if (response && typeof response === 'object' && Object.keys(response).length > 0) {
    // Try to convert object to array if possible
    const conversationsArray = Object.values(response).filter(item => 
      item && typeof item === 'object' && 'id' in item
    ) as Conversation[];
    
    if (conversationsArray.length > 0) {
      // Filter for active conversations
      return conversationsArray.filter(conv => 'active' in conv ? conv.active : true);
    }
  }
  
  // 4. If the dedicated endpoint failed, try getting all conversations and filtering
  try {
    const allConversations = await getConversations();
    return allConversations.filter(conv => conv.active);
  } catch (error) {
    console.warn('Failed to get active conversations, returning empty array');
  }
  
  // 5. If all else fails, return empty array
  console.warn('Received unexpected format for active conversations data:', response);
  return [];
}

export async function createConversation(title: string, initialMessage: string): Promise<Conversation> {
  const options = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, initial_message: initialMessage }),
  }

  return apiRequest<Conversation>(
    `${API_BASE_URL}/conversations/`,
    options,
    // Create a new mock conversation as fallback
    {
      id: `conv-${Date.now()}`,
      title,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      active: true,
      message_count: 1,
      document_count: 0,
    },
  )
}

export async function getConversation(id: string): Promise<Conversation> {
  return apiRequest<Conversation>(
    `${API_BASE_URL}/conversations/${id}/`,
    { method: "GET" },
    mockData.mockConversations.find((conv) => conv.id === id) || mockData.mockConversations[0],
  )
}

export async function updateConversation(id: string, data: Partial<Conversation>): Promise<Conversation> {
  const options = {
    method: "PUT", // Note: API uses PUT instead of PATCH
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }

  return apiRequest<Conversation>(
    `${API_BASE_URL}/conversations/${id}/`,
    options,
    // Update the mock conversation
    {
      ...(mockData.mockConversations.find((conv) => conv.id === id) || mockData.mockConversations[0]),
      ...data,
      updated_at: new Date().toISOString(),
    },
  )
}

export async function deleteConversation(id: string): Promise<void> {
  await apiRequest<void>(`${API_BASE_URL}/conversations/${id}/`, { method: "DELETE" }, undefined)
}

// Message endpoints
export async function getMessages(conversationId: string): Promise<Message[]> {
  const response = await apiRequest<any>(
    `${API_BASE_URL}/conversations/${conversationId}/messages/`,
    { method: "GET" },
    mockData.mockMessages[conversationId] || []
  );
  
  // Handle different response formats:
  // 1. If it's already an array, return it directly
  if (Array.isArray(response)) {
    return response;
  }
  
  // 2. Check if it's a paginated response (Django REST Framework format)
  if (response && response.results && Array.isArray(response.results)) {
    return response.results;
  }
  
  // 3. If it's an object with messages properties, convert to array
  if (response && typeof response === 'object' && Object.keys(response).length > 0) {
    // Try to convert object to array if possible
    const messagesArray = Object.values(response).filter(item => 
      item && typeof item === 'object' && 'id' in item
    ) as Message[];
    
    if (messagesArray.length > 0) {
      // Sort messages by creation time
      return messagesArray.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    }
  }
  
  // 4. If all else fails, return empty array
  console.warn(`Received unexpected format for messages data for conversation ${conversationId}:`, response);
  return [];
}

// Add a helper function to properly add messages to a conversation
export async function addMessage(
  conversationId: string,
  content: string,
  is_from_user: boolean = true
): Promise<Message> {
  try {
    // Use the MessageCreateSerializer format expected by the backend
    const options = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        content,
        is_from_user
      }),
    };

    const response = await apiRequest<any>(
      `${API_BASE_URL}/conversations/${conversationId}/messages/`,
      options,
      // Mock fallback
      {
        id: generateRandomId(),
        conversation_id: conversationId,
        content,
        is_from_user,
        created_at: new Date().toISOString(),
      }
    );

    // Ensure response is properly formatted
    if (response && typeof response === 'object' && 'id' in response) {
      return response as Message;
    }

    // Create a properly formatted Message object as fallback
    return {
      id: response?.id || generateRandomId(),
      conversation_id: conversationId,
      content,
      is_from_user,
      created_at: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error adding message:", error);
    // Return a mock message as fallback
    return {
      id: generateRandomId(),
      conversation_id: conversationId,
      content,
      is_from_user,
      created_at: new Date().toISOString(),
    };
  }
}

export async function createMessage({ 
  conversationId, 
  text, 
  role = "user", 
  file = null, 
  url = "", 
  case_id = "", 
}: CreateMessageParams): Promise<Message> {
  const formData = new FormData();
  
  // Map from text to content and role to is_from_user for backend compatibility
  formData.append("content", text);
  formData.append("is_from_user", role === "user" ? "true" : "false");
  
  if (file) {
    formData.append("file", file);
  }
  
  if (url) {
    formData.append("url", url);
  }
  
  if (case_id) {
    formData.append("case_id", case_id);
  }

  try {
    const response = await apiRequest<any>(
      `${API_BASE_URL}/conversations/${conversationId}/messages/`,
      {
        method: "POST",
        body: formData,
      },
      // Mock fallback that matches Message interface
      {
        id: generateRandomId(),
        conversation_id: conversationId,
        content: text,
        is_from_user: role === "user",
        created_at: new Date().toISOString(),
      }
    );

    // Ensure the response is a proper Message object
    if (response && typeof response === 'object' && 'id' in response) {
      return response as Message;
    }
    
    // If we received an array (unlikely but possible), take the first item
    if (Array.isArray(response) && response.length > 0 && typeof response[0] === 'object') {
      return response[0] as Message;
    }
    
    // Fallback to creating a Message object with available data
    console.warn("Received unexpected format from create message API:", response);
    return {
      id: response?.id || generateRandomId(),
      conversation_id: conversationId,
      content: text,
      is_from_user: role === "user",
      created_at: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error creating message:", error);
    // Fallback to a mock message on error
    return {
      id: generateRandomId(),
      conversation_id: conversationId,
      content: text,
      is_from_user: role === "user",
      created_at: new Date().toISOString(),
    };
  }
}

// Document endpoints
export async function getDocuments(): Promise<Document[]> {
  const response = await apiRequest<any>(
    `${API_BASE_URL}/documents/`, 
    { method: "GET" }, 
    mockData.mockDocuments
  );
  
  // Handle different response formats:
  // 1. If it's already an array, return it directly
  if (Array.isArray(response)) {
    return response;
  }
  
  // 2. Check if it's a paginated response (Django REST Framework format)
  if (response && response.results && Array.isArray(response.results)) {
    return response.results;
  }
  
  // 3. If it's an object with document properties, convert to array
  if (response && typeof response === 'object' && Object.keys(response).length > 0) {
    // Try to convert object to array if possible
    const documentsArray = Object.values(response).filter(item => 
      item && typeof item === 'object' && 'document_id' in item
    ) as Document[];
    
    if (documentsArray.length > 0) {
      return documentsArray;
    }
  }
  
  // 4. If all else fails, return empty array
  console.warn('Received unexpected format for documents data:', response);
  return [];
}

// Helper function to normalize document status for consistent handling
function normalizeDocumentStatus(doc: Document): Document {
  // Make a copy of the document to avoid modifying the original
  const normalizedDoc = { ...doc };
  
  // Normalize status values
  if (normalizedDoc.status === 'indexed' || normalizedDoc.status === 'processed') {
    // Both "indexed" and "processed" indicate a document is ready for querying
    normalizedDoc.status = 'indexed';
  }
  
  return normalizedDoc;
}

export async function getConversationDocuments(conversationId: string): Promise<Document[]> {
  console.log(`Fetching documents for conversation: ${conversationId}`)
  
  try {
    const response = await apiRequest<any>(
      `${API_BASE_URL}/conversations/${conversationId}/documents/`,
      { method: "GET" },
      mockData.mockDocuments.filter((doc) => doc.conversation_id === conversationId)
    );
    
    console.log("Raw API response for documents:", response)
    
    let documents: Document[] = [];
    
    // Handle different response formats:
    // 1. If it's already an array, use it directly
    if (Array.isArray(response)) {
      console.log(`Found ${response.length} documents in array response`)
      documents = response;
    }
    // 2. Check if it's a paginated response (Django REST Framework format)
    else if (response && response.results && Array.isArray(response.results)) {
      console.log(`Found ${response.results.length} documents in paginated response`)
      documents = response.results;
    }
    // 3. If it's an object with document properties, convert to array
    else if (response && typeof response === 'object' && Object.keys(response).length > 0) {
      // Try to convert object to array if possible
      const documentsArray = Object.values(response).filter(item => 
        item && typeof item === 'object' && 'document_id' in item
      ) as Document[];
      
      if (documentsArray.length > 0) {
        console.log(`Converted object to array with ${documentsArray.length} documents`)
        documents = documentsArray;
      }
    }
    // 4. If it's an empty response with status 200, assume no documents
    else if (response === null || response === undefined || 
        (typeof response === 'object' && Object.keys(response).length === 0)) {
      console.log("Received empty response, returning empty array")
      documents = [];
    }
    // 5. If all else fails, return empty array
    else {
      console.warn('Received unexpected format for documents data:', response);
      documents = [];
    }
    
    // Normalize document status values
    const normalizedDocuments = documents.map(normalizeDocumentStatus);
    
    // Deduplicate documents by document_id before returning
    const uniqueDocuments = Array.from(
      new Map(normalizedDocuments.map(doc => [doc.document_id, doc])).values()
    );
    
    console.log(`After normalization and deduplication: ${documents.length} documents -> ${uniqueDocuments.length} unique documents`);
    return uniqueDocuments;
  } catch (error) {
    console.error(`Error fetching documents for conversation ${conversationId}:`, error);
    return [];
  }
}

export async function getDocument(documentId: string): Promise<Document> {
  return apiRequest<Document>(
    `${API_BASE_URL}/documents/${documentId}/`,
    { method: "GET" },
    mockData.mockDocuments.find((doc) => doc.document_id === documentId) || mockData.mockDocuments[0],
  )
}

export async function updateDocument(documentId: string, data: Partial<Document>): Promise<Document> {
  const options = {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }

  return apiRequest<Document>(`${API_BASE_URL}/documents/${documentId}/`, options, {
    ...(mockData.mockDocuments.find((doc) => doc.document_id === documentId) || mockData.mockDocuments[0]),
    ...data,
  })
}

export async function deleteDocument(documentId: string): Promise<void> {
  await apiRequest<void>(`${API_BASE_URL}/documents/${documentId}/`, { method: "DELETE" }, undefined)
}

// Ingest endpoints
export async function ingestUrl(data: IngestUrlFormData): Promise<Document> {
  const options = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }

  const response = await apiRequest<Document>(
    `${API_BASE_URL}/ingest/`,
    options,
    // Create a new mock document as fallback
    {
      document_id: `doc-url-${Date.now()}`,
      title: data.title,
      description: data.description,
      status: "processing", // Start as processing in mock mode
      chunks_count: 5,
      conversation_id: data.conversation_id,
      knowledge_base_id: data.knowledge_base_id,
      url: data.url,
    },
  );
  
  // Normalize document status if needed
  return normalizeDocumentStatus(response);
}

export async function ingestFile(
  file: File,
  title: string,
  description: string,
  conversationId?: string,
  knowledgeBaseId?: string,
): Promise<Document> {
  const formData = new FormData()
  formData.append("file", file)
  formData.append("title", title)
  formData.append("description", description)

  if (conversationId) {
    formData.append("conversation_id", conversationId)
  }

  if (knowledgeBaseId) {
    formData.append("knowledge_base_id", knowledgeBaseId)
  }

  try {
    logger.info(`Uploading file: ${file.name}, size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
    
    const response = await apiRequest<Document>(
      `${API_BASE_URL}/ingest/`,
      { method: "POST", body: formData },
      // Create a new mock document as fallback
      {
        document_id: `doc-file-${Date.now()}`,
        title,
        description,
        status: "processing", // Start as processing in mock mode
        chunks_count: 10,
        conversation_id: conversationId,
        knowledge_base_id: knowledgeBaseId,
        file_type: file.type.split("/")[1] || "pdf",
      },
    );
    
    // If the response was from a timeout but we still have a document_id,
    // we need to ensure the UI knows it's still processing
    if (response.status === "processing") {
      logger.info(`Document ${response.document_id} is being processed in the background`);
    }
    
    // Normalize document status if needed
    return normalizeDocumentStatus(response);
  } catch (error) {
    // Even if there's an error, we still want to return something that lets the
    // UI know a document is processing (since the backend might still be working on it)
    logger.error(`Error ingesting file: ${error instanceof Error ? error.message : String(error)}`);
    
    // Create a fallback document object with processing status
    const fallbackDoc = {
      document_id: `doc-file-${Date.now()}`,
      title,
      description,
      status: "processing",
      chunks_count: 0,
      conversation_id: conversationId,
      knowledge_base_id: knowledgeBaseId,
      file_type: file.type.split("/")[1] || "pdf",
      error_message: error instanceof Error ? error.message : "Unknown error occurred but the document may still be processing"
    };
    
    return fallbackDoc as Document;
  }
}

// Query endpoint
export async function queryRag(
  query: string,
  topK = 3,
  temperature = 0.0,
  conversationId?: string,
  knowledgeBaseId?: string,
  documentId?: string,
): Promise<QueryResult> {
  const requestBody: Record<string, any> = {
    query,
    top_k: topK,
    temperature,
  }

  if (conversationId) {
    requestBody.conversation_id = conversationId
  }

  if (knowledgeBaseId) {
    requestBody.knowledge_base_id = knowledgeBaseId
  }

  if (documentId) {
    requestBody.document_id = documentId
  }

  const options = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  }

  return apiRequest<QueryResult>(
    `${API_BASE_URL}/query/`,
    options,
    // Use mock query result as fallback
    {
      ...mockData.mockQueryResult,
      answer: mockData.mockQueryResult.answer.includes(query)
        ? mockData.mockQueryResult.answer
        : `Based on your question about "${query}", ${mockData.mockQueryResult.answer}`,
    },
  )
}

// Case endpoints
export async function createCase(data: CreateCaseFormData): Promise<Case> {
  const options = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }

  return apiRequest<Case>(
    `${API_BASE_URL}/cases/`,
    options,
    // Create a new mock case as fallback
    {
      id: `case-${Date.now()}`,
      conversation_id: data.conversation_id,
      title: data.title,
      issue_type: data.issue_type,
      priority: data.priority,
      status: "new",
      legal_analysis: "This is a mock legal analysis for the case.",
      created_at: new Date().toISOString(),
    },
  )
}

export async function getCases(): Promise<Case[]> {
  const response = await apiRequest<any>(
    `${API_BASE_URL}/cases/`, 
    { method: "GET" }, 
    mockData.mockCases
  );
  
  // Handle different response formats:
  // 1. If it's already an array, return it directly
  if (Array.isArray(response)) {
    return response;
  }
  
  // 2. Check if it's a paginated response (Django REST Framework format)
  if (response && response.results && Array.isArray(response.results)) {
    return response.results;
  }
  
  // 3. If it's an object with case properties, convert to array
  if (response && typeof response === 'object' && Object.keys(response).length > 0) {
    // Try to convert object to array if possible
    const casesArray = Object.values(response).filter(item => 
      item && typeof item === 'object' && 'id' in item && 'conversation_id' in item
    ) as Case[];
    
    if (casesArray.length > 0) {
      return casesArray;
    }
  }
  
  // 4. If all else fails, return empty array
  console.warn('Received unexpected format for cases data:', response);
  return [];
}

export async function getCase(caseId: string): Promise<Case> {
  return apiRequest<Case>(
    `${API_BASE_URL}/cases/${caseId}/`,
    { method: "GET" },
    mockData.mockCases.find((c) => c.id === caseId) || mockData.mockCases[0],
  )
}

export async function getConversationCase(conversationId: string): Promise<Case | null> {
  // Find case by conversation ID in mock data
  const mockCase = mockData.mockCases.find((c) => c.conversation_id === conversationId)

  try {
    // Make a direct request for cases related to this conversation
    const response = await apiRequest<any>(
      `${API_BASE_URL}/cases/?conversation_id=${conversationId}`,
      { method: "GET" },
      mockCase || null
    );

    // Handle different response formats:
    // 1. If it's already an array, search it
    if (Array.isArray(response)) {
      return response.find((c: Case) => c.conversation_id === conversationId) || null;
    }
    
    // 2. Check if it's a paginated response (Django REST Framework format)
    if (response && response.results && Array.isArray(response.results)) {
      return response.results.find((c: Case) => c.conversation_id === conversationId) || null;
    }
    
    // 3. If it's a single object (direct match), return it
    if (response && typeof response === 'object' && 'id' in response && 'conversation_id' in response) {
      if (response.conversation_id === conversationId) {
        return response;
      }
    }
    
    // 4. If we got here, no cases were found
    console.info(`No case found for conversation: ${conversationId}`);
    return null;
  } catch (error) {
    console.error("Error getting conversation case:", error);
    return mockCase || null;
  }
}

export async function updateCase(caseId: string, data: Partial<Case>): Promise<Case> {
  const options = {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }

  return apiRequest<Case>(`${API_BASE_URL}/cases/${caseId}/`, options, {
    ...(mockData.mockCases.find((c) => c.id === caseId) || mockData.mockCases[0]),
    ...data,
  })
}

export async function updateCaseStatus(caseId: string, status: string): Promise<Case> {
  const options = {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  }

  return apiRequest<Case>(`${API_BASE_URL}/cases/${caseId}/status/`, options, {
    ...(mockData.mockCases.find((c) => c.id === caseId) || mockData.mockCases[0]),
    status,
  })
}

export async function updateCasePriority(caseId: string, priority: number): Promise<Case> {
  const options = {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ priority }),
  }

  return apiRequest<Case>(`${API_BASE_URL}/cases/${caseId}/priority/`, options, {
    ...(mockData.mockCases.find((c) => c.id === caseId) || mockData.mockCases[0]),
    priority,
  })
}

export async function updateCaseAnalysis(
  caseId: string,
  legalAnalysis?: string,
  recommendations?: string,
  keyFacts?: string,
  citations?: string,
): Promise<Case> {
  const options = {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      legal_analysis: legalAnalysis,
      recommendations,
      key_facts: keyFacts,
      citations,
    }),
  }

  return apiRequest<Case>(`${API_BASE_URL}/cases/${caseId}/analysis/`, options, {
    ...(mockData.mockCases.find((c) => c.id === caseId) || mockData.mockCases[0]),
    legal_analysis: legalAnalysis || mockData.mockCases[0].legal_analysis,
  })
}

export async function claimCase(caseId: string, lawyerId: string): Promise<Case> {
  const options = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lawyer_id: lawyerId }),
  }

  return apiRequest<Case>(`${API_BASE_URL}/cases/${caseId}/claim/`, options, {
    ...(mockData.mockCases.find((c) => c.id === caseId) || mockData.mockCases[0]),
    lawyer_id: lawyerId,
    status: "assigned",
  })
}

export async function getUnassignedCases(): Promise<Case[]> {
  return apiRequest<Case[]>(
    `${API_BASE_URL}/cases/unassigned/`,
    { method: "GET" },
    mockData.mockCases.filter((c) => !c.lawyer_id),
  )
}

// Lawyer endpoints
export async function getLawyers(): Promise<Lawyer[]> {
  return apiRequest<Lawyer[]>(`${API_BASE_URL}/lawyers/`, { method: "GET" }, mockData.mockLawyers)
}

export async function getLawyer(id: string): Promise<Lawyer> {
  return apiRequest<Lawyer>(
    `${API_BASE_URL}/lawyers/${id}/`,
    { method: "GET" },
    mockData.mockLawyers.find((lawyer) => lawyer.id === id) || mockData.mockLawyers[0],
  )
}

export async function getLawyerCases(lawyerId: string): Promise<Case[]> {
  return apiRequest<Case[]>(
    `${API_BASE_URL}/lawyers/${lawyerId}/cases/`,
    { method: "GET" },
    mockData.mockCases.filter((c) => c.lawyer_id === lawyerId),
  )
}

export async function createLawyer(
  name: string,
  email: string,
  specialization: string,
  yearsOfExperience: number,
): Promise<Lawyer> {
  const options = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      email,
      specialization,
      years_of_experience: yearsOfExperience,
    }),
  }

  return apiRequest<Lawyer>(`${API_BASE_URL}/lawyers/`, options, {
    id: `lawyer-${Date.now()}`,
    name,
    email,
    specialization,
    years_experience: yearsOfExperience,
    active: true,
  })
}

export async function updateLawyer(lawyerId: string, data: Partial<Lawyer>): Promise<Lawyer> {
  const options = {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }

  return apiRequest<Lawyer>(`${API_BASE_URL}/lawyers/${lawyerId}/`, options, {
    ...(mockData.mockLawyers.find((l) => l.id === lawyerId) || mockData.mockLawyers[0]),
    ...data,
  })
}

