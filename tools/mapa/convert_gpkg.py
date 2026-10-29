import geopandas as gpd
import json

# Read the GeoPackage
print("Reading GeoPackage...")
gdf = gpd.read_file('mapa-municipal-estat-v1r0-20250701.gpkg', layer='mapa-municipal-estat')

print(f"Loaded {len(gdf)} features")
print(f"Columns: {list(gdf.columns)}")
print(f"CRS: {gdf.crs}")

# Sample data
print("\nSample data:")
print(gdf.head())

# Get municipality codes and unique values
if 'CODIMUNI1' in gdf.columns:
    print(f"\nUnique CODIMUNI1 values: {gdf['CODIMUNI1'].nunique()}")
    print("Sample CODIMUNI1:", gdf['CODIMUNI1'].head(10).tolist())

if 'CODIMUNI2' in gdf.columns:
    print(f"\nUnique CODIMUNI2 values: {gdf['CODIMUNI2'].nunique()}")
    print("Sample CODIMUNI2:", gdf['CODIMUNI2'].head(10).tolist())

# Save as GeoJSON (simplified for web use)
print("\nConverting to GeoJSON...")
gdf_wgs84 = gdf.to_crs('EPSG:4326')  # Convert to WGS84 for web mapping
gdf_wgs84.to_file('data/catalunya-municipalities.geojson', driver='GeoJSON')
print("Saved to data/catalunya-municipalities.geojson")

# Get bounding box
bounds = gdf_wgs84.total_bounds
print(f"\nBounding box (lon_min, lat_min, lon_max, lat_max): {bounds}")
