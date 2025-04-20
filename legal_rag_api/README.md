# Legal RAG API

A Django REST Framework API for legal document Retrieval Augmented Generation (RAG). This project provides a simple yet powerful API for ingesting legal documents, processing them with optimal chunking strategies, and querying them using OpenAI's LLM with FAISS vector database.

## Features

- **Document Ingestion**: Upload PDF and text files with metadata
- **Semantic Chunking**: Optimized chunking strategies for legal documents
- **Vector Search**: FAISS-powered semantic search with OpenAI embeddings
- **LLM Integration**: Query documents with GPT-4o and retrieve accurate answers
- **Source Attribution**: All answers include source information for verification
- **Performance Metrics**: Response time measurements for retrieval and LLM processing

## System Architecture

The system is composed of several key components:

1. **Django REST Framework**: Provides the API interface
2. **Document Processor**: Handles document extraction and chunking
3. **Vector Store**: Manages document embeddings using FAISS
4. **RAG Service**: Coordinates the RAG pipeline and LLM queries

## Setup and Installation

### Prerequisites

- Python 3.8+
- OpenAI API key

### Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd legal_rag_api
   ```

2. Create and activate a virtual environment:
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

4. Create an `.env` file from the example:
   ```
   cp .env.example .env
   ```

5. Edit the `.env` file and add your OpenAI API key.

6. Run database migrations:
   ```
   python manage.py makemigrations
   python manage.py migrate
   ```

7. Start the development server:
   ```
   python manage.py runserver
   ```

## API Usage

### Document Ingestion

**Endpoint**: `POST /api/ingest/`

**Request**:
- `file`: The document file (PDF or TXT)
- `title`: Document title
- `description`: (Optional) Document description

**Example**:
```bash
curl -X POST "http://localhost:8000/api/ingest/" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@document.pdf" \
  -F "title=Legal Contract" \
  -F "description=Sample contract for testing"
```

**Response**:
```json
{
  "document_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "title": "Legal Contract",
  "status": "indexed",
  "message": "Document processed successfully.",
  "chunks_count": 12
}
```

### Document Query

**Endpoint**: `POST /api/query/`

**Request**:
- `query`: The query text
- `top_k`: (Optional) Number of chunks to retrieve (default: 5)
- `temperature`: (Optional) Temperature for LLM generation (default: 0.0)

**Example**:
```bash
curl -X POST "http://localhost:8000/api/query/" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What are the termination clauses in the contract?",
    "top_k": 3,
    "temperature": 0.0
  }'
```

**Response**:
```json
{
  "query": "What are the termination clauses in the contract?",
  "answer": "The contract can be terminated under the following conditions: 1) By either party with 30 days written notice...",
  "sources": [
    {
      "document_title": "Legal Contract",
      "document_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "chunk_index": 5,
      "relevance_score": 0.92
    },
    {
      "document_title": "Legal Contract",
      "document_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "chunk_index": 6,
      "relevance_score": 0.85
    }
  ],
  "timing": {
    "retrieval_time": 0.12,
    "llm_time": 1.45,
    "total_time": 1.57
  }
}
```

## Optimal Chunking for Legal Documents

This system uses a specialized chunking strategy for legal documents that:

1. Respects structural boundaries like paragraphs and sections
2. Maintains context across related clauses
3. Uses overlapping chunks to prevent information loss at boundaries
4. Adapts chunk size based on document complexity

The default settings (750 token chunks with 150 token overlap) are optimized for legal documents based on empirical testing, but can be adjusted as needed.

## Future Improvements

- Implement reranking for better retrieval accuracy
- Add more document formats (DOCX, HTML, etc.)
- Integrate document comparison features
- Implement user authentication and document permissions
- Add support for custom chunking strategies

## License

This project is licensed under the MIT License - see the LICENSE file for details. 