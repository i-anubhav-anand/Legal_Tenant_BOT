import os
import requests
from bs4 import BeautifulSoup
import logging
from urllib.parse import urlparse, urljoin
import re
import uuid
import time
from typing import List, Dict, Any, Tuple, Optional
import hashlib

logger = logging.getLogger(__name__)

class WebScraper:
    """
    A class for scraping content from web pages, especially legal documents.
    """
    
    def __init__(self, output_dir: str = "rag_api/documents"):
        """
        Initialize the web scraper.
        
        Args:
            output_dir: Directory to store downloaded content
        """
        self.output_dir = output_dir
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
    
    def extract_content_from_url(self, url: str, rag_folder: str = None) -> Tuple[str, str]:
        """
        Extract content from a URL
        
        Args:
            url: URL to extract content from
            rag_folder: Optional folder for RAG
            
        Returns:
            Tuple of (extracted_text, output_path)
        """
        max_retries = 3
        retry_count = 0
        
        while retry_count < max_retries:
            try:
                logger.info(f"Extracting content from URL: {url} (attempt {retry_count + 1})")
                
                # Determine domain and handle differently based on the site
                parsed_url = urlparse(url)
                domain = parsed_url.netloc
                
                # Different user agents for better compatibility
                user_agents = [
                    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
                    'Mozilla/5.0 (compatible; LegalRAGBot/1.0)'
                ]
                
                headers = {
                    'User-Agent': user_agents[retry_count % len(user_agents)],
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1',
                    'Cache-Control': 'max-age=0'
                }
                
                # Set a reasonable timeout and increased timeout with each retry
                timeout = 30 + (retry_count * 10)
                logger.info(f"Setting request timeout to {timeout} seconds")
                
                try:
                    # Use a session to better handle cookies and redirects
                    session = requests.Session()
                    response = session.get(url, headers=headers, timeout=timeout, allow_redirects=True)
                    response.raise_for_status()
                except requests.exceptions.RequestException as e:
                    logger.warning(f"Request failed: {str(e)}")
                    retry_count += 1
                    if retry_count >= max_retries:
                        raise
                    time.sleep(2 ** retry_count)  # Exponential backoff
                    continue
                
                # Create a unique filename based on the URL
                url_hash = hashlib.md5(url.encode()).hexdigest()
                file_path = os.path.join(self.output_dir, f"web_{url_hash}.txt")
                
                # Ensure directory exists
                os.makedirs(os.path.dirname(file_path), exist_ok=True)
                
                # Special handling for specific types of websites
                if "amlegal.com" in domain:
                    soup = BeautifulSoup(response.text, 'html.parser')
                    content, title = self._extract_amlegal_content(soup, file_path, url)
                else:
                    soup = BeautifulSoup(response.text, 'html.parser')
                    content, title = self._extract_generic_content(soup, file_path)
                
                logger.info(f"Content extraction complete. Extracted {len(content)} characters")
                return content, file_path
                
            except requests.Timeout:
                retry_count += 1
                logger.warning(f"Request timed out for URL: {url} (attempt {retry_count})")
                
                if retry_count >= max_retries:
                    logger.error(f"Maximum retries reached for URL: {url}")
                    raise Exception(f"Request timed out for URL: {url} after {max_retries} attempts. Please try again later.")
                
                # Exponential backoff
                time.sleep(2 ** retry_count)
                
            except requests.ConnectionError:
                retry_count += 1
                logger.warning(f"Connection error for URL: {url} (attempt {retry_count})")
                
                if retry_count >= max_retries:
                    logger.error(f"Maximum retries reached for URL: {url}")
                    raise Exception(f"Could not connect to {url} after {max_retries} attempts. Please check the URL and try again.")
                
                # Exponential backoff
                time.sleep(2 ** retry_count)
            
            except Exception as e:
                logger.error(f"Error extracting content from URL {url}: {str(e)}")
                raise
    
    def _extract_amlegal_content(self, soup: BeautifulSoup, file_path: str, url: str) -> Tuple[str, str]:
        """
        Extract content specifically from American Legal Publishing website.
        
        Args:
            soup: BeautifulSoup object
            file_path: Path to save the content
            url: Original URL
            
        Returns:
            Tuple of (extracted_text, title)
        """
        # Extract title
        title_elem = soup.find("title")
        title = title_elem.text if title_elem else "American Legal Code"
        
        # Get the main content
        content = ""
        
        # Find article sections
        main_content = soup.find("div", class_="main-content")
        if main_content:
            # Extract all text from the main content
            content += f"{title}\n\n"
            
            # Extract sections and their content
            sections = main_content.find_all("section")
            for section in sections:
                section_title = section.find("h1")
                if section_title:
                    content += f"\n\n{section_title.text.strip()}\n"
                    
                for element in section.find_all(["p", "div", "table"]):
                    # Skip empty elements or navigation elements
                    if not element.text.strip() or "id_skiptocontent" in str(element.get("id", "")):
                        continue
                    content += f"\n{element.text.strip()}"
            
            # Find tables with legal content
            tables = main_content.find_all("table")
            for table in tables:
                rows = table.find_all("tr")
                for row in rows:
                    cells = row.find_all(["td", "th"])
                    row_content = " | ".join([cell.text.strip() for cell in cells])
                    if row_content.strip():
                        content += f"\n{row_content}"
        
        # If no main content found, try to extract content differently
        if not content:
            # Look for code sections which are common in legal docs
            code_sections = soup.find_all("div", class_="section")
            for section in code_sections:
                section_num = section.get("id", "")
                section_title = section.find("h3")
                if section_title:
                    content += f"\n\nSection {section_num}: {section_title.text.strip()}\n"
                section_content = section.find("div", class_="section-content")
                if section_content:
                    content += section_content.text.strip()
        
        # If still no content, get all text
        if not content:
            # Remove scripts, styles, and navigation elements
            for script in soup(["script", "style", "nav", "header", "footer"]):
                script.extract()
            content = soup.get_text(separator="\n")
            
            # Clean up the text (remove multiple blank lines)
            content = re.sub(r'\n\s*\n', '\n\n', content)
        
        # Save extracted content to file
        try:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
        except Exception as e:
            logger.error(f"Error saving content to file {file_path}: {str(e)}")
            # Continue even if file save fails, we'll still return the content
        
        return content, title
    
    def _extract_generic_content(self, soup: BeautifulSoup, file_path: str) -> Tuple[str, str]:
        """
        Extract content from generic websites.
        
        Args:
            soup: BeautifulSoup object
            file_path: Path to save the content
            
        Returns:
            Tuple of (extracted_text, title)
        """
        # Extract title
        title_elem = soup.find("title")
        title = title_elem.text if title_elem else "Web Content"
        
        # Remove scripts, styles, and navigation elements
        for script in soup(["script", "style", "nav", "header", "footer"]):
            script.extract()
        
        # Get text
        text = soup.get_text(separator="\n")
        
        # Clean up the text
        lines = (line.strip() for line in text.splitlines())
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        text = '\n'.join(chunk for chunk in chunks if chunk)
        
        # Write to file
        try:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(text)
        except Exception as e:
            logger.error(f"Error saving content to file {file_path}: {str(e)}")
            # Continue even if file save fails, we'll still return the content
            
        return text, title 