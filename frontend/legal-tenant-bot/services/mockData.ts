import type { Conversation, Message, Document, QueryResult, Case, Lawyer, KnowledgeBase, DocumentChunk } from "@/types"

// Mock knowledge bases
export const mockKnowledgeBases: KnowledgeBase[] = [
  {
    id: "kb-1",
    name: "Tenant Rights",
    description: "Knowledge base for tenant rights and housing laws",
    folder_name: "tenant_rights_kb",
    document_count: 3,
    created_at: new Date(Date.now() - 86400000 * 30).toISOString(), // 30 days ago
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
  },
  {
    id: "kb-2",
    name: "Eviction Procedures",
    description: "Knowledge base for eviction laws and procedures",
    folder_name: "eviction_procedures_kb",
    document_count: 2,
    created_at: new Date(Date.now() - 86400000 * 20).toISOString(), // 20 days ago
    updated_at: new Date(Date.now() - 86400000 * 5).toISOString(), // 5 days ago
  },
]

// Mock conversations
export const mockConversations: Conversation[] = [
  {
    id: "conv-1",
    title: "Rent Increase Dispute",
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
    updated_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    active: true,
    message_count: 4,
    document_count: 2,
  },
  {
    id: "conv-2",
    title: "Eviction Notice Questions",
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(), // 5 days ago
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
    active: true,
    message_count: 2,
    document_count: 0,
  },
  {
    id: "conv-3",
    title: "Security Deposit Return",
    created_at: new Date(Date.now() - 86400000 * 10).toISOString(), // 10 days ago
    updated_at: new Date(Date.now() - 86400000 * 8).toISOString(), // 8 days ago
    active: false,
    message_count: 2,
    document_count: 0,
  },
]

// Mock messages for each conversation
export const mockMessages: Record<string, Message[]> = {
  "conv-1": [
    {
      id: "msg-1-1",
      conversation_id: "conv-1",
      content:
        "My landlord is trying to increase my rent by 30% without proper notice. I've been living in the apartment for 3 years and I think this might be illegal.",
      is_from_user: true,
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: "msg-1-2",
      conversation_id: "conv-1",
      content:
        "I understand you're facing a rent increase issue. To help you better, could you tell me what state and city you live in, and whether you have a written lease agreement?",
      is_from_user: false,
      created_at: new Date(Date.now() - 86400000 * 2 + 60000).toISOString(),
    },
    {
      id: "msg-1-3",
      conversation_id: "conv-1",
      content:
        "I live in San Francisco, California. Yes, I do have a written lease agreement that I signed 3 years ago. It was initially a 1-year lease but has been renewing automatically since then.",
      is_from_user: true,
      created_at: new Date(Date.now() - 86400000 * 2 + 120000).toISOString(),
    },
    {
      id: "msg-1-4",
      conversation_id: "conv-1",
      content:
        "Thank you for that information. In San Francisco, rent control applies to buildings constructed before June 1979. If your building falls under rent control, annual rent increases are limited to a percentage set by the Rent Board (typically 2-3%). Even if your building is not rent-controlled, California law requires landlords to provide at least 30 days' notice for rent increases less than 10%, and 90 days' notice for increases over 10%. The 30% increase you mentioned would require 90 days' notice. I recommend checking if your building is covered by rent control and verifying when and how the notice was provided.",
      is_from_user: false,
      created_at: new Date(Date.now() - 86400000 * 2 + 180000).toISOString(),
    },
  ],
  "conv-2": [
    {
      id: "msg-2-1",
      conversation_id: "conv-2",
      content:
        "I received an eviction notice yesterday. The landlord says I violated the lease by having a pet, but my lease allows pets with a deposit, which I paid.",
      is_from_user: true,
      created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    },
    {
      id: "msg-2-2",
      conversation_id: "conv-2",
      content:
        "I'm sorry to hear about your situation. Could you provide more details about the eviction notice? What type of notice did you receive (e.g., 3-day, 30-day, 60-day), and what exactly does it state?",
      is_from_user: false,
      created_at: new Date(Date.now() - 86400000 * 5 + 60000).toISOString(),
    },
  ],
  "conv-3": [
    {
      id: "msg-3-1",
      conversation_id: "conv-3",
      content:
        "I moved out of my apartment 45 days ago and still haven't received my security deposit back. The landlord isn't responding to my emails.",
      is_from_user: true,
      created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
    },
    {
      id: "msg-3-2",
      conversation_id: "conv-3",
      content:
        "In California, landlords are required to return security deposits within 21 days after you move out. Since it's been 45 days, your landlord is in violation of California Civil Code Section 1950.5. You should send a formal demand letter via certified mail requesting the return of your deposit. If the landlord doesn't respond, you may be entitled to the full deposit amount plus additional damages up to twice the deposit amount in small claims court.",
      is_from_user: false,
      created_at: new Date(Date.now() - 86400000 * 10 + 60000).toISOString(),
    },
  ],
}

