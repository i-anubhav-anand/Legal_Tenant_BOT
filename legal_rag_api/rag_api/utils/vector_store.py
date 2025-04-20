import os
import numpy as np
import faiss
import pickle
import openai
from typing import List, Dict, Any, Tuple, Optional
import json
import logging
from datetime import datetime
import time

logger = logging.getLogger(__name__)

class FAISSVectorStore:
    """
    A class for managing document embeddings using FAISS.
    Handles creation, saving, loading, and querying of vector indices.
    """
    
    def __init__(self, base_dir: str = "rag_api"):
        """
        Initialize the FAISS vector store.
        
        Args:
            base_dir: Base directory for the application
        """
        self.base_dir = base_dir
        self.vector_db_path = os.path.join(base_dir, "vector_db")
        os.makedirs(self.vector_db_path, exist_ok=True)
        
        # Initialize index and metadata storage
        self.index = None
        self.chunk_metadatas = []
        self.embeddings_count = 0
        self.index_name = None
        
        logger.info(f"Initialized FAISSVectorStore with base dir: {base_dir}")
        logger.info(f"Vector DB path: {self.vector_db_path}")
    
    def get_kb_vector_path(self, kb_folder: str) -> str:
        """
        Get the vector DB path for a specific knowledge base
        
        Args:
            kb_folder: Knowledge base folder name
            
        Returns:
            Path to the knowledge base vector DB
        """
        kb_vector_path = os.path.join(self.vector_db_path, kb_folder)
        os.makedirs(kb_vector_path, exist_ok=True)
        return kb_vector_path
        
    def get_embedding(self, text: str) -> List[float]:
        """
        Get embedding for a text using OpenAI's embeddings API.
        
        Args:
            text: Text to embed
            
        Returns:
            Embedding vector as a list of floats
        """
        try:
            logger.info(f"Generating embedding for text of length: {len(text)} characters")
            start_time = time.time()
            
            response = openai.embeddings.create(
                input=text,
                model="text-embedding-3-small"
            )
            
            embedding = response.data[0].embedding
            elapsed_time = time.time() - start_time
            
            logger.info(f"Embedding generated successfully. Dimension: {len(embedding)}, Time taken: {elapsed_time:.2f} seconds")
            return embedding
        except Exception as e:
            logger.error(f"Error generating embedding: {str(e)}")
            raise
            
    def create_index(self, chunks: List[str], metadatas: List[Dict[str, Any]], index_name: str, kb_folder: str = None) -> None:
        """
        Create a new FAISS index from chunks.
        
        Args:
            chunks: List of text chunks to index
            metadatas: List of metadata dictionaries for each chunk
            index_name: Name for the index
            kb_folder: Optional knowledge base folder name
        """
        if not chunks:
            raise ValueError("No chunks provided for indexing")
        
        logger.info(f"Creating index '{index_name}' with {len(chunks)} chunks" + 
                   (f" in knowledge base '{kb_folder}'" if kb_folder else ""))
        
        # Generate embeddings
        logger.info("Starting embedding generation process...")
        embeddings = []
        total_start_time = time.time()
        
        for i, chunk in enumerate(chunks):
            logger.info(f"Generating embedding for chunk {i+1}/{len(chunks)} (length: {len(chunk)} chars)")
            start_time = time.time()
            embedding = self.get_embedding(chunk)
            elapsed = time.time() - start_time
            embeddings.append(embedding)
            logger.info(f"Embedding {i+1} completed in {elapsed:.2f} seconds")
        
        total_embed_time = time.time() - total_start_time
        logger.info(f"All embeddings generated in {total_embed_time:.2f} seconds")
        
        # Create a FAISS index
        dimension = len(embeddings[0])
        logger.info(f"Creating FAISS index with dimension {dimension}")
        self.index = faiss.IndexFlatL2(dimension)
        
        # Add embeddings to index
        logger.info("Adding embeddings to FAISS index...")
        embeddings_np = np.array(embeddings).astype('float32')
        self.index.add(embeddings_np)
        
        # Store metadata
        self.chunk_metadatas = metadatas
        self.embeddings_count = len(embeddings)
        self.index_name = index_name
        
        logger.info(f"Index created successfully with {self.embeddings_count} vectors")
        
        # Save index and metadata
        logger.info("Saving index and metadata to disk...")
        self._save_index(kb_folder)
        
    def _save_index(self, kb_folder: str = None) -> None:
        """
        Save the current index and metadata to disk
        
        Args:
            kb_folder: Optional knowledge base folder name
        """
        if self.index is None or self.index_name is None:
            raise ValueError("No index created yet")
            
        # Determine the vector store path
        if kb_folder:
            vector_store_path = self.get_kb_vector_path(kb_folder)
        else:
            vector_store_path = self.vector_db_path
            
        # Create unique filename based on index name and timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        index_filename = f"{self.index_name}_{timestamp}.index"
        metadata_filename = f"{self.index_name}_{timestamp}_metadata.pkl"
        
        logger.info(f"Saving index to {vector_store_path}")
        logger.info(f"Index filename: {index_filename}")
        logger.info(f"Metadata filename: {metadata_filename}")
        
        # Save the index
        index_path = os.path.join(vector_store_path, index_filename)
        start_time = time.time()
        faiss.write_index(self.index, index_path)
        index_save_time = time.time() - start_time
        logger.info(f"Index saved in {index_save_time:.2f} seconds")
        
        # Save the metadata
        metadata_path = os.path.join(vector_store_path, metadata_filename)
        metadata = {
            'chunk_metadatas': self.chunk_metadatas,
            'embeddings_count': self.embeddings_count,
            'index_name': self.index_name
        }
        
        logger.info(f"Saving metadata with {len(self.chunk_metadatas)} chunk records")
        with open(metadata_path, 'wb') as f:
            pickle.dump(metadata, f)
            
        # Save the latest index info
        info_path = os.path.join(vector_store_path, f"{self.index_name}_latest.json")
        info = {
            'index_file': index_filename,
            'metadata_file': metadata_filename,
            'timestamp': timestamp,
            'embeddings_count': self.embeddings_count
        }
        
        with open(info_path, 'w') as f:
            json.dump(info, f)
        
        logger.info(f"Saved index to {index_path} with {self.embeddings_count} embeddings")
        
    def load_index(self, index_name: str, kb_folder: str = None) -> bool:
        """
        Load the latest index for a given name
        
        Args:
            index_name: Name of the index to load
            kb_folder: Optional knowledge base folder name
            
        Returns:
            True if loaded successfully, False otherwise
        """
        # Determine the vector store path
        if kb_folder:
            vector_store_path = self.get_kb_vector_path(kb_folder)
            logger.info(f"Loading index '{index_name}' from knowledge base '{kb_folder}'")
        else:
            vector_store_path = self.vector_db_path
            logger.info(f"Loading index '{index_name}' from main vector store")
            
        info_path = os.path.join(vector_store_path, f"{index_name}_latest.json")
        
        try:
            with open(info_path, 'r') as f:
                info = json.load(f)
                
            index_path = os.path.join(vector_store_path, info['index_file'])
            metadata_path = os.path.join(vector_store_path, info['metadata_file'])
            
            logger.info(f"Found latest index file: {info['index_file']}")
            logger.info(f"Found latest metadata file: {info['metadata_file']}")
            logger.info(f"Index timestamp: {info['timestamp']}")
            
            # Load index
            logger.info("Loading FAISS index...")
            start_time = time.time()
            self.index = faiss.read_index(index_path)
            load_time = time.time() - start_time
            logger.info(f"FAISS index loaded in {load_time:.2f} seconds")
            
            # Load metadata
            logger.info("Loading metadata...")
            with open(metadata_path, 'rb') as f:
                metadata = pickle.load(f)
                self.chunk_metadatas = metadata['chunk_metadatas']
                self.embeddings_count = metadata['embeddings_count']
                self.index_name = metadata['index_name']
            
            logger.info(f"Loaded index with {self.embeddings_count} embeddings")
            logger.info(f"Loaded {len(self.chunk_metadatas)} chunk metadata records")
                
            return True
        except (FileNotFoundError, json.JSONDecodeError, pickle.PickleError) as e:
            logger.error(f"Error loading index {index_name}: {str(e)}")
            return False
            
    def search(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """
        Search the index for similar chunks based on query
        
        Args:
            query: Query text
            top_k: Number of results to return
            
        Returns:
            List of dictionaries with chunk metadata and scores
        """
        if self.index is None:
            raise ValueError("No index loaded")
            
        logger.info(f"Searching for query: '{query[:50]}...' (length: {len(query)})")
        logger.info(f"Requested top_k: {top_k}")
        
        # Generate query embedding
        logger.info("Generating query embedding...")
        start_time = time.time()
        query_embedding = self.get_embedding(query)
        query_embedding_np = np.array([query_embedding]).astype('float32')
        embedding_time = time.time() - start_time
        logger.info(f"Query embedding generated in {embedding_time:.2f} seconds")
        
        # Search the index
        logger.info("Searching FAISS index...")
        search_start = time.time()
        distances, indices = self.index.search(query_embedding_np, top_k)
        search_time = time.time() - search_start
        logger.info(f"FAISS search completed in {search_time:.2f} seconds")
        
        # Prepare results
        logger.info("Preparing search results with metadata...")
        results = []
        for i, idx in enumerate(indices[0]):
            if idx < len(self.chunk_metadatas) and idx >= 0:
                # Add the score to the metadata
                result = self.chunk_metadatas[idx].copy()
                result['score'] = float(distances[0][i])
                results.append(result)
                logger.info(f"Result {i+1}: chunk_index={result.get('chunk_index')}, score={result['score']:.4f}")
                
        logger.info(f"Returned {len(results)} results")
        return results
        
    def get_all_kb_indices(self) -> Dict[str, List[str]]:
        """
        Get all knowledge base indices
        
        Returns:
            Dictionary of knowledge base folder names and their indices
        """
        result = {}
        
        # Check the main vector_db path
        main_indices = self._get_indices_in_path(self.vector_db_path)
        if main_indices:
            result['main'] = main_indices
            
        # Check subdirectories
        for item in os.listdir(self.vector_db_path):
            full_path = os.path.join(self.vector_db_path, item)
            if os.path.isdir(full_path):
                kb_indices = self._get_indices_in_path(full_path)
                if kb_indices:
                    result[item] = kb_indices
                    
        return result
    
    def _get_indices_in_path(self, path: str) -> List[str]:
        """
        Get all indices in a path
        
        Args:
            path: Path to check
            
        Returns:
            List of index names
        """
        indices = []
        for item in os.listdir(path):
            if item.endswith('_latest.json'):
                indices.append(item.replace('_latest.json', ''))
        return indices 