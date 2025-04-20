// API Response Types
export interface KnowledgeBase {
  id: string
  name: string
  description: string
  folder_name: string
  document_count: number
  created_at: string
  updated_at: string
}

export interface Conversation {
  id: string
  title: string
  created_at: string
  updated_at: string
  active: boolean
  message_count?: number
  document_count?: number
}

export interface Message {
  id: string
  conversation_id: string
  content: string
  is_from_user: boolean
  created_at: string
  isNew?: boolean
  isThinking?: boolean
}

export interface Document {
  document_id: string
  title: string
  description: string
  status: string // "processing", "processed", "failed"
  chunks_count: number
  conversation_id?: string
  knowledge_base_id?: string
  file_type?: string
  url?: string
}

export interface DocumentChunk {
  id: string
  document_id: string
  content: string
  chunk_index: number
  embedding_id?: string
}

export interface QueryResult {
  answer: string
  sources: {
    document_title: string
    document_id: string
    chunk_id: string
    chunk_index?: number
    content: string
    relevance_score: number
    source_kb?: string
  }[]
}

export interface Case {
  id: string
  conversation_id: string
  title: string
  issue_type: string
  priority: number
  status: string // "new", "assigned", "in_progress", "resolved", "closed"
  legal_analysis?: string
  recommendations?: string
  key_facts?: string
  citations?: string
  lawyer_id?: string
  created_at: string
  updated_at?: string
}

export interface Lawyer {
  id: string
  name: string
  email: string
  specialization: string
  years_experience: number
  active: boolean
}

// Form Types
export interface IngestUrlFormData {
  url: string
  title: string
  description: string
  conversation_id?: string
  knowledge_base_id?: string
}

export interface CreateCaseFormData {
  conversation_id: string
  title: string
  issue_type: string
  priority: number
  summary?: string
}
