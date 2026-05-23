import asyncio
import uuid
import json
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select

# Import models
import sys
import os
sys.path.append(os.getcwd())

from app.models.user import User
from app.models.marketplace import Product
from app.core.config import get_settings
from app.core.security import get_password_hash

async def seed_marketplace():
    settings = get_settings()
    print(f"Connecting to: {settings.DATABASE_URL}")
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    try:
        async with async_session() as db:
            # 1. Create Admin User
            print("Checking for admin user...")
            admin_email = "admin@agricosmo.ai"
            res = await db.execute(select(User).where(User.email == admin_email))
            admin = res.scalar()
            
            if not admin:
                print("Creating admin user...")
                admin = User(
                    email=admin_email,
                    hashed_password=get_password_hash("admin123"),
                    full_name="AgriCosmo Admin",
                    role="admin",
                    is_active=True
                )
                db.add(admin)
                await db.flush()

            # 2. Create Professional Products
            print("Seeding professional products...")
            products_data = [
                {
                    "name": "SuperGrow Organic NPK Fertilizer",
                    "description": "Premium 100% organic fertilizer specifically formulated for high-yield cereal crops. Enhances soil structure and promotes rapid root development.",
                    "price": 850.0,
                    "stock": 500,
                    "category": "Fertilizer",
                    "brand": "AgriPro",
                    "image_url": "https://images.unsplash.com/photo-1585314062340-f1a5a7c9328d?auto=format&fit=crop&q=80&w=400",
                    "specifications": ["10-10-10 Formula", "Slow Release", "Eco-friendly", "5kg Bag"],
                    "rating": 4.8,
                    "reviews_count": 124,
                    "is_featured": True
                },
                {
                    "name": "EcoShield Bio-Pesticide",
                    "description": "Non-toxic Neem-based pesticide effective against 200+ species of sucking and chewing insects. Safe for beneficial insects like bees.",
                    "price": 420.0,
                    "stock": 200,
                    "category": "Pesticides",
                    "brand": "GreenGuard",
                    "image_url": "https://images.unsplash.com/photo-1615811361523-6bd03d7748e7?auto=format&fit=crop&q=80&w=400",
                    "specifications": ["Neem Oil based", "Residual action: 10 days", "Water soluble", "500ml"],
                    "rating": 4.6,
                    "reviews_count": 89,
                    "is_featured": True
                },
                {
                    "name": "Hybrid Maize Seeds (High Yield)",
                    "description": "Climate-resilient hybrid maize seeds with built-in drought resistance. Optimized for diverse Indian soil types.",
                    "price": 1200.0,
                    "stock": 1000,
                    "category": "Seeds",
                    "brand": "SemaGlobal",
                    "image_url": "https://images.unsplash.com/photo-1594489215242-ec748373075d?auto=format&fit=crop&q=80&w=400",
                    "specifications": ["Maturity: 90 days", "Yield: 6-8 Tons/Ha", "Drought tolerant", "1kg Pack"],
                    "rating": 4.9,
                    "reviews_count": 56,
                    "is_featured": False
                },
                {
                    "name": "Precision pH Soil Tester",
                    "description": "Digital soil pH and moisture meter for precision farming. Real-time readings help you optimize fertilizer usage.",
                    "price": 2450.0,
                    "stock": 50,
                    "category": "Tools",
                    "brand": "FieldTech",
                    "image_url": "https://images.unsplash.com/photo-1581242163695-19d0acfd486f?auto=format&fit=crop&q=80&w=400",
                    "specifications": ["LCD Display", "Battery included", "Accuracy: +/- 0.1", "12-month Warranty"],
                    "rating": 4.7,
                    "reviews_count": 34,
                    "is_featured": False
                }
            ]

            for p_data in products_data:
                product = Product(**p_data)
                db.add(product)

            await db.commit()
            print("Successfully seeded marketplace with professional data!")

    except Exception as e:
        print(f"Error seeding marketplace: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(seed_marketplace())
