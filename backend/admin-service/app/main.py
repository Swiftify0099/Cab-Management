from contextlib import asynccontextmanager
import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from common.database import engine
from common.utils.redis_client import close_redis

logger = structlog.get_logger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info('admin-service starting...')
    yield
    await close_redis()
    await engine.dispose()

app = FastAPI(title='CabBooking Admin Operations Service', version='1.0.0', lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=['*'], allow_credentials=True, allow_methods=['*'], allow_headers=['*'])

from app.api.v1.admin import router as admin_router
from app.api.v1.themes import router as themes_router

app.include_router(admin_router)
app.include_router(themes_router)

@app.get('/health')
async def health():
    return {'status': 'healthy', 'service': 'admin-service'}
