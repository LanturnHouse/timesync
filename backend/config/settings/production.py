from .base import *  # noqa: F401, F403

DEBUG = False
ALLOWED_HOSTS = os.getenv("DJANGO_ALLOWED_HOSTS", "").split(",")  # noqa: F405
