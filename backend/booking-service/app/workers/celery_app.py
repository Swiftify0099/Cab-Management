from celery import Celery
from common.config import settings

celery_app = Celery(
    'cabbooking_workers',
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
)

celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
)

@celery_app.task(name='ping')
def ping():
    return 'pong'