// Mock documents
export const mockDocuments: Document[] = [
  {
    document_id: "doc-1",
    title: "Residential Lease Agreement",
    description: "Jane Doe's lease agreement for 123 Main Street, San Francisco",
    status: "processed",
    chunks_count: 15,
    conversation_id: "conv-1",
    knowledge_base_id: "kb-1",
    file_type: "pdf",
  },
  {
    document_id: "doc-2",
    title: "San Francisco Rent Board - Rent Increase Justifications",
    description: "Official information about justifications required for rent increases in San Francisco",
    status: "processed",
    chunks_count: 8,
    conversation_id: "conv-1",
    knowledge_base_id: "kb-1",
    url: "https://sfrb.org/rent-increases",
  },
  {
    document_id: "doc-3",
    title: "California Tenant Rights Handbook",
    description: "Comprehensive guide to tenant rights in California",
    status: "processed",
    chunks_count: 25,
    knowledge_base_id: "kb-1",
    file_type: "pdf",
  },
  {
    document_id: "doc-4",
    title: "Eviction Process in California",
    description: "Step-by-step guide to the eviction process in California",
    status: "processed",
    chunks_count: 18,
    knowledge_base_id: "kb-2",
    file_type: "pdf",
  },
  {
    document_id: "doc-5",
    title: "California Eviction Notice Templates",
    description: "Templates for various types of eviction notices in California",
    status: "processed",
    chunks_count: 10,
    knowledge_base_id: "kb-2",
    file_type: "pdf",
  },
]

// Mock document chunks
export const mockDocumentChunks: DocumentChunk[] = [
  {
    id: "chunk-1-1",
    document_id: "doc-1",
    content:
      'This Residential Lease Agreement ("Agreement") is made and entered into this 15th day of January, 2021, by and between John Smith ("Landlord") and Jane Doe ("Tenant") for the property located at 123 Main Street, San Francisco, CA 94110 ("Premises").',
    chunk_index: 0,
    embedding_id: "emb-1-1",
  },
  {
    id: "chunk-1-2",
    document_id: "doc-1",
    content:
      "6. RENT INCREASES: Any increase in the monthly rent during the term of the Lease or any renewal period shall require at least thirty (30) days' written notice to Tenant. Any rent increase must comply with the San Francisco Rent Ordinance and other applicable laws.",
    chunk_index: 5,
    embedding_id: "emb-1-2",
  },
]

// Mock query result
export const mockQueryResult: QueryResult = {
  answer:
    "Based on San Francisco's rent control ordinance, a landlord cannot increase rent by more than the annual allowable increase set by the Rent Board (typically 2-3% per year) for buildings constructed before June 1979. The notice period required is 30 days for increases less than 10% and 90 days for increases over 10%. A 'market adjustment' is not a valid justification for exceeding the allowable increase in a rent-controlled apartment. You can challenge this increase by filing a petition with the San Francisco Rent Board.",
  sources: [
    {
      document_title: "San Francisco Rent Board - Rent Increase Justifications",
      document_id: "doc-2",
      chunk_id: "chunk-2-1",
      content:
        "Annual rent increases for rent-controlled units in San Francisco are limited to the percentage set by the Rent Board each year. For 2023, this limit is 2.3%.",
      relevance_score: 0.92,
      source_kb: "Housing Law Knowledge Base"
    },
    {
      document_title: "Residential Lease Agreement",
      document_id: "doc-1",
      chunk_id: "chunk-1-5",
      content:
        "6. RENT INCREASES: Any increase in the monthly rent during the term of the Lease or any renewal period shall require at least thirty (30) days' written notice to Tenant. Any rent increase must comply with the San Francisco Rent Ordinance and other applicable laws.",
      relevance_score: 0.85,
      source_kb: "Uploaded Documents"
    },
  ],
}

// Mock cases
export const mockCases: Case[] = [
  {
    id: "case-1",
    conversation_id: "conv-1",
    title: "Rent Increase Dispute - 30% Increase",
    issue_type: "Landlord/Tenant",
    priority: 4,
    status: "new",
    legal_analysis:
      "The tenant has a strong case against the 30% rent increase. The building falls under San Francisco rent control (pre-1979 construction), limiting annual increases to 2.3% for 2023. The landlord failed to provide the required 90-day notice for increases over 10%. Recommend filing a petition with the SF Rent Board.",
    recommendations: "File a petition with the San Francisco Rent Board within 15 days of receiving the notice.",
    key_facts: "Building constructed 1965. Tenant has lived there 3 years. 30% increase with 30 days notice.",
    citations: "San Francisco Administrative Code Chapter 37; California Civil Code Section 827(b)(3).",
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 43200000).toISOString(),
  },
]

// Mock lawyers
export const mockLawyers: Lawyer[] = [
  {
    id: "lawyer-1",
    name: "Sarah Johnson",
    email: "sarah.johnson@legalfirm.com",
    specialization: "Tenant Rights",
    years_experience: 8,
    active: true,
  },
  {
    id: "lawyer-2",
    name: "Michael Chen",
    email: "michael.chen@legalfirm.com",
    specialization: "Housing Law",
    years_experience: 12,
    active: true,
  },
  {
    id: "lawyer-3",
    name: "Jessica Rodriguez",
    email: "jessica.rodriguez@legalfirm.com",
    specialization: "Eviction Defense",
    years_experience: 5,
    active: true,
  },
]
