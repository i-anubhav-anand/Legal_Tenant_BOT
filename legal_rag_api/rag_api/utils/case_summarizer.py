import logging
from django.conf import settings
import json
import os
from .rag_service import RAGService

logger = logging.getLogger(__name__)

class CaseSummarizer:
    """
    A class to generate legal summaries from conversations and their associated documents.
    This class analyzes the conversation history and documents to extract key legal issues
    and provide an initial legal analysis.
    """
    
    def __init__(self):
        """Initialize the CaseSummarizer with RAG service."""
        self.rag_service = RAGService()
    
    def generate_summary(self, conversation):
        """
        Generate a legal analysis summary from a conversation.
        
        Args:
            conversation: The Conversation object to analyze
            
        Returns:
            str: A formatted legal analysis summary
        """
        try:
            # Get all messages from the conversation
            messages = conversation.messages.all().order_by('created_at')
            
            if not messages.exists():
                return "No messages found in this conversation to analyze."
            
            # Extract the conversation history
            conversation_history = self._format_conversation_history(messages)
            
            # Get document references if any
            document_content = self._get_document_content(conversation)
            
            # Generate the analysis using RAG
            prompt = self._build_summary_prompt(conversation_history, document_content)
            
            # Use the RAG service to generate the analysis
            response = self.rag_service.query(
                query=prompt,
                kb_ids=settings.DEFAULT_KNOWLEDGE_BASE_IDS if hasattr(settings, 'DEFAULT_KNOWLEDGE_BASE_IDS') else []
            )
            
            return response
            
        except Exception as e:
            logger.error(f"Error generating case summary: {str(e)}")
            return f"Unable to generate legal analysis at this time. Error: {str(e)}"
    
    def _format_conversation_history(self, messages):
        """Format the conversation history into a readable string."""
        history = []
        
        for message in messages:
            sender = "Client" if message.is_from_user else "AI Assistant"
            history.append(f"{sender}: {message.content}")
        
        return "\n".join(history)
    
    def _get_document_content(self, conversation):
        """
        Extract content from documents associated with the conversation.
        
        Args:
            conversation: The Conversation object
            
        Returns:
            list: List of document contents with metadata
        """
        document_content = []
        
        try:
            # Get all documents associated with this conversation
            documents = conversation.documents.all()
            
            if not documents.exists():
                logger.info(f"No documents found for conversation: {conversation.id}")
                return document_content
            
            logger.info(f"Found {documents.count()} documents for conversation: {conversation.id}")
            
            # Process each document
            for document in documents:
                doc_info = {
                    "document_id": str(document.id),
                    "title": document.title,
                    "description": document.description or "",
                    "file_type": document.file_type,
                    "content": ""
                }
                
                # If the document has extracted data, use it
                if document.extracted_data:
                    doc_info["content"] = document.extracted_data
                else:
                    # Try to get content from chunks
                    chunks = document.chunks.all().order_by('chunk_number')
                    if chunks.exists():
                        chunk_contents = [chunk.content for chunk in chunks]
                        doc_info["content"] = "\n\n".join(chunk_contents)
                        doc_info["chunk_count"] = chunks.count()
                    else:
                        # If no chunks, try to read from file directly (if accessible)
                        if os.path.exists(document.file_path):
                            try:
                                with open(document.file_path, 'r', encoding='utf-8') as f:
                                    # Read first 10000 characters to avoid memory issues
                                    doc_info["content"] = f.read(10000)
                                    if len(doc_info["content"]) == 10000:
                                        doc_info["content"] += "... (content truncated)"
                            except Exception as e:
                                logger.warning(f"Could not read file {document.file_path}: {str(e)}")
                
                # Only add documents that have content
                if doc_info["content"]:
                    document_content.append(doc_info)
                    logger.info(f"Added document {document.title} to analysis")
                else:
                    logger.warning(f"No content found for document {document.id}: {document.title}")
            
        except Exception as e:
            logger.error(f"Error getting document content: {str(e)}")
        
        return document_content
    
    def _build_summary_prompt(self, conversation_history, document_content):
        """
        Build a prompt for the RAG system to generate a legal analysis.
        
        Args:
            conversation_history: Formatted conversation history
            document_content: List of document contents
            
        Returns:
            str: Prompt for RAG system
        """
        prompt = (
            "Based on the following conversation between a client and AI assistant, "
            "please provide a comprehensive legal analysis including:\n"
            "1. Key legal issues identified\n"
            "2. Potential legal claims or defenses\n"
            "3. Applicable laws or regulations\n"
            "4. Recommended next steps\n\n"
            "CONVERSATION HISTORY:\n"
            f"{conversation_history}\n\n"
        )
        
        if document_content:
            prompt += (
                "RELEVANT DOCUMENTS:\n"
                f"{json.dumps(document_content, indent=2)}\n\n"
            )
        
        prompt += (
            "Please format your analysis in a clear, structured manner suitable "
            "for a legal professional to review. Include only factual information "
            "and avoid making assumptions where information is lacking."
        )
        
        return prompt 