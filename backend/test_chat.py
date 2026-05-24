import asyncio, json
import logging
logging.basicConfig(level=logging.INFO)
from app.modules.chatbot.service import chatbot_service

async def test():
    async for chunk in chatbot_service.stream_chat('test-123', 'user-123', 'How to lower soil pH naturally?', {}):
        print(repr(chunk))

if __name__ == "__main__":
    asyncio.run(test())
