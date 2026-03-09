from .base import *  # noqa: F401, F403
import os  # noqa: F401

DEBUG = False

ALLOWED_HOSTS = os.getenv(  # noqa: F405
    "DJANGO_ALLOWED_HOSTS", "timesync.lanturn.info,backend"
).split(",")

# CORS — only allow the production frontend
CORS_ALLOW_ALL_ORIGINS = False  # noqa: F405
CORS_ALLOWED_ORIGINS = [
    "https://timesync.lanturn.info",
]

# Static files collected to a shared Docker volume
STATIC_ROOT = "/staticfiles"  # noqa: F405

# Trust the X-Forwarded-Proto header set by nginx
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")  # noqa: F405
SECURE_SSL_REDIRECT = False  # nginx handles redirection
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
CSRF_TRUSTED_ORIGINS = ["https://timesync.lanturn.info"]

# Email via SMTP (configure via env vars)
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = os.getenv("EMAIL_HOST", "smtp.gmail.com")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_USE_TLS = True
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")
DEFAULT_FROM_EMAIL = os.getenv(
    "DEFAULT_FROM_EMAIL", "noreply@timesync.lanturn.info"
)
