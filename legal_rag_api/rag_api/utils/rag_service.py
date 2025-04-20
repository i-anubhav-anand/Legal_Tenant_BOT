import os
import logging
import time
import openai
import uuid
from typing import List, Dict, Any, Tuple, Optional, Union
from .document_processor import DocumentProcessor
from .vector_store import FAISSVectorStore
from .web_scraper import WebScraper
from ..models import Document, Chunk, Query, KnowledgeBase, Conversation

logger = logging.getLogger(__name__)

class RAGService:
    """
    The main RAG service that coordinates document processing,
    vector storage, and LLM querying.
    """
    
    def __init__(self, 
                base_dir: str = "rag_api",
                default_index_name: str = "legal_docs"):
        """
        Initialize the RAG service
        
        Args:
            base_dir: Base directory for the application
            default_index_name: Default name for the vector index
        """
        self.base_dir = base_dir
        self.document_processor = DocumentProcessor(base_dir=base_dir)
        self.vector_store = FAISSVectorStore(base_dir=base_dir)
        self.web_scraper = WebScraper(output_dir=os.path.join(base_dir, "documents"))
        self.default_index_name = default_index_name
        
        # Try to load the default index if it exists
        try:
            self.vector_store.load_index(default_index_name)
            logger.info(f"Loaded existing index {default_index_name}")
        except Exception as e:
            logger.warning(f"Could not load index {default_index_name}: {str(e)}")
    
    def create_knowledge_base(self, name: str, description: str = None) -> KnowledgeBase:
        """
        Create a new knowledge base
        
        Args:
            name: Name of the knowledge base
            description: Optional description
            
        Returns:
            The created KnowledgeBase object
        """
        logger.info(f"Creating knowledge base: {name}")
        
        # Generate a unique folder name
        folder_name = f"kb_{name.lower().replace(' ', '_')}_{str(uuid.uuid4())[:8]}"
        
        # Create the knowledge base record
        kb = KnowledgeBase.objects.create(
            name=name,
            description=description,
            folder_name=folder_name
        )
        
        # Create the directory structure
        self.document_processor.get_knowledge_base_dir(folder_name)
        self.vector_store.get_kb_vector_path(folder_name)
        
        logger.info(f"Knowledge base created with ID: {kb.id}, folder: {folder_name}")
        
        return kb
    
    def get_knowledge_base(self, kb_id=None, name=None) -> Optional[KnowledgeBase]:
        """
        Get a knowledge base by ID or name
        
        Args:
            kb_id: Optional knowledge base ID
            name: Optional knowledge base name
            
        Returns:
            The knowledge base or None if not found
        """
        if kb_id:
            logger.info(f"Getting knowledge base by ID: {kb_id}")
            try:
                return KnowledgeBase.objects.get(id=kb_id)
            except KnowledgeBase.DoesNotExist:
                logger.warning(f"Knowledge base with ID {kb_id} not found")
                return None
        elif name:
            logger.info(f"Getting knowledge base by name: {name}")
            try:
                return KnowledgeBase.objects.get(name=name)
            except KnowledgeBase.DoesNotExist:
                logger.warning(f"Knowledge base with name {name} not found")
                return None
        return None
    
    def list_knowledge_bases(self) -> List[Dict[str, Any]]:
        """
        List all knowledge bases
        
        Returns:
            List of knowledge bases with document counts
        """
        logger.info("Listing all knowledge bases")
        kbs = KnowledgeBase.objects.all()
        result = []
        
        for kb in kbs:
            doc_count = kb.documents.count()
            logger.info(f"Knowledge base: {kb.name}, ID: {kb.id}, Documents: {doc_count}")
            result.append({
                'id': kb.id,
                'name': kb.name,
                'description': kb.description,
                'folder_name': kb.folder_name,
                'document_count': doc_count,
                'created_at': kb.created_at
            })
            
        logger.info(f"Found {len(result)} knowledge bases")    
        return result
    
    def ingest_url(self, url: str, title: str, description: str = None, kb_id: str = None, conversation_id: str = None) -> Document:
        """
        Ingest content from a URL into the RAG system
        
        Args:
            url: URL to ingest
            title: Document title
            description: Document description (optional)
            kb_id: Knowledge base ID (optional)
            conversation_id: Conversation ID to associate with document (optional)
            
        Returns:
            The created Document object
        """
        try:
            logger.info(f"Starting URL ingestion: {url}")
            start_time = time.time()
            
            # Get knowledge base if specified
            kb = None
            kb_folder = None
            if kb_id:
                logger.info(f"Looking up knowledge base with ID: {kb_id}")
                kb = self.get_knowledge_base(kb_id=kb_id)
                if not kb:
                    error_msg = f"Knowledge base with ID {kb_id} not found"
                    logger.error(error_msg)
                    raise ValueError(error_msg)
                kb_folder = kb.folder_name
                logger.info(f"Found knowledge base: {kb.name}, folder: {kb_folder}")
            
            # Get conversation if specified
            conversation = None
            if conversation_id:
                logger.info(f"Looking up conversation with ID: {conversation_id}")
                try:
                    conversation = Conversation.objects.get(id=conversation_id)
                    logger.info(f"Found conversation: {conversation.title}")
                except Exception as e:
                    logger.warning(f"Conversation with ID {conversation_id} not found: {str(e)}")
            
            # Extract content from URL
            logger.info(f"Extracting content from URL: {url}")
            extraction_start = time.time()
            
            try:
                content, file_path = self.web_scraper.extract_content_from_url(url, rag_folder=kb_folder)
                extraction_time = time.time() - extraction_start
                logger.info(f"Content extracted in {extraction_time:.2f} seconds")
                logger.info(f"Extracted content length: {len(content)} characters")
                logger.info(f"Content saved to: {file_path}")
            except Exception as e:
                logger.error(f"Error extracting content from URL: {str(e)}")
                raise Exception(f"Failed to extract content from URL: {str(e)}")
            
            # Determine file type
            file_type = 'txt'  # Web content is always saved as text
            
            # Create document record
            logger.info(f"Creating document record in database with title: {title}")
            document = Document.objects.create(
                knowledge_base=kb,
                conversation=conversation,
                title=title,
                description=description,
                file_path=file_path,
                file_type=file_type,
                source_url=url,
                original_filename=os.path.basename(file_path),
                status='processing'
            )
            
            # Process the document to extract chunks
            logger.info(f"Processing document to extract chunks")
            chunking_start = time.time()
            
            # Use the already extracted content instead of re-processing if possible
            if content and len(content) > 0:
                logger.info("Using already extracted content for chunking")
                chunks_text = self.document_processor.chunk_text_for_legal_documents(content)
            else:
                logger.info("Re-processing document from file to extract chunks")
                chunks_text = self.document_processor.process_document(file_path, file_type)
                
            chunking_time = time.time() - chunking_start
            logger.info(f"Chunking completed in {chunking_time:.2f} seconds")
            logger.info(f"Created {len(chunks_text)} chunks")
            
            # Store chunks in the database
            logger.info(f"Storing chunks in database and creating embeddings")
            self._create_chunks(document, chunks_text, kb_folder)
            
            total_time = time.time() - start_time
            logger.info(f"URL ingestion completed in {total_time:.2f} seconds")
            logger.info(f"Document status: {document.status}")
            
            return document
            
        except Exception as e:
            logger.error(f"Error ingesting URL: {str(e)}")
            
            # If document was created, update its status
            if 'document' in locals():
                document.status = 'failed'
                document.save()
                logger.info(f"Updated document {document.id} status to 'failed'")
                
            raise
    
    def ingest_document(self, file_content: bytes, original_filename: str, 
                       title: str, description: str = None, kb_id: str = None, conversation_id: str = None) -> Document:
        """
        Ingest a document into the RAG system
        
        Args:
            file_content: Binary content of the file
            original_filename: Original filename with extension
            title: Document title
            description: Document description (optional)
            kb_id: Knowledge base ID (optional)
            conversation_id: Conversation ID to associate with document (optional)
            
        Returns:
            Document object that was created
        """
        try:
            logger.info(f"Starting document ingestion: {original_filename}")
            start_time = time.time()
            
            # Get knowledge base if specified
            kb = None
            kb_folder = None
            if kb_id:
                logger.info(f"Looking up knowledge base with ID: {kb_id}")
                kb = self.get_knowledge_base(kb_id=kb_id)
                if not kb:
                    error_msg = f"Knowledge base with ID {kb_id} not found"
                    logger.error(error_msg)
                    raise ValueError(error_msg)
                kb_folder = kb.folder_name
                logger.info(f"Found knowledge base: {kb.name}, folder: {kb_folder}")
            
            # Get conversation if specified
            conversation = None
            if conversation_id:
                logger.info(f"Looking up conversation with ID: {conversation_id}")
                try:
                    conversation = Conversation.objects.get(id=conversation_id)
                    logger.info(f"Found conversation: {conversation.title}")
                except Exception as e:
                    logger.warning(f"Conversation with ID {conversation_id} not found: {str(e)}")
            
            # Determine file type from extension
            file_extension = os.path.splitext(original_filename)[1].lower()
            file_type = file_extension.lstrip('.')
            logger.info(f"Determined file type: {file_type}")
            
            # Store the document file
            logger.info(f"Storing document file (size: {len(file_content)} bytes)")
            store_start = time.time()
            file_path = self.document_processor.store_document(
                file_content, original_filename, kb_folder=kb_folder
            )
            store_time = time.time() - store_start
            logger.info(f"Document stored in {store_time:.2f} seconds at: {file_path}")
            
            # Create document record
            logger.info(f"Creating document record in database with title: {title}")
            document = Document.objects.create(
                knowledge_base=kb,
                conversation=conversation,
                title=title,
                description=description,
                file_path=file_path,
                file_type=file_type,
                original_filename=original_filename,
                status='processing'
            )
            
            # Process the document to extract chunks
            logger.info(f"Processing document to extract chunks")
            chunking_start = time.time()
            chunks_text = self.document_processor.process_document(file_path, file_type)
            chunking_time = time.time() - chunking_start
            logger.info(f"Chunking completed in {chunking_time:.2f} seconds")
            logger.info(f"Created {len(chunks_text)} chunks")
            
            # Store chunks in the database
            logger.info(f"Storing chunks in database and creating embeddings")
            embedding_start = time.time()
            self._create_chunks(document, chunks_text, kb_folder)
            embedding_time = time.time() - embedding_start
            logger.info(f"Embedding and indexing completed in {embedding_time:.2f} seconds")
            
            total_time = time.time() - start_time
            logger.info(f"Document ingestion completed in {total_time:.2f} seconds")
            logger.info(f"Document status: {document.status}")
            
            return document
            
        except Exception as e:
            logger.error(f"Error ingesting document: {str(e)}")
            
            # If document was created, update its status
            if 'document' in locals():
                document.status = 'failed'
                document.error_message = str(e)
                document.save()
                logger.info(f"Updated document {document.id} status to 'failed'")
                
            raise
    
    def _create_chunks(self, document: Document, chunks_text: List[str], kb_folder: str = None) -> None:
        """
        Create chunks for a document and index them
        
        Args:
            document: Document object
            chunks_text: List of text chunks
            kb_folder: Optional knowledge base folder name
        """
        logger.info(f"Creating {len(chunks_text)} chunks for document {document.id}")
        chunk_start = time.time()
        
        # Store chunks in the database
        chunk_objects = []
        for idx, chunk_text in enumerate(chunks_text):
            logger.info(f"Creating chunk {idx+1}/{len(chunks_text)} for document {document.id}")
            
            # Create chunk metadata
            metadata = {
                'document_id': str(document.id),
                'document_title': document.title,
                'chunk_index': idx,
                'original_filename': document.original_filename,
                'kb_folder': kb_folder
            }
            
            # Create chunk in database - using chunk_number instead of chunk_index
            chunk = Chunk.objects.create(
                document=document,
                content=chunk_text,
                chunk_number=idx,  # Changed from chunk_index to chunk_number
                metadata=metadata
            )
            chunk_objects.append(chunk)
            logger.info(f"Chunk {idx+1} created with ID: {chunk.id}, length: {len(chunk_text)} characters")
        
        chunk_db_time = time.time() - chunk_start
        logger.info(f"Created {len(chunk_objects)} chunks in database in {chunk_db_time:.2f} seconds")
        
        # Create or update vector index
        logger.info("Preparing to update vector index")
        all_chunks = []
        all_metadatas = []
        
        # Get existing chunks if the index exists
        load_start = time.time()
        index_loaded = False
        if kb_folder:
            logger.info(f"Loading existing index for knowledge base: {kb_folder}")
            index_loaded = self.vector_store.load_index(self.default_index_name, kb_folder)
        else:
            logger.info("Loading existing main index")
            index_loaded = self.vector_store.load_index(self.default_index_name)
            
        if index_loaded and self.vector_store.index is not None:
            logger.info(f"Index loaded successfully with {self.vector_store.embeddings_count} existing embeddings")
            all_metadatas = self.vector_store.chunk_metadatas
            
            # Retrieve chunk texts by querying the database
            logger.info("Retrieving existing chunks from database")
            existing_chunk_ids = [meta.get('chunk_id') for meta in all_metadatas if 'chunk_id' in meta]
            logger.info(f"Found {len(existing_chunk_ids)} existing chunk IDs in metadata")
            
            existing_chunks = Chunk.objects.filter(id__in=existing_chunk_ids)
            logger.info(f"Retrieved {existing_chunks.count()} existing chunks from database")
            
            # Create mapping of chunk_id to content
            chunk_content_map = {str(chunk.id): chunk.content for chunk in existing_chunks}
            
            # Create list of chunk texts in the same order as metadatas
            for meta in all_metadatas:
                chunk_id = meta.get('chunk_id')
                if chunk_id in chunk_content_map:
                    all_chunks.append(chunk_content_map[chunk_id])
                else:
                    # Handle missing chunks (this shouldn't happen, but just in case)
                    logger.warning(f"Missing content for chunk ID: {chunk_id}")
                    all_chunks.append("")
        else:
            logger.info("No existing index found or index couldn't be loaded")
            
        load_time = time.time() - load_start
        logger.info(f"Loaded existing index data in {load_time:.2f} seconds")
        
        # Add the new chunks
        logger.info(f"Adding {len(chunk_objects)} new chunks to index")
        for chunk in chunk_objects:
            all_chunks.append(chunk.content)
            
            # Update metadata with chunk ID
            chunk_metadata = chunk.metadata.copy()
            chunk_metadata['chunk_id'] = str(chunk.id)
            all_metadatas.append(chunk_metadata)
            
            # Mark chunk as having its embedding stored
            chunk.embedding_stored = True
            chunk.save()
            logger.info(f"Added chunk {chunk.chunk_number} to index and marked as embedded")  # Changed from chunk_index to chunk_number
        
        # Create or update the vector index
        logger.info(f"Creating/updating vector index with total {len(all_chunks)} chunks")
        index_start = time.time()
        self.vector_store.create_index(
            chunks=all_chunks,
            metadatas=all_metadatas,
            index_name=self.default_index_name,
            kb_folder=kb_folder
        )
        index_time = time.time() - index_start
        logger.info(f"Vector index created/updated in {index_time:.2f} seconds")
        
        # Update document status
        document.status = 'indexed'
        document.save()
        logger.info(f"Updated document {document.id} status to 'indexed'")
    
    def query_rag(self, query_text: str, top_k: int = 5, 
                 temperature: float = 0.0, kb_id: str = None, conversation_id: str = None,
                 include_global_kb: bool = True) -> Dict[str, Any]:
        """
        Perform a RAG query using both conversation-specific and global reference documents
        
        Args:
            query_text: Query text
            top_k: Number of chunks to retrieve
            temperature: Temperature for the LLM
            kb_id: Knowledge base ID (optional)
            conversation_id: Conversation ID (optional)
            include_global_kb: Include global knowledge base in search
            
        Returns:
            Dictionary with query results and source information
        """
        try:
            logger.info(f"Querying RAG system: '{query_text}'")
            logger.info(f"Parameters: top_k={top_k}, temperature={temperature}, kb_id={kb_id}, conversation_id={conversation_id}")
            
            # Set up search context
            search_contexts = []
            kb_folders_used = set()
            
            # If kb_id is specified, add it to search contexts
            if kb_id:
                logger.info(f"Looking up knowledge base with ID: {kb_id}")
                kb = self.get_knowledge_base(kb_id=kb_id)
                if kb:
                    search_contexts.append({
                        "kb_folder": kb.folder_name,
                        "name": kb.name,
                        "top_k": max(2, top_k // 2)  # Allocate at least 2 results or half of top_k
                    })
                    kb_folders_used.add(kb.folder_name)
                    logger.info(f"Added specified knowledge base to search contexts: {kb.name}")
                else:
                    logger.warning(f"Knowledge base with ID {kb_id} not found")
            
            # If conversation_id is specified, find all documents attached to this conversation
            conversation = None
            if conversation_id:
                logger.info(f"Looking up conversation with ID: {conversation_id}")
                try:
                    conversation = Conversation.objects.get(id=conversation_id)
                    logger.info(f"Found conversation: {conversation.title}")
                    
                    # Get documents for this conversation
                    conversation_docs = Document.objects.filter(conversation=conversation)
                    logger.info(f"Found {conversation_docs.count()} documents for conversation")
                    
                    # Group documents by knowledge base
                    conversation_kbs = {}
                    for doc in conversation_docs:
                        if doc.knowledge_base and doc.status == 'indexed':
                            kb_folder = doc.knowledge_base.folder_name
                            if kb_folder not in kb_folders_used:
                                if kb_folder not in conversation_kbs:
                                    conversation_kbs[kb_folder] = {
                                        "name": doc.knowledge_base.name,
                                        "count": 0
                                    }
                                conversation_kbs[kb_folder]["count"] += 1
                    
                    # Add each conversation KB to search contexts
                    for kb_folder, kb_info in conversation_kbs.items():
                        search_contexts.append({
                            "kb_folder": kb_folder,
                            "name": kb_info["name"],
                            "top_k": max(2, top_k // (len(conversation_kbs) + (1 if include_global_kb else 0)))
                        })
                        kb_folders_used.add(kb_folder)
                        logger.info(f"Added conversation knowledge base to search: {kb_info['name']}")
                except Exception as e:
                    logger.warning(f"Conversation with ID {conversation_id} not found: {str(e)}")
            
            # If no specific contexts found and include_global_kb is True, default to global
            if not search_contexts and include_global_kb:
                search_contexts.append({
                    "kb_folder": None,  # Main knowledge base
                    "name": "Global Knowledge Base",
                    "top_k": top_k
                })
                logger.info("Using global knowledge base as no specific KBs found")
            elif include_global_kb:
                # Add global KB with remaining allocation
                remaining_results = top_k - sum(ctx["top_k"] for ctx in search_contexts)
                if remaining_results > 0:
                    search_contexts.append({
                        "kb_folder": None,
                        "name": "Global Knowledge Base",
                        "top_k": remaining_results
                    })
                    logger.info(f"Added global knowledge base with {remaining_results} results allocation")
            
            # Save the query for analytics
            logger.info("Saving query to database")
            global_kb = None
            if kb_id:
                try:
                    global_kb = KnowledgeBase.objects.get(id=kb_id)
                except Exception:
                    pass
                
            query_obj = Query.objects.create(
                query_text=query_text,
                knowledge_base=global_kb,
                conversation=conversation
            )
            logger.info(f"Query saved with ID: {query_obj.id}")
            
            # Execute searches across all contexts
            all_results = []
            retrieval_start = time.time()
            
            for ctx in search_contexts:
                # Load the appropriate index
                logger.info(f"Searching in {ctx['name']} with top_k={ctx['top_k']}")
                if ctx["kb_folder"]:
                    index_loaded = self.vector_store.load_index(self.default_index_name, ctx["kb_folder"])
                else:
                    index_loaded = self.vector_store.load_index(self.default_index_name)
                    
                if index_loaded:
                    # Search this context
                    results = self.vector_store.search(query_text, top_k=ctx["top_k"])
                    if results:
                        for result in results:
                            result["source_kb"] = ctx["name"]
                        all_results.extend(results)
                        logger.info(f"Found {len(results)} results in {ctx['name']}")
                else:
                    logger.warning(f"Could not load index for {ctx['name']}")
            
            # Sort by relevance and take top_k
            all_results = sorted(all_results, key=lambda x: x.get('score', 0), reverse=True)[:top_k]
            logger.info(f"Combined and sorted results, got {len(all_results)} total chunks")
            
            retrieval_time = time.time() - retrieval_start
            
            if not all_results:
                error_msg = "No relevant information found in any knowledge base."
                logger.error(error_msg)
                return {
                    'query': query_text,
                    'error': error_msg
                }
            
            # Get the chunk texts for the results
            chunk_ids = [result.get('chunk_id') for result in all_results if 'chunk_id' in result]
            chunks = Chunk.objects.filter(id__in=chunk_ids)
            
            # Create mapping of chunk_id to content
            chunk_content_map = {str(chunk.id): chunk.content for chunk in chunks}
            
            # Build the context for the LLM
            logger.info("Formatting search results for LLM prompt")
            context_parts = []
            sources = []
            
            for result in all_results:
                chunk_id = result.get('chunk_id')
                if chunk_id in chunk_content_map:
                    context_parts.append(f"Document: {result['document_title']} (Source: {result.get('source_kb', 'Unknown')})\nChunk {result['chunk_index']}:\n{chunk_content_map[chunk_id]}\n")
                    sources.append({
                        'document_title': result['document_title'],
                        'document_id': result['document_id'],
                        'chunk_index': result['chunk_index'],
                        'relevance_score': result['score'],
                        'source_kb': result.get('source_kb', 'Unknown')
                    })
            
            context = "\n\n".join(context_parts)
            logger.info(f"Retrieval completed in {retrieval_time:.2f} seconds")
            
            # Query the LLM with the context
            logger.info(f"Generating answer with LLM (temperature={temperature})")
            llm_start = time.time()
            
            system_prompt = """You are a legal assistant AI. Answer the question based only on the provided context.
            If you don't know the answer or if the context doesn't provide sufficient information, say so clearly.
            Do not make up information. Use a professional, factual tone appropriate for legal contexts.
            
            IMPORTANT: Always cite your sources at the end of your response using this specific format:
            
            **Sources:**
            - {Document Title} (Source: {Source KB})
            - {Document Title} (Source: {Source KB})
            
            Make sure to include all relevant sources used in your answer, even if you reference the same document multiple times."""
            
            prompt = f"""
            Context information:
            {context}
            
            Question: {query_text}
            
            Answer the question based only on the provided context. Be concise and precise.
            Remember to include the sources at the end of your response using the specified format.
            """
            
            # Call the OpenAI API
            logger.info("Calling OpenAI API")
            completion = openai.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                temperature=temperature
            )
            
            answer = completion.choices[0].message.content
            llm_time = time.time() - llm_start
            logger.info(f"LLM answer generated in {llm_time:.2f} seconds")
            
            # Update query with response
            query_obj.response_text = answer
            query_obj.save()
            logger.info(f"Updated query {query_obj.id} with response")
            
            # Return the result with sources
            total_time = time.time() - retrieval_start
            response = {
                "query": query_text,
                "answer": answer,
                "sources": sources,
                "timing": {
                    "retrieval_time": retrieval_time,
                    "llm_time": llm_time,
                    "total_time": retrieval_time + llm_time
                }
            }
            
            # Include conversation ID if provided
            if conversation_id:
                response["conversation_id"] = conversation_id
            
            logger.info(f"RAG query completed in {total_time:.2f} seconds")
            return response
        
        except Exception as e:
            logger.error(f"Error in RAG query: {str(e)}")
            return {
                "query": query_text,
                "error": str(e)
            } 