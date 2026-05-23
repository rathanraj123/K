import asyncio
import asyncpg

async def main():
    try:
        conn = await asyncpg.connect('postgresql://postgres:1234@localhost:5432/agricosmo')
        # We delete all scans and AI logs so the charts start fresh
        await conn.execute('DELETE FROM disease_detections;')
        await conn.execute('DELETE FROM ai_logs;')
        print("Successfully wiped mock data from database!")
        await conn.close()
    except Exception as e:
        print("Error:", e)

asyncio.run(main())
