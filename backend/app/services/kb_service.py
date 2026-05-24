import os
import json
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

class KnowledgeBaseService:
    def __init__(self):
        self.data: Dict[str, Any] = {}
        self.kb_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "generated_data", "diseases.json")
        self._load_data()

    def _load_data(self):
        try:
            if os.path.exists(self.kb_path):
                with open(self.kb_path, "r", encoding="utf-8") as f:
                    self.data = json.load(f)
                logger.info(f"Successfully loaded local knowledge base from {self.kb_path} ({len(self.data)} classes)")
            else:
                logger.warning(f"Knowledge base file not found at {self.kb_path}. Run scraper first.")
        except Exception as e:
            logger.error(f"Failed to load knowledge base: {e}")

    def get_disease_info(self, disease_name: str) -> Dict[str, Any]:
        """Get structured intelligence for a disease class."""
        if not self.data:
            self._load_data()
            
        return self.data.get(disease_name, None)

kb_service = KnowledgeBaseService()
