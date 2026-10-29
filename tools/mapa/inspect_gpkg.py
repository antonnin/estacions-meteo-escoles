import sqlite3
import json

# Connect to GeoPackage
conn = sqlite3.connect('mapa-municipal-estat-v1r0-20250701.gpkg')
cursor = conn.cursor()

# Get all tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [row[0] for row in cursor.fetchall()]
print("Tables in GeoPackage:")
print(json.dumps(tables, indent=2))

# For each table, get its columns
for table in tables:
    if not table.startswith('gpkg_') and not table.startswith('rtree_'):
        try:
            cursor.execute(f"PRAGMA table_info({table})")
            columns = cursor.fetchall()
            print(f"\n{table} columns:")
            print(json.dumps([col[1] for col in columns], indent=2))
            
            # Get sample data
            cursor.execute(f"SELECT * FROM {table} LIMIT 3")
            rows = cursor.fetchall()
            print(f"\nSample rows from {table}:")
            for i, row in enumerate(rows):
                print(f"Row {i+1}: {len(str(row))} chars")
                # Print non-geometry fields
                for j, val in enumerate(row):
                    if j < len(columns) and columns[j][1] != 'geom':
                        print(f"  {columns[j][1]}: {val}")
        except Exception as e:
            print(f"Error reading {table}: {e}")

conn.close()
