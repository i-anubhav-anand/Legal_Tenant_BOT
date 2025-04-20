from django.contrib import admin
from .models import Document, Chunk, Query

@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'file_type', 'status', 'upload_date')
    list_filter = ('status', 'file_type', 'upload_date')
    search_fields = ('title', 'description', 'original_filename')
    readonly_fields = ('id', 'upload_date')

@admin.register(Chunk)
class ChunkAdmin(admin.ModelAdmin):
    list_display = ('id', 'document', 'chunk_number')
    list_filter = ('document',)
    search_fields = ('content',)
    readonly_fields = ('id',)

@admin.register(Query)
class QueryAdmin(admin.ModelAdmin):
    list_display = ('id', 'query_text', 'timestamp')
    list_filter = ('timestamp',)
    search_fields = ('query_text',)
    readonly_fields = ('id', 'timestamp')
