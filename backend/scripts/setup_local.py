"""
Local development bootstrap script.
Run this once to set up the database tables and seed a demo admin user.
Usage: python scripts/setup_local.py
"""
import asyncio
import sys
import os

# Ensure the backend folder is on the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

async def main():
    print("=" * 55)
    print("  AgriCosmo Local Setup")
    print("=" * 55)

    # 1. Create all DB tables
    print("\n[1/3] Resetting database and creating tables...")
    from app.db.session import engine, Base
    # Import all models via barrel so Base.metadata is fully populated
    from app.db import base as _all_models  # noqa: F401
    from sqlalchemy import text

    async with engine.begin() as conn:
        # Get all table names in public schema to drop them completely
        result = await conn.execute(text(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
        ))
        tables = result.scalars().all()
        
        if tables:
            print(f"    ⚠️  Dropping existing tables to avoid schema drift: {', '.join(tables)}")
            for table in tables:
                await conn.execute(text(f"DROP TABLE IF EXISTS \"{table}\" CASCADE"))
            print("    ✅ Existing tables dropped.")
        
        await conn.run_sync(Base.metadata.create_all)
    print("    ✅ All database tables created successfully.")

    # 2. Seed demo user + admin user
    print("\n[2/3] Seeding users...")
    from app.db.session import AsyncSessionLocal
    from sqlalchemy import select
    from app.models.user import User, UserRole
    from app.core.security import get_password_hash

    async with AsyncSessionLocal() as db:
        # Demo farmer
        demo = (await db.execute(select(User).where(User.email == "demo@agricosmo.com"))).scalars().first()
        if not demo:
            db.add(User(
                email="demo@agricosmo.com",
                hashed_password=get_password_hash("demo1234"),
                full_name="Demo Farmer",
                role=UserRole.FARMER,
                region="South India",
                is_active=True,
            ))
            print("    ✅ Demo farmer created:  demo@agricosmo.com / demo1234")
        else:
            print("    ℹ️  Demo farmer already exists.")

        # Admin user
        admin = (await db.execute(select(User).where(User.email == "admin@agricosmo.com"))).scalars().first()
        if not admin:
            db.add(User(
                email="admin@agricosmo.com",
                hashed_password=get_password_hash("Admin@1234"),
                full_name="Platform Admin",
                role=UserRole.ADMIN,
                is_active=True,
                is_superuser=True,
            ))
            print("    ✅ Admin user created:   admin@agricosmo.com / Admin@1234")
        else:
            print("    ℹ️  Admin user already exists.")

        await db.commit()

    # 3. Create ES indices (optional — skips gracefully if ES is down)
    print("\n[3/3] Setting up Elasticsearch indices...")
    try:
        from app.db.es_indices import create_indices
        await create_indices()
        print("    ✅ Elasticsearch indices created.")
    except Exception as e:
        print(f"    ⚠️  Elasticsearch skipped (is it running?): {e}")

    print("\n" + "=" * 55)
    print("  Setup complete!  Start the server with:")
    print("    cd backend && uvicorn app.main:app --reload")
    print("=" * 55)

if __name__ == "__main__":
    asyncio.run(main())
