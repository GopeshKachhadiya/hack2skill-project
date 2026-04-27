import httpx
import asyncio

async def main():
    async with httpx.AsyncClient(timeout=3) as client:
        try:
            response = await client.get("http://127.0.0.1:8000/api/v1/health")
            print(response.status_code)
            print(response.text)
        except Exception as e:
            print("Error:", e)

asyncio.run(main())
