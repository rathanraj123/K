import logging
import os
import asyncio
from typing import List, Union
import httpx

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
                                    if f.endswith(".onnx") and os.path.exists(os.path.join(root, f)):
                                        has_onnx = True
                                        break
                                if has_onnx:
                                    break
                            if not has_onnx:
                                logger.warning("Incomplete or broken model cache detected. Purging cache directory.")
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
        """Generate 768-d embeddings. Uses Hugging Face Inference API first, falls back to local fastembed."""
        # 1. Try Hugging Face Inference API first (0MB memory, ultra-fast)
        token = os.getenv("HF_TOKEN") or os.getenv("HUGGINGFACE_API_KEY")
        if token:
            try:
                headers = {"Authorization": f"Bearer {token}"}
                inputs = [text] if isinstance(text, str) else text
                
                async with httpx.AsyncClient(timeout=4.0) as client:
                    response = await client.post(
                        f"https://api-inference.huggingface.co/pipeline/feature-extraction/{self.model_name}",
                        headers=headers,
                        json={"inputs": inputs, "options": {"wait_for_model": True}}
                    )
                    if response.status_code == 200:
                        result = response.json()
                        
                        # Helper to check the nested depth of the returned list
                        def get_depth(lst):
                            if isinstance(lst, list):
                                return 1 + get_depth(lst[0]) if lst else 1
                            return 0
                            
                        depth = get_depth(result)
                        
                        if depth == 1:
                            # 1D list [dim] -> return directly for single, or wrap for batch
                            if isinstance(text, str):
                                return result
                            return [result]
                            
                        elif depth == 2:
                            # 2D list: Could be:
                            # a) [batch_size, dim] -> sentence-level batch. Return directly.
                            # b) [num_tokens, dim] -> single text token-level. Need mean pooling.
                            if isinstance(text, str):
                                # Single text: pool the tokens
                                num_tokens = len(result)
                                dim = len(result[0])
                                pooled = [sum(result[t][d] for t in range(num_tokens)) / num_tokens for d in range(dim)]
                                return pooled
                            else:
                                # Batch: assuming already sentence-level pooled
                                return result
                                
                        elif depth == 3:
                            # 3D list [batch_size, num_tokens, dim] -> token-level batch. Mean pool each.
                            pooled_batch = []
                            for sentence_tokens in result:
                                num_tokens = len(sentence_tokens)
                                dim = len(sentence_tokens[0])
                                pooled = [sum(sentence_tokens[t][d] for t in range(num_tokens)) / num_tokens for d in range(dim)]
                                pooled_batch.append(pooled)
                            if isinstance(text, str):
                                return pooled_batch[0]
                            return pooled_batch
            except Exception as api_err:
                logger.warning(f"Hugging Face Inference API failed, falling back to local: {api_err}")

        # 2. Fall back to local FastEmbed if API fails or no token is provided
        try:
            model = await self._get_model()
            is_single = isinstance(text, str)
            texts = [text] if is_single else text
            
            # Offload generation to thread
            def generate():
                return list(model.embed(texts))
                
            embeddings = await asyncio.to_thread(generate)
            
            if is_single:
                return embeddings[0].tolist()
            return [e.tolist() for e in embeddings]
        except Exception as e:
            logger.error(f"Failed to generate embedding locally: {str(e)}")
            # Return empty embedding (768 zeros) as fallback to prevent crashing the indexing process
            if isinstance(text, str):
                return [0.0] * 768
            return [[0.0] * 768 for _ in text]

embedding_service = EmbeddingService()
