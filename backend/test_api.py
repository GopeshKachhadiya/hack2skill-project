import httpx
import asyncio

async def main():
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "http://127.0.0.1:8000/api/v1/assistant/chat",
            json={"messages": [{"role": "user", "content": "hello anvayaa"}]}
        )
        print(response.status_code)
        print(response.text)

asyncio.run(main())