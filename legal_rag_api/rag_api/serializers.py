from rest_framework import serializers
from .models import (
    KnowledgeBase, Document, Chunk, Query, 
    Lawyer, Conversation, Message, Case
)

class KnowledgeBaseSerializer(serializers.ModelSerializer):
    document_count = serializers.ReadOnlyField()
    
    class Meta:
        model = KnowledgeBase
        fields = ['id', 'name', 'description', 'folder_name', 'created_at', 'updated_at', 'document_count']
        read_only_fields = ['id', 'created_at', 'updated_at', 'document_count']

class DocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = ['id', 'title', 'description', 'file_path', 'file_type', 'source_url', 
                  'original_filename', 'upload_date', 'status', 'knowledge_base', 'conversation', 
                  'extracted_data']
        read_only_fields = ['id', 'upload_date', 'file_path']

class ChunkSerializer(serializers.ModelSerializer):
    class Meta:
        model = Chunk
        fields = ['id', 'document', 'content', 'metadata', 'chunk_number']
        read_only_fields = ['id']

class QuerySerializer(serializers.ModelSerializer):
    class Meta:
        model = Query
        fields = ['id', 'query_text', 'response_text', 'timestamp', 'knowledge_base', 'conversation']
        read_only_fields = ['id', 'timestamp']

# New serializers for the legal tech platform

class LawyerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lawyer
        fields = ['id', 'name', 'email', 'specialization', 'years_of_experience', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']

class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ['id', 'conversation', 'content', 'is_from_user', 'created_at']
        read_only_fields = ['id', 'created_at']

class MessageCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ['content', 'is_from_user']

class ConversationSerializer(serializers.ModelSerializer):
    messages = MessageSerializer(many=True, read_only=True)
    document_count = serializers.ReadOnlyField()
    has_case = serializers.ReadOnlyField()
    
    class Meta:
        model = Conversation
        fields = ['id', 'title', 'created_at', 'last_active', 'is_active', 'messages', 'document_count', 'has_case']
        read_only_fields = ['id', 'created_at', 'last_active', 'messages', 'document_count', 'has_case']

class ConversationCreateSerializer(serializers.ModelSerializer):
    initial_message = serializers.CharField(write_only=True, required=True)
    
    class Meta:
        model = Conversation
        fields = ['title', 'initial_message']
    
    def create(self, validated_data):
        initial_message = validated_data.pop('initial_message')
        conversation = Conversation.objects.create(**validated_data)
        
        # Create the initial message
        Message.objects.create(
            conversation=conversation,
            content=initial_message,
            is_from_user=True
        )
        
        return conversation

class CaseSerializer(serializers.ModelSerializer):
    conversation_title = serializers.ReadOnlyField(source='conversation.title')
    lawyer_name = serializers.ReadOnlyField(source='lawyer.name')
    
    class Meta:
        model = Case
        fields = [
            'id', 'conversation', 'conversation_title', 'lawyer', 'lawyer_name', 
            'status', 'priority', 'legal_analysis', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'conversation_title', 'lawyer_name']

class CaseCreateSerializer(serializers.ModelSerializer):
    conversation_id = serializers.UUIDField(write_only=True)
    
    class Meta:
        model = Case
        fields = ['conversation_id', 'title', 'issue_type', 'priority', 'summary']
        extra_kwargs = {
            'title': {'required': True},
            'issue_type': {'required': False},
            'priority': {'required': False, 'default': 3},
            'summary': {'required': False, 'allow_blank': True}
        }
    
    def validate_conversation_id(self, value):
        try:
            conversation = Conversation.objects.get(pk=value)
        except Conversation.DoesNotExist:
            raise serializers.ValidationError("Conversation with this ID does not exist.")
            
        # Check if case already exists for this conversation
        if hasattr(conversation, 'case'):
            raise serializers.ValidationError("A case already exists for this conversation.")
        return value
    
    def create(self, validated_data):
        # Create new case with default status
        return Case.objects.create(**validated_data)

class CaseClaimSerializer(serializers.ModelSerializer):
    class Meta:
        model = Case
        fields = ['lawyer']
        
    def validate(self, data):
        if not data.get('lawyer'):
            raise serializers.ValidationError("Lawyer field is required to claim a case.")
        return data

class CasePrioritySerializer(serializers.ModelSerializer):
    class Meta:
        model = Case
        fields = ['priority']

class CaseStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Case
        fields = ['status']

class CaseLegalAnalysisSerializer(serializers.ModelSerializer):
    class Meta:
        model = Case
        fields = ['legal_analysis']

# Custom serializers for API requests and responses

class KnowledgeBaseCreateRequestSerializer(serializers.Serializer):
    """Serializer for knowledge base creation requests"""
    name = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True)

class DocumentUploadRequestSerializer(serializers.Serializer):
    """Serializer for document upload requests"""
    file = serializers.FileField(required=False)
    url = serializers.URLField(required=False)
    title = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True)
    knowledge_base_id = serializers.UUIDField(required=False)
    conversation_id = serializers.UUIDField(required=False)
    
    def validate(self, data):
        """
        Check that either file or url is provided
        """
        if not data.get('file') and not data.get('url'):
            raise serializers.ValidationError("Either file or url must be provided")
        return data

class DocumentUploadResponseSerializer(serializers.Serializer):
    """Serializer for document upload responses"""
    document_id = serializers.UUIDField()
    title = serializers.CharField()
    status = serializers.CharField()
    message = serializers.CharField()
    chunks_count = serializers.IntegerField()
    knowledge_base_id = serializers.UUIDField(required=False, allow_null=True)
    knowledge_base_name = serializers.CharField(required=False, allow_null=True)
    conversation_id = serializers.UUIDField(required=False, allow_null=True)
    extracted_data = serializers.JSONField(required=False)

class QueryRequestSerializer(serializers.Serializer):
    """Serializer for query requests"""
    query = serializers.CharField()
    top_k = serializers.IntegerField(required=False, default=5)
    temperature = serializers.FloatField(required=False, default=0.0)
    knowledge_base_id = serializers.UUIDField(required=False)
    conversation_id = serializers.UUIDField(required=False)

class SourceSerializer(serializers.Serializer):
    """Serializer for source information in query responses"""
    document_title = serializers.CharField()
    document_id = serializers.CharField()
    chunk_index = serializers.IntegerField()
    relevance_score = serializers.FloatField()

class TimingSerializer(serializers.Serializer):
    """Serializer for timing information in query responses"""
    retrieval_time = serializers.FloatField()
    llm_time = serializers.FloatField()
    total_time = serializers.FloatField()

class QueryResponseSerializer(serializers.Serializer):
    """Serializer for query responses"""
    query = serializers.CharField()
    answer = serializers.CharField()
    sources = SourceSerializer(many=True)
    timing = TimingSerializer(required=False)
    error = serializers.CharField(required=False)
    conversation_id = serializers.UUIDField(required=False) 