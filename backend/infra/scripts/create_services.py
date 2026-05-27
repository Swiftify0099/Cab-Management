import os
import shutil

services = [
    ('matching-service', 8003, 'Driver Matching Engine', 'Phase 4'),
    ('payment-service', 8004, 'Payment and Wallet Service', 'Phase 6'),
    ('parcel-service', 8005, 'Parcel Management Service', 'Phase 7'),
    ('hotel-service', 8006, 'Hotel and Lodging Service', 'Phase 7'),
    ('notification-service', 8007, 'Push Notification Service', 'Phase 9'),
    ('analytics-service', 8008, 'Analytics and BI Service', 'Phase 9'),
    ('admin-service', 8009, 'Admin Operations Service', 'Phase 9'),
    ('websocket-gateway', 8010, 'WebSocket Gateway', 'Phase 4'),
]

base_path = r'c:\Users\panka\OneDrive\Desktop\CabBooking\backend'

for name, port, title, phase in services:
    svc_path = os.path.join(base_path, name)
    dirs = ['app/api/v1', 'app/core', 'app/services', 'app/schemas', 'alembic/versions', 'tests']
    for d in dirs:
        os.makedirs(os.path.join(svc_path, d), exist_ok=True)

    # main.py
    with open(os.path.join(svc_path, 'app/main.py'), 'w') as f:
        f.write(f"""from contextlib import asynccontextmanager
import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from common.database import engine
from common.utils.redis_client import close_redis

logger = structlog.get_logger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info('{name} starting...')
    yield
    await close_redis()
    await engine.dispose()

app = FastAPI(title='CabBooking {title}', version='1.0.0', lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=['*'], allow_credentials=True, allow_methods=['*'], allow_headers=['*'])

@app.get('/health')
async def health():
    return {{'status': 'healthy', 'service': '{name}'}}
""")

    # config.py
    with open(os.path.join(svc_path, 'app/core/config.py'), 'w') as f:
        f.write(f"""from functools import lru_cache
from common.config import BaseAppSettings

class ServiceSettings(BaseAppSettings):
    SERVICE_NAME: str = '{name}'
    SERVICE_PORT: int = {port}

@lru_cache()
def get_settings() -> ServiceSettings:
    return ServiceSettings()

settings = get_settings()
""")

    # api v1 init
    with open(os.path.join(svc_path, 'app/api/v1/__init__.py'), 'w') as f:
        f.write(f'# {name} API v1 - Full implementation in {phase}\n')

    # requirements.txt
    with open(os.path.join(svc_path, 'requirements.txt'), 'w') as f:
        f.write("""fastapi==0.115.5
uvicorn[standard]==0.32.0
pydantic==2.10.3
pydantic-settings==2.6.1
sqlalchemy==2.0.36
asyncpg==0.30.0
geoalchemy2==0.15.2
alembic==1.14.0
redis==5.2.0
structlog==24.4.0
slowapi==0.1.9
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
httpx==0.28.1
python-multipart==0.0.12
aiofiles==24.1.0
sentry-sdk[fastapi]==2.19.0
""")

    # Dockerfile
    with open(os.path.join(svc_path, 'Dockerfile'), 'w') as f:
        f.write(f"""FROM python:3.12-slim
RUN apt-get update && apt-get install -y gcc libpq-dev gdal-bin libgdal-dev && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY ../common /app/common
COPY . .
RUN mkdir -p /app/uploads
EXPOSE {port}
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "{port}", "--workers", "2", "--loop", "uvloop"]
""")

    # alembic.ini
    with open(os.path.join(svc_path, 'alembic.ini'), 'w') as f:
        f.write("""[alembic]
script_location = alembic
prepend_sys_path = .
sqlalchemy.url = postgresql+asyncpg://cabooking_user:cabooking_pass@postgres:5432/cabooking
[loggers]
keys = root,sqlalchemy,alembic
[handlers]
keys = console
[formatters]
keys = generic
[logger_root]
level = WARN
handlers = console
qualname =
[logger_sqlalchemy]
level = WARN
handlers =
qualname = sqlalchemy.engine
[logger_alembic]
level = INFO
handlers =
qualname = alembic
[handler_console]
class = StreamHandler
args = (sys.stderr,)
level = NOTSET
formatter = generic
[formatter_generic]
format = %%(levelname)-5.5s [%%(name)s] %%(message)s
datefmt = %%H:%%M:%%S
""")

    # copy env.py
    src_env = os.path.join(base_path, 'auth-service', 'alembic', 'env.py')
    if os.path.exists(src_env):
        shutil.copy(src_env, os.path.join(svc_path, 'alembic/env.py'))

    # tests init
    with open(os.path.join(svc_path, 'tests/__init__.py'), 'w') as f:
        f.write('')

    print(f'OK: {name}')

print('ALL DONE')
