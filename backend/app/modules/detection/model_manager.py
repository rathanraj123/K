import os
import gc
import asyncio
import logging
from typing import Optional, Tuple, Any
from app.core.config import settings

logger = logging.getLogger(__name__)

class ModelManager:
    """
    Singleton manager for loading, preloading, and locking AI models (TFLite & YOLO).
    Implements memory-guard protections for Render/low-RAM environments.
    """
    _instance = None
    _lock = asyncio.Lock()

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(ModelManager, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self.model_path = os.path.join(os.getcwd(), "model.tflite")
        self.yolo_path = "yolov8s-world.pt"
        
        self.interpreter = None
        self.input_details = None
        self.output_details = None
        self.yolo_model = None
        self._initialized = True
        
        # Thread-safety lock for TFLite execution (TFLite interpreter is not thread-safe)
        self.tflite_lock = asyncio.Lock()
        self.yolo_lock = asyncio.Lock()

    async def get_tflite_interpreter(self) -> Tuple[Optional[Any], Optional[list], Optional[list]]:
        """Thread-safe lazy loader for TFLite Interpreter."""
        if self.interpreter is not None:
            return self.interpreter, self.input_details, self.output_details

        async with self._lock:
            if self.interpreter is not None:
                return self.interpreter, self.input_details, self.output_details

            try:
                import ai_edge_litert.interpreter as tflite
                if os.path.exists(self.model_path) and os.path.getsize(self.model_path) > 1000:
                    logger.info(f"Loading TFLite model from {self.model_path}...")
                    
                    def load_tf():
                        interpreter = tflite.Interpreter(model_path=self.model_path)
                        interpreter.allocate_tensors()
                        return interpreter, interpreter.get_input_details(), interpreter.get_output_details()
                        
                    self.interpreter, self.input_details, self.output_details = await asyncio.to_thread(load_tf)
                    logger.info("TFLite Model loaded successfully.")
                else:
                    logger.error(f"TFLite model file not found at {self.model_path}.")
            except Exception as e:
                logger.error(f"Failed to lazy load TFLite model: {e}")
                
        return self.interpreter, self.input_details, self.output_details

    async def get_yolo_model(self) -> Optional[Any]:
        """Lazy load YOLO-World only when explicitly requested and not in low memory mode."""
        if settings.LOW_MEMORY_MODE:
            logger.info("Bypassing YOLO-World load: Low Memory Mode active.")
            return None

        if self.yolo_model is not None:
            return self.yolo_model

        async with self._lock:
            if self.yolo_model is not None:
                return self.yolo_model

            try:
                from ultralytics import YOLOWorld
                logger.info(f"Loading YOLO-World model: {self.yolo_path}...")
                
                def load_yolo():
                    model = YOLOWorld(self.yolo_path)
                    classes = ["rice leaf", "plant leaf", "leaf", "plant", "crop", "animal", "person", "vehicle", "hand"]
                    model.set_classes(classes)
                    return model
                    
                self.yolo_model = await asyncio.to_thread(load_yolo)
                logger.info("YOLO-World loaded successfully.")
            except Exception as e:
                logger.error(f"Failed to lazy load YOLO-World model: {e}")
                
        return self.yolo_model

    async def warmup(self) -> bool:
        """Trigger preloading of all enabled models."""
        try:
            await self.get_tflite_interpreter()
            if not settings.LOW_MEMORY_MODE:
                await self.get_yolo_model()
            return True
        except Exception as e:
            logger.error(f"Error during warmup: {e}")
            return False

    async def unload_models(self):
        """Force garbage collection and model unloading if RAM threshold exceeded."""
        async with self._lock:
            logger.warning("Unloading AI models to free RAM memory.")
            self.interpreter = None
            self.input_details = None
            self.output_details = None
            self.yolo_model = None
            gc.collect()
            logger.info("Models unloaded successfully.")

model_manager = ModelManager()
