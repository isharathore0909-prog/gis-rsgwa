import json
import pyproj
from functools import partial
from shapely.geometry import shape, mapping
from shapely.ops import transform

# Define projections
# Assuming UTM Zone 43N for Rajasthan (EPSG:32643) based on coordinates (4e5, 29e5)
project = partial(
    pyproj.Transformer.from_crs("EPSG:32643", "EPSG:4326", always_xy=True).transform,
)

def convert_geojson(input_path, output_path):
    print(f"Reading {input_path}...")
    with open(input_path, 'r') as f:
        data = json.load(f)

    new_features = []
    print(f"Converting features...")
    for feature in data['features']:
        try:
            geom = shape(feature['geometry'])
            new_geom = transform(project, geom)
            feature['geometry'] = mapping(new_geom)
            new_features.append(feature)
        except Exception as e:
            print(f"Skipping feature due to error: {e}")

    data['features'] = new_features

    print(f"Writing to {output_path}...")
    with open(output_path, 'w') as f:
        json.dump(data, f)
    print("Done!")

if __name__ == "__main__":
    convert_geojson('D:/GIS_RSGWA_ANALYSIS/isha_gwd/block_boundary.geojson', 'D:/GIS_RSGWA_ANALYSIS/isha_gwd/block_boundary_wgs84.geojson')
