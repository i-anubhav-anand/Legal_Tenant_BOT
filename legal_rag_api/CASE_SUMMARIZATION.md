# Legal RAG Case Summarization Feature

## Overview

The Legal RAG API includes a powerful case summarization feature that can automatically generate legal analysis from client conversations and associated documents. This feature helps legal professionals quickly understand the key legal issues in a client's case and provides an initial analysis to build upon.

## How It Works

The case summarization feature works as follows:

1. **Data Collection**: Analyzes conversation history and associated documents
2. **Issue Identification**: Identifies potential legal issues from the conversation
3. **Legal Research**: Uses the RAG (Retrieval Augmented Generation) system to find relevant legal information
4. **Analysis Generation**: Creates a structured legal analysis with key points, relevant laws, and recommendations
5. **Case Creation**: Saves the analysis with the case for future reference

## Using the Case Summarization Feature

### Via the API

#### 1. Create a Case from a Conversation

```bash
POST /api/cases/
```

**Request Body:**
```json
{
  "conversation_id": "uuid-of-conversation",
  "title": "Case Title",
  "issue_type": "Contract Dispute",
  "priority": 3
}
```

**Response:**
```json
{
  "id": "case-uuid",
  "conversation": "conversation-uuid",
  "conversation_title": "Original Conversation Title",
  "lawyer": null,
  "lawyer_name": null,
  "status": "new",
  "priority": 3,
  "legal_analysis": "Generated legal analysis text...",
  "created_at": "2023-06-15T12:34:56Z",
  "updated_at": "2023-06-15T12:34:56Z"
}
```

#### 2. Create a Case from a Conversation (Alternative Endpoint)

```bash
POST /api/conversations/{conversation_id}/create_case/
```

**Request Body:**
```json
{
  "title": "Case Title",
  "issue_type": "Contract Dispute",
  "priority": 3
}
```

#### 3. Update Case Analysis

You can also manually update the legal analysis:

```bash
PATCH /api/cases/{case_id}/analysis/
```

**Request Body:**
```json
{
  "legal_analysis": "Updated legal analysis..."
}
```

### Via the Test Script

We provide a test script to demonstrate the case summarization functionality:

```bash
./test_case_summary.sh
```

This script:
1. Creates a new conversation with a legal topic
2. Adds several messages to simulate a client conversation
3. Uploads a sample document to associate with the conversation
4. Creates a case from the conversation
5. Displays the generated legal analysis

## Customizing the Case Summarizer

The case summarization is powered by the `CaseSummarizer` class in `rag_api/utils/case_summarizer.py`. You can customize:

### 1. Prompt Generation

The `_build_summary_prompt` method creates the prompt for the LLM. You can modify this to customize the structure or content of the legal analysis.

### 2. Document Processing

The `_get_document_content` method extracts relevant content from documents associated with the conversation. You can enhance this to prioritize certain documents or extract specific information.

### 3. Knowledge Bases

The summarizer uses the knowledge bases defined in your Django settings. To specify which knowledge bases to use, set the `DEFAULT_KNOWLEDGE_BASE_IDS` in `settings.py`.

## Example Legal Analysis Output

A typical legal analysis will include:

1. **Summary of Key Facts**: Distilled from the conversation history
2. **Legal Issues Identified**: Main legal questions or problems
3. **Applicable Laws**: Relevant statutes, regulations, or precedents
4. **Potential Claims/Defenses**: Legal positions the client might take or face
5. **Recommended Actions**: Next steps for the legal team to pursue

## Performance Considerations

- Legal analysis generation typically takes 5-15 seconds depending on the complexity
- For large conversations or many documents, the process may take longer
- The quality of the analysis improves with more detailed conversations and relevant documents

## Future Improvements

Planned enhancements to the case summarization feature:

- Customizable analysis templates for different legal domains
- Citation linking to legal databases
- Risk assessment scoring
- Timeline extraction and visualization
- Integration with case management systems 