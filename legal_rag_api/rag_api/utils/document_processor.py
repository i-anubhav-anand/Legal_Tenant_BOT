import os
import uuid
import fitz  # PyMuPDF
from langchain.text_splitter import RecursiveCharacterTextSplitter
import re
import shutil
from typing import List, Dict, Any, Tuple, Optional
import logging
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

class DocumentProcessor:
    """
    Handles document processing for RAG system, including:
    - Document text extraction
    - Semantic chunking for legal documents
    - Document storage management
    """
    
    def __init__(self, base_dir: str = "rag_api"):
        """Initialize the document processor"""
        self.base_dir = base_dir
        self.documents_dir = os.path.join(base_dir, "documents")
        self.temp_dir = os.path.join(base_dir, "temp")
        
        # Ensure directories exist
        os.makedirs(self.documents_dir, exist_ok=True)
        os.makedirs(self.temp_dir, exist_ok=True)
    
    def get_knowledge_base_dir(self, kb_folder: str) -> str:
        """
        Get the directory for a knowledge base
        
        Args:
            kb_folder: Knowledge base folder name
            
        Returns:
            Path to the knowledge base directory
        """
        kb_dir = os.path.join(self.temp_dir, kb_folder)
        os.makedirs(kb_dir, exist_ok=True)
        return kb_dir
    
    def store_document(self, file_content: bytes, original_filename: str, kb_folder: str = None) -> str:
        """
        Store a document in the filesystem
        
        Args:
            file_content: The binary content of the file
            original_filename: Original filename with extension
            kb_folder: Optional knowledge base folder name
            
        Returns:
            The path where the file was stored
        """
        file_extension = os.path.splitext(original_filename)[1].lower()
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        
        # Determine storage directory based on KB folder
        if kb_folder:
            storage_dir = self.get_knowledge_base_dir(kb_folder)
        else:
            storage_dir = self.documents_dir
            
        file_path = os.path.join(storage_dir, unique_filename)
        
        logger.info(f"Storing document: {original_filename} (size: {len(file_content)} bytes)")
        
        with open(file_path, 'wb') as f:
            f.write(file_content)
        
        logger.info(f"Document stored at: {file_path}")
        return file_path
    
    def copy_document_to_kb(self, source_path: str, kb_folder: str) -> str:
        """
        Copy a document to a knowledge base folder
        
        Args:
            source_path: Path to the source document
            kb_folder: Knowledge base folder name
            
        Returns:
            The new path in the knowledge base
        """
        # Ensure KB directory exists
        kb_dir = self.get_knowledge_base_dir(kb_folder)
        
        # Create unique filename
        filename = os.path.basename(source_path)
        if not filename.startswith(str(uuid.uuid4())[:8]):
            file_extension = os.path.splitext(filename)[1]
            filename = f"{uuid.uuid4()}{file_extension}"
        
        destination_path = os.path.join(kb_dir, filename)
        shutil.copy2(source_path, destination_path)
        
        return destination_path
    
    def extract_text_from_pdf(self, file_path: str) -> str:
        """
        Extract text content from a PDF file
        
        Args:
            file_path: Path to the PDF file
            
        Returns:
            Extracted text content
        """
        try:
            logger.info(f"Extracting text from PDF: {file_path}")
            pdf_document = fitz.open(file_path)
            text_content = ""
            
            logger.info(f"PDF has {pdf_document.page_count} pages")
            for page_number in range(pdf_document.page_count):
                logger.info(f"Processing page {page_number+1}/{pdf_document.page_count}")
                page = pdf_document[page_number]
                page_text = page.get_text()
                text_content += page_text
                logger.info(f"Page {page_number+1} text extracted: {len(page_text)} characters")
                
            pdf_document.close()
            logger.info(f"PDF text extraction complete. Total size: {len(text_content)} characters")
            return text_content
        except Exception as e:
            logger.error(f"Error extracting text from PDF: {str(e)}")
            raise Exception(f"Error extracting text from PDF: {str(e)}")
    
    def chunk_text_for_legal_documents(self, text: str, 
                                      chunk_size: int = 750, 
                                      chunk_overlap: int = 150) -> List[str]:
        """
        Split text into semantic chunks optimized for legal documents.
        
        Legal documents often have sections, paragraphs, etc. This method attempts to
        create chunks that respect these boundaries while maintaining context.
        
        Args:
            text: The text to chunk
            chunk_size: Target size of each chunk
            chunk_overlap: Overlap between chunks
            
        Returns:
            List of text chunks
        """
        logger.info(f"Chunking text for legal document: {len(text)} characters, chunk_size={chunk_size}, chunk_overlap={chunk_overlap}")
        
        # First clean the text - remove excessive whitespace
        text = re.sub(r'\s+', ' ', text).strip()
        logger.info(f"Text cleaned. New size: {len(text)} characters")
        
        # Skip empty content
        if not text.strip():
            logger.warning("Empty text provided for chunking, returning empty list")
            return []
        
        # Use RecursiveCharacterTextSplitter with appropriate separators for legal docs
        # Legal docs often use section headers, numbered paragraphs, etc.
        text_splitter = RecursiveCharacterTextSplitter(
            separators=[
                "\n\n",  # Double line breaks (paragraphs)
                "\n",    # Single line breaks
                ". ",    # End of sentences 
                ", ",    # Clauses
                " ",     # Words
                ""       # Characters
            ],
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap
        )
        
        # Start chunking
        logger.info("Starting text chunking process...")
        chunks = text_splitter.split_text(text)
        
        # Filter out empty chunks or chunks with only whitespace
        chunks = [chunk for chunk in chunks if chunk.strip()]
        
        # Log details about the chunks
        logger.info(f"Chunking complete. Created {len(chunks)} non-empty chunks")
        for i, chunk in enumerate(chunks):
            logger.info(f"Chunk {i+1}/{len(chunks)}: {len(chunk)} characters, starts with: '{chunk[:50]}...'")
        
        return chunks
    
    def process_document(self, file_path: str, file_type: str) -> List[str]:
        """
        Process a document file by extracting text and chunking it
        
        Args:
            file_path: Path to the document file
            file_type: Type of file (PDF, TXT, etc.)
        
        Returns:
            List of text chunks
        """
        logger.info(f"Processing document: {file_path}, type: {file_type}")
        
        if file_type.lower() == 'pdf':
            text = self.extract_text_from_pdf(file_path)
        elif file_type.lower() == 'txt':
            logger.info(f"Reading text file: {file_path}")
            with open(file_path, 'r', encoding='utf-8') as f:
                text = f.read()
            logger.info(f"Text file read: {len(text)} characters")
        else:
            error_msg = f"Unsupported file type: {file_type}"
            logger.error(error_msg)
            raise ValueError(error_msg)
        
        logger.info(f"Document text extracted. Size: {len(text)} characters. Starting chunking...")
        chunks = self.chunk_text_for_legal_documents(text)
        logger.info(f"Document processing complete. Created {len(chunks)} chunks")
        return chunks
    
    def get_all_knowledge_bases(self) -> List[str]:
        """
        Get a list of all knowledge base folders
        
        Returns:
            List of knowledge base folder names
        """
        if not os.path.exists(self.temp_dir):
            return []
        
        # Get all subdirectories in the temp directory
        return [d for d in os.listdir(self.temp_dir) 
                if os.path.isdir(os.path.join(self.temp_dir, d))] 