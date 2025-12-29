import geopandas as gpd

def geojson_to_excel(geojson_path, excel_path):
    """
    Convert GeoJSON file to Excel (.xlsx)
    
    Parameters:
        geojson_path (str): Path to GeoJSON file
        excel_path (str): Output Excel file path
    """
    # Read GeoJSON
    gdf = gpd.read_file(geojson_path)

    # Convert geometry to WKT (Excel cannot store geometry objects)
    gdf["geometry"] = gdf["geometry"].apply(lambda geom: geom.wkt if geom else None)

    # Save to Excel
    gdf.to_excel(excel_path, index=False, engine="openpyxl")

    print(f"✅ Converted successfully: {excel_path}")

# Example usage
geojson_to_excel("D:\GIS_RSGWA_ANALYSIS\Geo_Json_Files\Groundwater Level Station.geojson", "GroundwaterLevelStation.xlsx")
geojson_to_excel("D:\GIS_RSGWA_ANALYSIS\Geo_Json_Files\Groundwater Station.geojson", "GroundwaterStation.xlsx")
geojson_to_excel("D:\GIS_RSGWA_ANALYSIS\Geo_Json_Files\Minor Irrigation First Waterbody Census for Rajasthan.geojson", "IrrigationWaterbody.xlsx")
geojson_to_excel("D:\GIS_RSGWA_ANALYSIS\Geo_Json_Files\Rainfall Station.geojson", "RainfallStation.xlsx")
geojson_to_excel("D:\GIS_RSGWA_ANALYSIS\Geo_Json_Files\Reservoir Station.geojson", "ReservoirStation.xlsx")
geojson_to_excel("D:\GIS_RSGWA_ANALYSIS\Geo_Json_Files\River Line Area of Inland drainage in Rajasthan Basin.geojson", "InlandDrainage.xlsx")
geojson_to_excel("D:\GIS_RSGWA_ANALYSIS\Geo_Json_Files\Surface water body of Area of Inland drainage in Rajasthan Basin.geojson", "SurfaceWaterStation.xlsx")