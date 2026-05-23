import sqlite3

def fix_db():
    conn = sqlite3.connect('agricosmo.db')
    cursor = conn.cursor()
    
    # Check if table exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='disease_detections'")
    if not cursor.fetchone():
        print("Table does not exist.")
        return

    # Add missing columns
    try:
        cursor.execute("ALTER TABLE disease_detections ADD COLUMN status VARCHAR DEFAULT 'completed'")
        print("Added status column.")
    except sqlite3.OperationalError as e:
        print(f"Error adding status column: {e}")
        
    try:
        cursor.execute("ALTER TABLE disease_detections ADD COLUMN severity VARCHAR")
        print("Added severity column.")
    except sqlite3.OperationalError as e:
        print(f"Error adding severity column: {e}")
        
    try:
        cursor.execute("ALTER TABLE disease_detections ADD COLUMN explainability_meta JSON")
        print("Added explainability_meta column.")
    except sqlite3.OperationalError as e:
        print(f"Error adding explainability_meta column: {e}")
        
    try:
        cursor.execute("ALTER TABLE disease_detections ADD COLUMN explanation VARCHAR")
        print("Added explanation column.")
    except sqlite3.OperationalError as e:
        print(f"Error adding explanation column: {e}")

    try:
        cursor.execute("ALTER TABLE disease_detections ADD COLUMN treatments JSON")
        print("Added treatments column.")
    except sqlite3.OperationalError as e:
        print(f"Error adding treatments column: {e}")

    try:
        cursor.execute("ALTER TABLE disease_detections ADD COLUMN farmer_treatments JSON")
        print("Added farmer_treatments column.")
    except sqlite3.OperationalError as e:
        print(f"Error adding farmer_treatments column: {e}")

    try:
        cursor.execute("ALTER TABLE disease_detections ADD COLUMN scientist_data JSON")
        print("Added scientist_data column.")
    except sqlite3.OperationalError as e:
        print(f"Error adding scientist_data column: {e}")

    try:
        cursor.execute("ALTER TABLE disease_detections ADD COLUMN cosmetic_insights JSON")
        print("Added cosmetic_insights column.")
    except sqlite3.OperationalError as e:
        print(f"Error adding cosmetic_insights column: {e}")

    # Remove NOT NULL constraint from detected_disease
    # SQLite does not support dropping constraints easily, so we recreate the table
    print("Recreating table to remove NOT NULL constraints...")
    
    cursor.execute("CREATE TABLE disease_detections_new ("
                   "id VARCHAR(36) PRIMARY KEY,"
                   "user_id VARCHAR(36) NOT NULL,"
                   "image_url VARCHAR,"
                   "detected_disease VARCHAR,"
                   "confidence FLOAT,"
                   "status VARCHAR DEFAULT 'completed',"
                   "severity VARCHAR,"
                   "explainability_meta JSON,"
                   "explanation VARCHAR,"
                   "treatments JSON,"
                   "farmer_treatments JSON,"
                   "scientist_data JSON,"
                   "cosmetic_insights JSON,"
                   "created_at DATETIME DEFAULT CURRENT_TIMESTAMP"
                   ")")
    
    # Try to copy existing data if there's any. For missing columns, it will just insert NULLs.
    try:
        cursor.execute("SELECT id, user_id, image_url, detected_disease, confidence, status, severity, explainability_meta, explanation, treatments, farmer_treatments, scientist_data, cosmetic_insights, created_at FROM disease_detections")
        rows = cursor.fetchall()
        cursor.executemany("INSERT INTO disease_detections_new VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", rows)
        print(f"Migrated {len(rows)} rows.")
    except Exception as e:
        print(f"Failed to migrate rows: {e}")
        
    cursor.execute("DROP TABLE disease_detections")
    cursor.execute("ALTER TABLE disease_detections_new RENAME TO disease_detections")
    
    cursor.execute("CREATE INDEX ix_disease_detections_id ON disease_detections (id)")
    
    conn.commit()
    conn.close()
    print("Database fix completed.")

if __name__ == '__main__':
    fix_db()
