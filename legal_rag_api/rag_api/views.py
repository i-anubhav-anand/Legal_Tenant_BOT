import os
from rest_framework import viewsets, status, generics, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.shortcuts import get_object_or_404
from django.conf import settings
import logging
from django.http import Http404
from django.utils import timezone
import time
import uuid
import traceback
from django.db.models import Q
from rest_framework.permissions import IsAuthenticated

from .models import Document, Chunk, Query, KnowledgeBase, Lawyer, Conversation, Case, Message
from .serializers import (
    DocumentSerializer, 
    ChunkSerializer, 
    QuerySerializer,
    KnowledgeBaseSerializer,
    KnowledgeBaseCreateRequestSerializer,
    DocumentUploadRequestSerializer,
    DocumentUploadResponseSerializer,
    QueryRequestSerializer,
    QueryResponseSerializer,
    LawyerSerializer,
    ConversationSerializer,
    ConversationCreateSerializer,
    MessageCreateSerializer,
    MessageSerializer,
    CaseSerializer,
    CaseCreateSerializer,
    CaseClaimSerializer,
    CasePrioritySerializer,
    CaseStatusSerializer,
    CaseLegalAnalysisSerializer
)
from .utils.rag_service import RAGService
from .utils.case_summarizer import CaseSummarizer

logger = logging.getLogger(__name__)
rag_service = RAGService()

