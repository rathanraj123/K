import logging
from typing import List, Union
from sentence_transformers import SentenceTransformer
import asyncio

logger = logging.getLogger(__name__)

class EmbeddingService:
    def __init__(self, model_name: str = 'sentence-transformers/all-mpnet-base-v2'):
        self.model_name = model_name
        self.model = None
        self._load_lock = asyncio.Lock()

    async def _get_model(self):
        """Lazy load the model to save startup time."""
        if self.model is None:
            async with self._load_lock:
                if self.model is None:
                    logger.info(f"Loading embedding model: {self.model_name}")
                    # Offload model loading to thread to prevent blocking the event loop
                    self.model = await asyncio.to_thread(SentenceTransformer, self.model_name)
                    logger.info("Embedding model loaded successfully.")
        return self.model

    async def generate_embedding(self, text: Union[str, List[str]]) -> Union[List[float], List[List[float]]]:
        """Generate 768-d embeddings for the given text."""
        model = await self._get_model()
        try:
            # Offload generation to thread
            embeddings = await asyncio.to_thread(model.encode, text)
            if isinstance(text, str):
                return embeddings.tolist()
            return [e.tolist() for e in embeddings]
        except Exception as e:
            logger.error(f"Failed to generate embedding: {str(e)}")
            # Return empty embedding (768 zeros) as fallback to prevent crashing the indexing process
            if isinstance(text, str):
                return [0.0] * 768
            return [[0.0] * 768 for _ in text]

embedding_service = EmbeddingService()
