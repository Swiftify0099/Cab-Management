
import random, secrets, string, bcrypt
from common.config import settings

def hash_password(password: str) -> str:
    pwd_bytes = password.encode('utf-8')[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8')[:72], hashed_password.encode('utf-8'))
    except Exception:
        return False

def generate_otp(length: int = 6) -> str:
    if settings.OTP_DEV_MODE:
        return settings.OTP_DEFAULT_CODE
    return ''.join(random.choices(string.digits, k=length))

def generate_referral_code(length: int = 8) -> str:
    alphabet = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))

def generate_secure_token(length: int = 32) -> str:
    return secrets.token_urlsafe(length)

def generate_coupon_code(prefix: str = 'CAB', length: int = 8) -> str:
    suffix = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(length))
    return f'{prefix}-{suffix}'