class KnowledgeBaseViewSet(viewsets.ModelViewSet):
    """ViewSet for managing knowledge bases"""
    queryset = KnowledgeBase.objects.all().order_by('-created_at')
    serializer_class = KnowledgeBaseSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'description']
    
    @action(detail=True, methods=['get'])
    def documents(self, request, pk=None):
        """Get documents for a knowledge base"""
        kb = self.get_object()
        documents = Document.objects.filter(knowledge_base=kb)
        serializer = DocumentSerializer(documents, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def queries(self, request, pk=None):
        """Get queries for a knowledge base"""
        kb = self.get_object()
        queries = Query.objects.filter(knowledge_base=kb).order_by('-timestamp')
        serializer = QuerySerializer(queries, many=True)
        return Response(serializer.data)

class DocumentViewSet(viewsets.ModelViewSet):
    """ViewSet for managing documents"""
    queryset = Document.objects.all().order_by('-upload_date')
    serializer_class = DocumentSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['title', 'description']
    
    @action(detail=True, methods=['get'])
    def chunks(self, request, pk=None):
        """Get chunks for a document"""
        document = self.get_object()
        chunks = Chunk.objects.filter(document=document)
        serializer = ChunkSerializer(chunks, many=True)
        return Response(serializer.data)

class KnowledgeBaseCreateView(APIView):
    """API view for creating knowledge bases"""
    parser_classes = [JSONParser]
    
    def post(self, request, format=None):
        """
        Create a new knowledge base.
        """
        serializer = KnowledgeBaseCreateRequestSerializer(data=request.data)
        
        if serializer.is_valid():
            name = serializer.validated_data['name']
            description = serializer.validated_data.get('description', '')
            
            # Initialize RAG service
            rag_service = RAGService(
                base_dir=os.path.join(settings.BASE_DIR, 'rag_api')
            )
            
            try:
                # Create knowledge base
                kb = rag_service.create_knowledge_base(
                    name=name,
                    description=description
                )
                
                # Return the knowledge base data
                kb_serializer = KnowledgeBaseSerializer(kb)
                return Response(
                    kb_serializer.data,
                    status=status.HTTP_201_CREATED
                )
                
            except Exception as e:
                logger.error(f"Error creating knowledge base: {str(e)}")
                return Response(
                    {'error': str(e)},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        else:
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

class DocumentIngestView(APIView):
    """API view for ingesting documents"""
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    
    def post(self, request, format=None):
        """
        Ingest a document or URL and process it for RAG.
        """
        serializer = DocumentUploadRequestSerializer(data=request.data)
        
        if serializer.is_valid():
            file_obj = serializer.validated_data.get('file')
            url = serializer.validated_data.get('url')
            title = serializer.validated_data['title']
            description = serializer.validated_data.get('description', '')
            kb_id = serializer.validated_data.get('knowledge_base_id')
            conversation_id = serializer.validated_data.get('conversation_id')
            
            # Initialize RAG service
            rag_service = RAGService(
                base_dir=os.path.join(settings.BASE_DIR, 'rag_api')
            )
            
            try:
                # Process the document or URL
                if file_obj:
                    # Ingest file
                    document = rag_service.ingest_document(
                        file_content=file_obj.read(),
                        original_filename=file_obj.name,
                        title=title,
                        description=description,
                        kb_id=kb_id,
                        conversation_id=conversation_id
                    )
                else:
                    # Ingest URL
                    document = rag_service.ingest_url(
                        url=url,
                        title=title,
                        description=description,
                        kb_id=kb_id,
                        conversation_id=conversation_id
                    )
                
                # Get the number of chunks created
                chunks_count = document.chunks.count()
                
                # Prepare knowledge base info if present
                kb_id = None
                kb_name = None
                if document.knowledge_base:
                    kb_id = document.knowledge_base.id
                    kb_name = document.knowledge_base.name
                
                # Get conversation info if present
                conversation_id = None
                if document.conversation:
                    conversation_id = document.conversation.id
                
                # Prepare response
                response_data = {
                    'document_id': document.id,
                    'title': document.title,
                    'status': document.status,
                    'message': 'Document processed successfully.',
                    'chunks_count': chunks_count,
                    'knowledge_base_id': kb_id,
                    'knowledge_base_name': kb_name,
                    'conversation_id': conversation_id
                }
                
                response_serializer = DocumentUploadResponseSerializer(data=response_data)
                response_serializer.is_valid(raise_exception=True)
                
                return Response(
                    response_serializer.data,
                    status=status.HTTP_201_CREATED
                )
                
            except Exception as e:
                logger.error(f"Error ingesting document: {str(e)}")
                return Response(
                    {'error': str(e)},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        else:
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

class QueryView(APIView):
    """API view for querying the RAG system"""
    parser_classes = [JSONParser]
    
    def post(self, request, format=None):
        """
        Query the RAG system.
        """
        serializer = QueryRequestSerializer(data=request.data)
        
        if serializer.is_valid():
            query_text = serializer.validated_data['query']
            top_k = serializer.validated_data.get('top_k', 5)
            temperature = serializer.validated_data.get('temperature', 0.0)
            kb_id = serializer.validated_data.get('knowledge_base_id')
            conversation_id = serializer.validated_data.get('conversation_id')
            
            # Initialize RAG service
            rag_service = RAGService(
                base_dir=os.path.join(settings.BASE_DIR, 'rag_api')
            )
            
            try:
                # Execute RAG query
                result = rag_service.query_rag(
                    query_text=query_text,
                    top_k=top_k,
                    temperature=temperature,
                    kb_id=kb_id,
                    conversation_id=conversation_id
                )
                
                # Check for errors
                if 'error' in result:
                    # Return 400 if the error is about missing knowledge base
                    if "knowledge base" in result['error'].lower() or "no documents have been indexed" in result['error'].lower():
                        return Response(
                            {
                                'error': result['error'],
                                'message': 'No available index found. Please specify a valid knowledge_base_id or ensure that documents have been indexed in the default knowledge base.'
                            },
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    # Otherwise return 404 for other errors
                    return Response(
                        {'error': result['error']},
                        status=status.HTTP_404_NOT_FOUND
                    )
                
                # Validate response format
                response_serializer = QueryResponseSerializer(data=result)
                response_serializer.is_valid(raise_exception=True)
                
                return Response(
                    response_serializer.data,
                    status=status.HTTP_200_OK
                )
                
            except Exception as e:
                logger.error(f"Error querying RAG: {str(e)}")
                return Response(
                    {'error': str(e)},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        else:
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

class LawyerListCreateView(generics.ListCreateAPIView):
    """
    List all lawyers or create a new lawyer
    """
    queryset = Lawyer.objects.filter(is_active=True)
    serializer_class = LawyerSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'email', 'specialization']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']

class LawyerDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update or delete a lawyer
    """
    queryset = Lawyer.objects.all()
    serializer_class = LawyerSerializer

    def perform_destroy(self, instance):
        # Soft delete
        instance.active = False
        instance.save()

class ConversationListCreateView(generics.ListCreateAPIView):
    """
    List all conversations or create a new conversation
    """
    queryset = Conversation.objects.all().order_by('-last_active')
    serializer_class = ConversationSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['tenant_identifier', 'issue_category']
    ordering_fields = ['started_at', 'last_active']
    
    def create(self, request, *args, **kwargs):
        serializer = ConversationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Create new conversation
        conversation = serializer.save()
        
        # Return the conversation
        return Response(
            ConversationSerializer(conversation).data,
            status=status.HTTP_201_CREATED
        )

class ConversationDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update or delete a conversation
    """
    queryset = Conversation.objects.all()
    serializer_class = ConversationSerializer

class ConversationAddMessageView(APIView):
    """
    Add a message to a conversation
    """
    def get(self, request, pk, format=None):
        try:
            conversation = Conversation.objects.get(pk=pk)
        except Conversation.DoesNotExist:
            raise Http404
        
        # Get all messages for this conversation
        messages = Message.objects.filter(conversation=conversation).order_by('created_at')
        serializer = MessageSerializer(messages, many=True)
        return Response(serializer.data)
    
    def post(self, request, pk, format=None):
        try:
            conversation = Conversation.objects.get(pk=pk)
        except Conversation.DoesNotExist:
            raise Http404
        
        serializer = MessageCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Create new message
        message = Message.objects.create(
            conversation=conversation,
            content=serializer.validated_data['content'],
            is_from_user=serializer.validated_data.get('is_from_user', True)
        )
        
        # Update conversation last_active timestamp
        conversation.last_active = timezone.now()
        conversation.save()
        
        return Response(MessageSerializer(message).data, status=status.HTTP_201_CREATED)

class ConversationDocumentListView(generics.ListAPIView):
    """
    List all documents for a conversation
    """
    serializer_class = DocumentSerializer
    
    def get_queryset(self):
        try:
            conversation = Conversation.objects.get(pk=self.kwargs['pk'])
            return conversation.documents.all()
        except Conversation.DoesNotExist:
            raise Http404

class CaseListCreateView(generics.ListCreateAPIView):
    """
    List all cases or create a new case from a conversation
    """
    queryset = Case.objects.all().order_by('-created_at')
    serializer_class = CaseSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'issue_type']
    ordering_fields = ['created_at', 'priority']
    
    def create(self, request, *args, **kwargs):
        serializer = CaseCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            conversation = Conversation.objects.get(
                pk=serializer.validated_data['conversation_id']
            )
        except Conversation.DoesNotExist:
            return Response(
                {'error': 'Conversation not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if case already exists for this conversation
        if hasattr(conversation, 'case'):
            return Response(
                {'error': 'Case already exists for this conversation'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create new case
        case = Case.objects.create(
            conversation=conversation,
            title=serializer.validated_data['title'],
            summary=serializer.validated_data.get('summary', ''),
            issue_type=serializer.validated_data.get('issue_type', ''),
            priority=serializer.validated_data.get('priority', 3),
            status='new'
        )
        
        # Generate initial legal analysis using case summarizer
        try:
            summarizer = CaseSummarizer()
            legal_analysis = summarizer.generate_summary(conversation)
            
            # Update case with legal analysis
            case.legal_analysis = legal_analysis
            case.save()
            
            logger.info(f"Successfully generated legal analysis for case {case.id}")
        except Exception as e:
            # If summarization fails, create case without analysis
            logger.error(f"Error generating summary for case {case.id}: {str(e)}")
        
        return Response(
            CaseSerializer(case).data,
            status=status.HTTP_201_CREATED
        )

class CaseDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update or delete a case
    """
    queryset = Case.objects.all()
    serializer_class = CaseSerializer

class CaseClaimView(APIView):
    """
    Claim a case as a lawyer
    """
    def post(self, request, pk, format=None):
        try:
            case = Case.objects.get(pk=pk)
        except Case.DoesNotExist:
            raise Http404
        
        serializer = CaseClaimSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            lawyer = Lawyer.objects.get(pk=serializer.validated_data['lawyer_id'])
        except Lawyer.DoesNotExist:
            return Response(
                {'error': 'Lawyer not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Assign lawyer to case and update status
        case.lawyer = lawyer
        case.status = 'assigned'
        case.save()
        
        return Response(CaseSerializer(case).data)

class LawyerCaseListView(generics.ListAPIView):
    """
    List all cases assigned to a lawyer
    """
    serializer_class = CaseSerializer
    
    def get_queryset(self):
        try:
            lawyer = Lawyer.objects.get(pk=self.kwargs['pk'])
            return lawyer.assigned_cases.all().order_by('-created_at')
        except Lawyer.DoesNotExist:
            raise Http404

class CasePriorityUpdateView(APIView):
    """
    Update the priority of a case
    """
    def patch(self, request, pk, format=None):
        try:
            case = Case.objects.get(pk=pk)
        except Case.DoesNotExist:
            raise Http404
        
        priority = request.data.get('priority')
        if not priority or not isinstance(priority, int) or priority < 1 or priority > 5:
            return Response(
                {'error': 'Valid priority (1-5) is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        case.priority = priority
        case.save()
        
        return Response(CaseSerializer(case).data)

class CaseAnalysisUpdateView(APIView):
    """
    Update the legal analysis of a case
    """
    def patch(self, request, pk, format=None):
        try:
            case = Case.objects.get(pk=pk)
        except Case.DoesNotExist:
            raise Http404
        
        # Update fields if provided
        for field in ['legal_analysis', 'recommendations', 'key_facts', 'citations']:
            if field in request.data:
                setattr(case, field, request.data[field])
        
        case.save()
        
        return Response(CaseSerializer(case).data)

class CaseStatusUpdateView(APIView):
    """
    Update the status of a case
    """
    def patch(self, request, pk, format=None):
        try:
            case = Case.objects.get(pk=pk)
        except Case.DoesNotExist:
            raise Http404
        
        status_value = request.data.get('status')
        if not status_value or status_value not in ['new', 'assigned', 'in_progress', 'resolved', 'closed']:
            return Response(
                {'error': 'Valid status is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        case.status = status_value
        case.save()
        
        return Response(CaseSerializer(case).data)

class UnassignedCaseListView(generics.ListAPIView):
    """
    List all unassigned cases
    """
    serializer_class = CaseSerializer
    
    def get_queryset(self):
        return Case.objects.filter(lawyer__isnull=True).order_by('-created_at')

class ActiveConversationListView(generics.ListAPIView):
    """
    List all active conversations
    """
    serializer_class = ConversationSerializer
    
    def get_queryset(self):
        return Conversation.objects.filter(status='active').order_by('-last_active')

class ChunkViewSet(viewsets.ModelViewSet):
    queryset = Chunk.objects.all()
    serializer_class = ChunkSerializer

class QueryViewSet(viewsets.ModelViewSet):
    queryset = Query.objects.all()
    serializer_class = QuerySerializer

# Client-facing views

class ConversationViewSet(viewsets.ModelViewSet):
    queryset = Conversation.objects.all().order_by('-last_active')
    filter_backends = [filters.SearchFilter]
    search_fields = ['title']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return ConversationCreateSerializer
        return ConversationSerializer
    
    @action(detail=True, methods=['post'])
    def add_message(self, request, pk=None):
        conversation = self.get_object()
        
        # Check if conversation is active
        if not conversation.is_active:
            return Response(
                {"detail": "Cannot add messages to inactive conversations."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create the user message
        serializer = MessageCreateSerializer(data=request.data)
        if serializer.is_valid():
            user_message = Message.objects.create(
                conversation=conversation,
                content=serializer.validated_data['content'],
                is_from_user=True
            )
            
            # Update last active timestamp
            conversation.last_active = timezone.now()
            conversation.save()
            
            # Process message with RAG service to generate response
            rag_service = RAGService()
            
            # Get related knowledge bases (can be expanded based on context)
            kb_ids = []
            documents = Document.objects.filter(conversation=conversation)
            for doc in documents:
                if doc.knowledge_base and doc.knowledge_base.id not in kb_ids:
                    kb_ids.append(doc.knowledge_base.id)
            
            # If no specific knowledge bases are associated, use all available
            if not kb_ids:
                kb_list = KnowledgeBase.objects.all()
                kb_ids = [kb.id for kb in kb_list]
            
            # Generate response using RAG service
            query_text = serializer.validated_data['content']
            response_text = "I'm sorry, I couldn't process your request."
            
            try:
                # Implement RAG query logic here
                response_text = rag_service.query(
                    query=query_text,
                    kb_ids=kb_ids
                )
                
                # Save query for future reference
                Query.objects.create(
                    query_text=query_text,
                    response_text=response_text,
                    conversation=conversation
                )
            except Exception as e:
                response_text = f"Error processing query: {str(e)}"
            
            # Create system response message
            system_message = Message.objects.create(
                conversation=conversation,
                content=response_text,
                is_from_user=False
            )
            
            # Return both messages
            return Response({
                "user_message": MessageSerializer(user_message).data,
                "system_message": MessageSerializer(system_message).data
            })
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def create_case(self, request, pk=None):
        conversation = self.get_object()
        
        # Check if a case already exists
        if Case.objects.filter(conversation=conversation).exists():
            return Response(
                {"detail": "A case already exists for this conversation."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Generate a default title from the conversation title if not provided
        if not request.data.get('title'):
            title = f"Case: {conversation.title}"
        else:
            title = request.data.get('title')
        
        serializer = CaseCreateSerializer(data={
            'conversation_id': conversation.id,
            'title': title,
            'issue_type': request.data.get('issue_type', ''),
            'summary': request.data.get('summary', ''),
            'priority': request.data.get('priority', 3)
        })
        
        if serializer.is_valid():
            try:
                # Get the conversation again from the validated data
                conversation = Conversation.objects.get(pk=serializer.validated_data['conversation_id'])
                
                # Create new case
                case = Case.objects.create(
                    conversation=conversation,
                    title=serializer.validated_data['title'],
                    summary=serializer.validated_data.get('summary', ''),
                    issue_type=serializer.validated_data.get('issue_type', ''),
                    priority=serializer.validated_data.get('priority', 3),
                    status='new'
                )
                
                # Generate initial legal analysis using case summarizer
                try:
                    summarizer = CaseSummarizer()
                    legal_analysis = summarizer.generate_summary(conversation)
                    
                    # Update case with legal analysis
                    case.legal_analysis = legal_analysis
                    case.save()
                    
                    logger.info(f"Successfully generated legal analysis for case {case.id}")
                except Exception as e:
                    # If summarization fails, create case without analysis
                    logger.error(f"Error generating summary for case {case.id}: {str(e)}")
                
                return Response(CaseSerializer(case).data)
                
            except Exception as e:
                logger.error(f"Error creating case: {str(e)}")
                return Response(
                    {'error': f'Error creating case: {str(e)}'}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)