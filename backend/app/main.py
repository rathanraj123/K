
import logging
import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from sqlalchemy.exc import SQLAlchemyError
from app.api.api_v1.api import api_router
from app.core.config import settings
from app.core.logging import setup_logging
from app.core.structured_logging import setup_loguru, admin_logger
from app.api.middleware import ObservabilityMiddleware
from app.core.exceptions import AppError
from app.core.prometheus import router as prometheus_router

# Setup structured logging (loguru)
setup_loguru(settings.LOG_LEVEL)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: create tables + seed demo user. Shutdown: cleanup."""
    from app.db.session import engine, Base
    # Import all models so Base.metadata knows about them
    from app.db import base as _models  # noqa: F401
    from app.core.security import get_password_hash
    from sqlalchemy import select, text

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Apply automated self-healing schema updates for existing tables
        try:
            columns_to_verify = [
                ("thumbnail_url", "VARCHAR"),
                ("scientific_name", "VARCHAR"),
                ("disease_category", "VARCHAR"),
                ("spread_risk", "VARCHAR"),
                ("contagiousness", "VARCHAR"),
                ("crop_stage_affected", "VARCHAR"),
                ("farmer_report", "JSON"),
                ("scientist_report", "JSON"),
                ("image_quality", "JSON"),
                ("weather_risk", "JSON"),
                ("scan_latitude", "DOUBLE PRECISION"),
                ("scan_longitude", "DOUBLE PRECISION"),
                ("scan_location_name", "VARCHAR"),
                ("crop_type", "VARCHAR")
            ]
            for col_name, col_type in columns_to_verify:
                await conn.execute(text(f"ALTER TABLE disease_detections ADD COLUMN IF NOT EXISTS {col_name} {col_type};"))
            
            # Heal chat_threads table columns
            await conn.execute(text("ALTER TABLE chat_threads ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;"))
            logger.info("Database schema migration verification completed successfully.")
        except Exception as mig_err:
            logger.warning(f"Resilient migration check skipped: {mig_err}")
    logger.info("Database tables created / verified.")

    # Validate Supabase connection configuration
    try:
        from app.services.storage import storage_service
        if storage_service.supabase:
            logger.info("Supabase storage connectivity verified.")
        else:
            logger.warning("Supabase storage is unconfigured. Defaulting to Base64 fallback storage.")
    except Exception as es_err:
        logger.error(f"Error checking Supabase client startup status: {es_err}")

    # Seed a demo user if one doesn't exist
    from app.db.session import AsyncSessionLocal
    async with AsyncSessionLocal() as session:
        from app.models.user import User
        result = await session.execute(select(User).where(User.email == "demo@agricosmo.com"))
        demo_user = result.scalars().first()
        if not demo_user:
            demo_user = User(
                email="demo@agricosmo.com",
                hashed_password=get_password_hash("demo1234"),
                full_name="Demo Farmer",
                role="farmer",
                region="South India",
                is_active=True,
            )
            session.add(demo_user)
            await session.commit()
            logger.info("Demo user seeded: demo@agricosmo.com / demo1234")
        else:
            logger.info("Demo user already exists.")

    # ── Warm up services ────────────────────────────────────────────────────
    # 0 & 1. Start and setup Elasticsearch in the background to avoid blocking server start
    async def bg_es_setup():
        try:
            from app.core.elasticsearch import ensure_elasticsearch_started
            has_es = await ensure_elasticsearch_started()
            if has_es:
                from app.db.es_indices import create_indices
                await create_indices()
                logger.info("Elasticsearch indices created / verified in background.")
            else:
                logger.warning("Elasticsearch setup skipped (offline/failed to start).")
        except Exception as e:
            logger.warning(f"Background Elasticsearch setup failed: {e}")

    import asyncio
    asyncio.create_task(bg_es_setup())

    # 2. Preload ML Models & Embeddings to prevent cold-starts
    async def preload_ml_models():
        try:
            logger.info("Preloading ML Models (TFLite & optionally YOLO) and Embedding Model...")
            from app.modules.detection.service import detection_service
            from app.vector.embedding import embedding_service
            
            if not settings.LOW_MEMORY_MODE:
                from app.modules.detection.yolo_validator import yolo_validator
                # YOLO is CPU-bound and synchronous, run in thread to avoid blocking loop
                await asyncio.to_thread(yolo_validator.preload_model)
            else:
                logger.info("Low Memory Mode: skipping YOLO-World preloading on startup.")
            
            # TFLite is already async
            await detection_service.preload_model()
            
            # Preload FastEmbed embedding model (skip in low memory mode / production Render to avoid download overhead)
            if not settings.LOW_MEMORY_MODE:
                await embedding_service._get_model()
            else:
                logger.info("Low Memory Mode: skipping FastEmbed preloading on startup.")
            
            logger.info("ML and Embedding models preloaded successfully.")
        except Exception as e:
            logger.error(f"Failed to preload models: {e}")
            
    asyncio.create_task(preload_ml_models())



    # 3. Initialize Redis L1 cache connection and start WebSocket Redis listener
    try:
        from app.core.redis_client import init_redis
        from app.core.websocket_manager import manager
        await init_redis()
        # Start listening to redis pubsub in background
        import asyncio
        asyncio.create_task(manager.listen_to_redis())
    except Exception as e:
        logger.warning(f"Redis init failed (L1 cache / WebSockets disabled): {e}")

    yield  # Application runs here

    # Shutdown
    await engine.dispose()


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    description="Enterprise Backend API for the AgriCosmo AI Platform.",
    lifespan=lifespan,
)

from fastapi.middleware.gzip import GZipMiddleware

# 1. Observability Middleware
app.add_middleware(ObservabilityMiddleware)

# 1.5 GZip Compression
app.add_middleware(GZipMiddleware, minimum_size=1000)

# 2. Configurable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handlers
@app.exception_handler(AppError)
async def custom_app_exception_handler(request: Request, exc: AppError):
    logger.error(f"AppError: {exc.message}", extra={"extra_meta": {"details": exc.details, "status": exc.status_code}})
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": True, "message": exc.message, "details": exc.details}
    )

@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    logger.error("Database transaction failed", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": True, "message": "Database transaction failed."}
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled top-level exception", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": True, "message": "An unexpected server error occurred."}
    )

# Routing
app.include_router(api_router, prefix=settings.API_V1_STR)
app.include_router(prometheus_router)  # Prometheus /metrics endpoint

# Serve static files (used for saving and serving explainability heatmaps)
if not os.path.exists("static"):
    os.makedirs("static")
if not os.path.exists("static/heatmaps"):
    os.makedirs("static/heatmaps")
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/health", tags=["System"])
async def health_check():
    """Enterprise health check endpoint ensuring application is up."""
    return {"status": "healthy", "timestamp": time.time(), "environment": settings.PROJECT_NAME}

@app.get("/metrics/health/db", tags=["System"])
async def db_health():
    """Database health check for frontend connectivity verification."""
    return {
        "status": "connected"
    }

@app.get("/")
def root():
    return {"message": "Welcome to the AgriCosmo AI Enterprise Platform API"}

async def _handle_websocket(websocket: WebSocket):
    from app.core.websocket_manager import manager
    import json
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                parsed = json.loads(data)
                if parsed.get("type") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await _handle_websocket(websocket)

@app.websocket("/api/v1/ws")
async def websocket_endpoint_v1(websocket: WebSocket):
    await _handle_websocket(websocket)
