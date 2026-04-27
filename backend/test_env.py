import sys
import os

# Add current dir to path to import app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.config import get_settings

settings = get_settings()
print("GEMINI_API_KEY:", repr(settings.GEMINI_API_KEY))
print("MONGODB_DB_NAME:", repr(settings.MONGODB_DB_NAME))
