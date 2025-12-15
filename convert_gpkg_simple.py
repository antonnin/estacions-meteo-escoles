import sqlite3
import json
import struct

def parse_wkb_point(wkb):
    """Parse a WKB Point geometry to get coordinates"""
    # WKB format: byte order (1 byte) + type (4 bytes) + X (8 bytes) + Y (8 bytes)
    try:
        byte_order = wkb[0]
        if byte_order == 0:  # Big endian
            endian = '>'
        else:  # Little endian
            endian = '<'
        
        # Skip byte order and type (5 bytes)
        x = struct.unpack(endian + 'd', wkb[5:13])[0]
        y = struct.unpack(endian + 'd', wkb[13:21])[0]
        return [x, y]
    except:
        return None

def parse_wkb_linestring(wkb):
    """Parse a WKB LineString geometry"""
    try:
        byte_order = wkb[0]
        if byte_order == 0:
            endian = '>'
        else:
            endian = '<'
        
        # Get number of points
        num_points = struct.unpack(endian + 'I', wkb[5:9])[0]
        coords = []
        offset = 9
        for i in range(num_points):
            x = struct.unpack(endian + 'd', wkb[offset:offset+8])[0]
            y = struct.unpack(endian + 'd', wkb[offset+8:offset+16])[0]
            coords.append([x, y])
            offset += 16
        return coords
    except Exception as e:
        print(f"Error parsing linestring: {e}")
        return None

# Connect to GeoPackage
conn = sqlite3.connect('mapa-municipal-estat-v1r0-20250701.gpkg')
cursor = conn.cursor()

# Get data
cursor.execute("""
    SELECT id, IDLINIA, ESTAT, CODIMUNI1, CODIMUNI2, TIPUSUA, geom 
    FROM [mapa-municipal-estat] 
    LIMIT 100
""")

features = []
for row in cursor.fetchall():
    geom_wkb = row[6]
    coords = parse_wkb_linestring(geom_wkb)
    
    if coords:
        feature = {
            "type": "Feature",
            "properties": {
                "id": row[0],
                "IDLINIA": row[1],
                "ESTAT": row[2],
                "CODIMUNI1": row[3],
                "CODIMUNI2": row[4],
                "TIPUSUA": row[5]
            },
            "geometry": {
                "type": "LineString",
                "coordinates": coords
            }
        }
        features.append(feature)

print(f"Parsed {len(features)} features")
if features:
    print("Sample feature:", json.dumps(features[0], indent=2))

conn.close()
