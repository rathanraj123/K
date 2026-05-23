import asyncio
import asyncpg

async def main():
    try:
        conn = await asyncpg.connect('postgresql://postgres:1234@localhost:5432/agricosmo')
        rows = await conn.fetch('SELECT detected_disease, count(*) FROM disease_detections GROUP BY detected_disease;')
        print([dict(r) for r in rows])
        await conn.close()
    except Exception as e:
        print("Error:", e)

asyncio.run(main())
