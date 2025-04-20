from django.apps import AppConfig


class RagApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'rag_api'
    verbose_name = 'Legal RAG API'
    
    def ready(self):
        """
        Initialize app settings when the app is ready.
        This is a good place to set up OpenAI API key from environment variables.
        """
        import os
        from dotenv import load_dotenv
        
        # Load environment variables from .env file
        load_dotenv()
        
        # Set OpenAI API key
        os.environ["OPENAI_API_KEY"] = os.getenv("OPENAI_API_KEY", "")
