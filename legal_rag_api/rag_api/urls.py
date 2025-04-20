from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework.response import Response
from rest_framework.decorators import api_view
from rest_framework import status
from . import views

# Create a router for ViewSets
router = DefaultRouter()
router.register(r'documents', views.DocumentViewSet)
router.register(r'knowledge-bases', views.KnowledgeBaseViewSet)
router.register(r'queries', views.QueryViewSet)

@api_view(['GET'])
def health_check(request):
    """Simple health check endpoint to verify the API is running"""
    return Response({"status": "healthy", "message": "API is operational"}, status=status.HTTP_200_OK)

urlpatterns = [
    # Include router URLs
    path('', include(router.urls)),
    
    # Health check endpoint
    path('health-check/', health_check, name='health-check'),
    
    # Custom endpoints
    path('ingest/', views.DocumentIngestView.as_view(), name='ingest-document'),
    path('create-kb/', views.KnowledgeBaseCreateView.as_view(), name='create-knowledge-base'),
    path('query/', views.QueryView.as_view(), name='query-rag'),
    
    # New URLs for tenant/client interface
    path('conversations/', views.ConversationListCreateView.as_view(), name='conversation-list'),
    path('conversations/<uuid:pk>/', views.ConversationDetailView.as_view(), name='conversation-detail'),
    path('conversations/<uuid:pk>/messages/', views.ConversationAddMessageView.as_view(), name='conversation-add-message'),
    path('conversations/<uuid:pk>/documents/', views.ConversationDocumentListView.as_view(), name='conversation-documents'),
    path('conversations/active/', views.ActiveConversationListView.as_view(), name='active-conversations'),
    
    # New URLs for lawyer interface
    path('lawyers/', views.LawyerListCreateView.as_view(), name='lawyer-list'),
    path('lawyers/<uuid:pk>/', views.LawyerDetailView.as_view(), name='lawyer-detail'),
    path('lawyers/<uuid:pk>/cases/', views.LawyerCaseListView.as_view(), name='lawyer-cases'),
    path('cases/', views.CaseListCreateView.as_view(), name='case-list'),
    path('cases/<uuid:pk>/', views.CaseDetailView.as_view(), name='case-detail'),
    path('cases/<uuid:pk>/claim/', views.CaseClaimView.as_view(), name='case-claim'),
    path('cases/<uuid:pk>/priority/', views.CasePriorityUpdateView.as_view(), name='case-priority'),
    path('cases/<uuid:pk>/analysis/', views.CaseAnalysisUpdateView.as_view(), name='case-analysis'),
    path('cases/<uuid:pk>/status/', views.CaseStatusUpdateView.as_view(), name='case-status'),
    path('cases/unassigned/', views.UnassignedCaseListView.as_view(), name='unassigned-cases'),
] 