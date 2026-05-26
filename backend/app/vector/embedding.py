import logging
from typing import List, Union
import asyncio

logger = logging.getLogger(__name__)

class EmbeddingService:
    def __init__(self, model_name: str = 'nomic-ai/nomic-embed-text-v1.5'):
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
                    def load_embed():
                        from fastembed import TextEmbedding
                        import os
                        import shutil
                        cache_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "model_cache")
                        
                        # Resilient check: if cache_dir exists but there is no .onnx file anywhere inside it,
                        # it means we have a corrupted/incomplete cache (e.g. from git conflicts or Render build cache).
                        # Delete it to force a clean re-download.
                        if os.path.exists(cache_dir):
                            has_onnx = False
                            for root, dirs, files in os.walk(cache_dir):
                                for f in files:
                                    if f.endswith(".onnx"):
                                        has_onnx = True
                                        break
                                if has_onnx:
                                    break
                            if not has_onnx:
                                logger.warning("Incomplete model cache detected (no .onnx file found). Purging cache directory.")
                                try:
                                    shutil.rmtree(cache_dir)
                                except Exception as rmerr:
                                    logger.error(f"Failed to purge incomplete model cache: {rmerr}")
                                    
                        os.makedirs(cache_dir, exist_ok=True)
                        return TextEmbedding(model_name=self.model_name, cache_dir=cache_dir)
                    
                    self.model = await asyncio.to_thread(load_embed)
                    logger.info("Embedding model loaded successfully.")
        return self.model

    async def generate_embedding(self, text: Union[str, List[str]]) -> Union[List[float], List[List[float]]]:
        """Generate 768-d embeddings for the given text."""
        model = await self._get_model()
        try:
            # fastembed requires a list of strings
            is_single = isinstance(text, str)
            texts = [text] if is_single else text
            
            # Offload generation to thread
            def generate():
                # embed returns an iterable of numpy arrays
                return list(model.embed(texts))
                
            embeddings = await asyncio.to_thread(generate)
            
            if is_single:
                return embeddings[0].tolist()
            return [e.tolist() for e in embeddings]
        except Exception as e:
            logger.error(f"Failed to generate embedding: {str(e)}")
            # Return empty embedding (768 zeros) as fallback to prevent crashing the indexing process
            if isinstance(text, str):
                return [0.0] * 768
            return [[0.0] * 768 for _ in text]

embedding_service = EmbeddingService()
