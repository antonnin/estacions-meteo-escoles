import sqlite3

conn = sqlite3.connect('mapa-municipal-estat-v1r0-20250701.gpkg')
cursor = conn.cursor()

# Get all tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [row[0] for row in cursor.fetchall()]
print("Tables:", tables)

# Check the main data table (likely the first non-metadata table)
for table in tables:
    if not table.startswith('gpkg_') and not table.startswith('rtree_'):
        print(f"\nTable: {table}")
        cursor.execute(f"PRAGMA table_info([{table}])")
        columns = cursor.fetchall()
        print("Columns:", [col[1] for col in columns])
        
        cursor.execute(f"SELECT COUNT(*) FROM [{table}]")
        count = cursor.fetchone()[0]
        print(f"Row count: {count}")
        break

conn.close()
