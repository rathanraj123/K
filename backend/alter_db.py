import asyncio
import asyncpg

async def main():
    try:
        conn = await asyncpg.connect('postgresql://postgres:1234@localhost:5432/agricosmo')
        
        columns_to_add = [
            ("scientific_name", "VARCHAR"),
            ("disease_category", "VARCHAR"),
            ("spread_risk", "VARCHAR"),
            ("contagiousness", "VARCHAR"),
            ("crop_stage_affected", "VARCHAR"),
            ("farmer_report", "JSON"),
            ("scientist_report", "JSON"),
            ("confidence_breakdown", "JSON"),
            ("explainable_ai", "JSON"),
            ("agronomist_recommendation", "JSON"),
            ("yield_loss_estimate", "JSON"),
            ("disease_timeline", "JSON"),
            ("similar_diseases", "JSON"),
            ("detailed_treatments", "JSON"),
            ("smart_products", "JSON"),
            ("image_quality", "JSON"),
            ("weather_risk", "JSON"),
            ("scan_latitude", "DOUBLE PRECISION"),
            ("scan_longitude", "DOUBLE PRECISION"),
            ("scan_location_name", "VARCHAR"),
            ("crop_type", "VARCHAR"),
            ("cosmetic_insights", "JSON")
        ]
        
        for name, col_type in columns_to_add:
            try:
                await conn.execute(f'ALTER TABLE disease_detections ADD COLUMN IF NOT EXISTS {name} {col_type};')
                print(f"Added column {name} ({col_type}) if not exists.")
            except Exception as e:
                print(f"Error adding {name}: {e}")
                
        print("Successfully updated database schema!")
        await conn.close()
    except Exception as e:
        print("Error connecting to database:", e)

asyncio.run(main())
