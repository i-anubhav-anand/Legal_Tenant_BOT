# Legal RAG API Quick Start Guide

This guide will help you quickly get the Legal RAG API up and running.

## Installation

1. **Clone the repository and navigate to the project directory**

2. **Create and activate a virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up your environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit the `.env` file to add your OpenAI API key.

5. **Run database migrations**
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```

6. **Create an admin user (optional)**
   ```bash
   python manage.py createsuperuser
   ```

## Running the API

1. **Start the Django development server**
   ```bash
   python manage.py runserver
   ```

2. **Access the API endpoints**
   - The API will be available at `http://localhost:8000/api/`
   - The admin interface will be available at `http://localhost:8000/admin/`

## Testing the API

1. **Run the test script**
   ```bash
   ./test_api.sh
   ```
   This will:
   - Create a sample legal document
   - Upload it to the API
   - Query it with sample questions
   - Display the results

2. **Manual Testing**

   **Document Ingestion:**
   ```bash
   curl -X POST "http://localhost:8000/api/ingest/" \
     -H "Content-Type: multipart/form-data" \
     -F "file=@/path/to/your/document.pdf" \
     -F "title=Document Title" \
     -F "description=Document description"
   ```

   **Document Query:**
   ```bash
   curl -X POST "http://localhost:8000/api/query/" \
     -H "Content-Type: application/json" \
     -d '{
       "query": "What does this document say about termination?",
       "top_k": 3,
       "temperature": 0.0
     }'
   ```

## API Endpoints

### Document Management

- **GET `/api/documents/`**: List all documents
- **POST `/api/documents/`**: Create a new document record
- **GET `/api/documents/{id}/`**: Retrieve a specific document
- **PUT `/api/documents/{id}/`**: Update a document
- **DELETE `/api/documents/{id}/`**: Delete a document
- **GET `/api/documents/{id}/chunks/`**: List chunks for a document

### Document Ingestion

- **POST `/api/ingest/`**: Ingest and process a document file
  - Parameters:
    - `file`: The document file (PDF, TXT)
    - `title`: Document title
    - `description`: Optional document description

### Document Query

- **POST `/api/query/`**: Query documents using RAG
  - Parameters:
    - `query`: The question to ask
    - `top_k`: Number of chunks to retrieve (default: 5)
    - `temperature`: Temperature for LLM generation (default: 0.0)

## Folder Structure

```
legal_rag_api/
├── legal_rag/              # Django project settings
├── rag_api/                # Main application
│   ├── migrations/         # Database migrations
│   ├── utils/              # Utility modules
│   │   ├── document_processor.py  # Document processing
│   │   ├── vector_store.py        # FAISS vector store
│   │   └── rag_service.py         # RAG service
│   ├── models.py           # Database models
│   ├── serializers.py      # API serializers
│   ├── views.py            # API views
│   └── urls.py             # API URL routing
├── documents/              # Stored documents
├── vector_db/              # Vector database files
├── test_api.py             # API test script
└── requirements.txt        # Python dependencies
```

## Troubleshooting

1. **OpenAI API Key Issues**
   - Ensure your API key is correctly set in the `.env` file
   - Check for any console errors related to API authentication

2. **Document Upload Failures**
   - Check the file format (PDF and TXT are supported)
   - Check file permissions and size

3. **Query Issues**
   - Ensure at least one document has been successfully ingested
   - Check the logs for any errors during indexing

4. **Server Won't Start**
   - Check if port 8000 is already in use
   - Make sure all migrations have been applied

## Next Steps

- Deploy to a production server
- Add user authentication
- Implement more document formats
- Create a web UI for easier interaction 