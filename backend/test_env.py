import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.config import get_settings

settings = get_settings()
print("GEMINI_API_KEY:", repr(settings.GEMINI_API_KEY))
print("MONGODB_DB_NAME:", repr(settings.MONGODB_DB_NAME))