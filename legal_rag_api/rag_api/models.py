from django.db import models
import os
import uuid
import json
from django.utils import timezone
from django.conf import settings
from django.core.exceptions import ValidationError

class KnowledgeBase(models.Model):
    """Model for a knowledge base that contains documents for retrieval"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    folder_name = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.name
    
    @property
    def document_count(self):
        return self.documents.count()

class Document(models.Model):
    """Model for a document in the system"""
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('processed', 'Processed'),
        ('failed', 'Failed'),
    )
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    file_path = models.CharField(max_length=512)
    file_type = models.CharField(max_length=50)
    source_url = models.URLField(blank=True, null=True)
    original_filename = models.CharField(max_length=255, blank=True, null=True)
    upload_date = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    knowledge_base = models.ForeignKey(KnowledgeBase, related_name='documents', on_delete=models.CASCADE, null=True, blank=True)
    conversation = models.ForeignKey('Conversation', related_name='documents', on_delete=models.SET_NULL, null=True, blank=True)
    extracted_data = models.TextField(blank=True, null=True)
    
    def __str__(self):
        return self.title

class Chunk(models.Model):
    """Model for storing chunks of documents for retrieval"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey(Document, related_name='chunks', on_delete=models.CASCADE)
    content = models.TextField()
    metadata = models.JSONField(default=dict)
    chunk_number = models.IntegerField()
    
    def __str__(self):
        return f"Chunk {self.chunk_number} of {self.document.title}"
    
    class Meta:
        unique_together = ('document', 'chunk_number')

class Query(models.Model):
    """Model for storing user queries and their responses"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    query_text = models.TextField()
    response_text = models.TextField(blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    knowledge_base = models.ForeignKey(KnowledgeBase, related_name='queries', on_delete=models.CASCADE, null=True, blank=True)
    conversation = models.ForeignKey('Conversation', related_name='queries', null=True, blank=True, on_delete=models.CASCADE)
    
    def __str__(self):
        return self.query_text[:50]

# New models for the legal tech platform

class Lawyer(models.Model):
    """Model for lawyers in the system"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    specialization = models.CharField(max_length=255)
    years_of_experience = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.name

class Conversation(models.Model):
    """Model for storing conversation details"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    last_active = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    
    def __str__(self):
        return self.title
    
    @property
    def document_count(self):
        return self.documents.count()
    
    @property
    def has_case(self):
        return hasattr(self, 'case')

class Message(models.Model):
    """Model for storing individual messages in a conversation"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(Conversation, related_name='messages', on_delete=models.CASCADE)
    content = models.TextField()
    is_from_user = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{'User' if self.is_from_user else 'System'}: {self.content[:50]}..."
    
    class Meta:
        ordering = ['created_at']

class Case(models.Model):
    """Model for legal cases generated from conversations"""
    STATUS_CHOICES = (
        ('new', 'New'),
        ('in_progress', 'In Progress'),
        ('review', 'Review'),
        ('resolved', 'Resolved'),
        ('closed', 'Closed'),
    )
    
    PRIORITY_CHOICES = (
        (1, 'Low'),
        (2, 'Medium'),
        (3, 'High'),
        (4, 'Urgent'),
        (5, 'Critical'),
    )
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.OneToOneField(Conversation, on_delete=models.CASCADE, related_name='case')
    lawyer = models.ForeignKey(Lawyer, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_cases')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='new')
    priority = models.IntegerField(choices=PRIORITY_CHOICES, default=2)
    legal_analysis = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Case for {self.conversation.title}"
    
    class Meta:
        ordering = ['-priority', 'created_at']
