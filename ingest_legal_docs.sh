#!/bin/bash

# Make the script exit on any errors
set -e

# Define colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting CA Tenant Rights Document Ingestion${NC}"

# Create a knowledge base for California tenant rights
echo -e "${GREEN}Creating Knowledge Base...${NC}"
KB_RESPONSE=$(curl -s -X POST "http://localhost:8000/api/create-kb/" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "California Tenant Rights",
    "description": "Laws and regulations related to California tenant rights, including habitability requirements"
  }')

KB_ID=$(echo $KB_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)

if [ -z "$KB_ID" ]; then
  echo -e "${RED}Error: Failed to create knowledge base${NC}"
  exit 1
fi

echo -e "${GREEN}Knowledge Base created with ID: $KB_ID${NC}"

# Ingest the CA tenant rights document
echo -e "${GREEN}Ingesting California Tenant Rights document...${NC}"

DOCUMENT_RESPONSE=$(curl -s -X POST "http://localhost:8000/api/ingest/" \
  -F "file=@ca_tenant_rights.txt" \
  -F "title=California Tenant Rights" \
  -F "description=Sections of California Civil Code and San Francisco Rent Ordinance related to tenant rights" \
  -F "knowledge_base_id=$KB_ID")

DOC_ID=$(echo $DOCUMENT_RESPONSE | grep -o '"document_id":"[^"]*' | cut -d'"' -f4)

if [ -z "$DOC_ID" ]; then
  echo -e "${RED}Error: Failed to ingest document${NC}"
  exit 1
fi

echo -e "${GREEN}Document ingested with ID: $DOC_ID${NC}"
echo -e "${YELLOW}Waiting for document processing to complete...${NC}"

# Give the system some time to process the document
sleep 10

# Check document status
DOC_STATUS_RESPONSE=$(curl -s "http://localhost:8000/api/documents/$DOC_ID/")
STATUS=$(echo $DOC_STATUS_RESPONSE | grep -o '"status":"[^"]*' | cut -d'"' -f4)

echo -e "${GREEN}Document status: $STATUS${NC}"
echo -e "${GREEN}Document ingestion completed!${NC}"
echo -e "${YELLOW}You can now use Cal-RentAssist to answer questions about California tenant rights.${NC}" 