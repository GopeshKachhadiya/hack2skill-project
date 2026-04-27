import asyncio
import os
import sys

# Setup app path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import init_db

async def test():
    import sys
    from loguru import logger
    logger.remove()
    logger.add(sys.stdout, level="INFO")
    
    await init_db()

asyncio.run(test())
