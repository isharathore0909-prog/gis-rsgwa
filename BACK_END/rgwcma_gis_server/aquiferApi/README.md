# Aquifer API

## Overview
The `aquiferApi` provides comprehensive groundwater level monitoring data for aquifer wells across Rajasthan. It tracks pre-monsoon and post-monsoon water level measurements from 2015 to 2024, enabling trend analysis and seasonal variation studies.

## Model Structure

### AquiferData Model
Stores groundwater level measurements with the following fields:

#### Location Fields
- **village** (ForeignKey): Links to Village in locationApi
- **latitude** (Float): GPS latitude of the monitoring well
- **longitude** (Float): GPS longitude of the monitoring well

#### Well Information
- **well_id** (String): Unique identifier for the monitoring well
- **well_depth** (Float): Total depth of well in meters
- **aquifer** (String): Aquifer type/name

#### Measurements (2015-2024)
For each year from 2015 to 2024:
- **pre_YYYY** (Float): Pre-monsoon depth to water level in meters below ground level
- **pst_YYYY** (Float): Post-monsoon depth to water level in meters below ground level

Example fields:
- `pre_2024`, `pst_2024`
- `pre_2023`, `pst_2023`
- ... down to ...
- `pre_2015`, `pst_2015`

## API Endpoints

### Base URL: `/api/aquifer/`

### 1. List All Aquifer Records
```
GET /api/aquifer/
```

**Query Parameters:**
- `state`: Filter by state name
- `district`: Filter by district name
- `block`: Filter by block name
- `grampanchayat`: Filter by grampanchayat name
- `village_name`: Filter by village name
- `aquifer`: Filter by aquifer type
- `search`: Search by well_id, village name, or aquifer
- `ordering`: Order results (e.g., `well_id`, `-well_depth`)

**Example:**
```bash
GET /api/aquifer/?district=Jaipur&aquifer=Alluvium
```

### 2. Retrieve Single Record
```
GET /api/aquifer/{id}/
```

Returns complete data including all years and trend analysis.

### 3. Create New Record (Authenticated)
```
POST /api/aquifer/
Content-Type: application/json

{
  "village": 1,
  "well_id": "AQ-RAJ-001",
  "latitude": 26.9124,
  "longitude": 75.7873,
  "well_depth": 150.0,
  "aquifer": "Alluvium",
  "pre_2024": 45.5,
  "pst_2024": 42.3,
  "pre_2023": 46.2,
  "pst_2023": 43.1
}
```

### 4. Update Record (Authenticated)
```
PUT /api/aquifer/{id}/
PATCH /api/aquifer/{id}/
```

### 5. Delete Record (Authenticated)
```
DELETE /api/aquifer/{id}/
```

### 6. Get Year-Specific Data
```
GET /api/aquifer/year_data/?year=2024
```

**Response:**
```json
{
  "year": 2024,
  "count": 150,
  "data": [
    {
      "well_id": "AQ-RAJ-001",
      "village_name": "Khejarla",
      "district": "Jodhpur",
      "block": "Osian",
      "latitude": 26.9124,
      "longitude": 75.7873,
      "year": 2024,
      "pre_monsoon": 45.5,
      "post_monsoon": 42.3,
      "seasonal_change": -3.2
    }
  ]
}
```

### 7. Get Trends
```
GET /api/aquifer/trends/
```

Returns trend data for all wells showing pre and post monsoon values across all years.

**Response:**
```json
{
  "count": 150,
  "trends": [
    {
      "well_id": "AQ-RAJ-001",
      "village_name": "Khejarla",
      "district": "Jodhpur",
      "trend_data": {
        "pre_monsoon_trend": [
          {"year": 2015, "value": 40.2},
          {"year": 2016, "value": 41.5},
          ...
          {"year": 2024, "value": 45.5}
        ],
        "post_monsoon_trend": [
          {"year": 2015, "value": 38.1},
          {"year": 2016, "value": 39.2},
          ...
          {"year": 2024, "value": 42.3}
        ]
      }
    }
  ]
}
```

### 8. Get Statistics
```
GET /api/aquifer/statistics/?year=2024
```

**Response:**
```json
{
  "summary": {
    "year": 2024,
    "total_wells": 150,
    "wells_with_pre_data": 145,
    "wells_with_pst_data": 140,
    "avg_pre_monsoon": 45.3,
    "min_pre_monsoon": 15.2,
    "max_pre_monsoon": 85.7,
    "avg_pst_monsoon": 42.1,
    "min_pst_monsoon": 12.8,
    "max_pst_monsoon": 82.3
  },
  "aquifer_distribution": [
    {"aquifer": "Alluvium", "count": 80},
    {"aquifer": "Sandstone", "count": 45},
    {"aquifer": "Granite", "count": 25}
  ]
}
```

### 9. Get Data by Location
```
GET /api/aquifer/by_location/?level=district&year=2024
```

**Response:**
```json
{
  "level": "district",
  "year": 2024,
  "data": [
    {
      "district": "Jaipur",
      "wells": 45,
      "avg_pre": 38.5,
      "avg_pst": 35.2
    },
    {
      "district": "Jodhpur",
      "wells": 52,
      "avg_pre": 52.3,
      "avg_pst": 48.7
    }
  ]
}
```

## Model Methods

The AquiferData model provides useful methods:

- `get_year_data(year)`: Get pre/post monsoon data for a specific year
- `calculate_seasonal_change(year)`: Calculate the difference between post and pre monsoon
- `get_all_years_data()`: Get data for all years (2015-2024)
- `get_trend_data()`: Get trend analysis data

## Understanding the Data

### Depth to Water Level
- **Lower values** = Water table is closer to surface (better)
- **Higher values** = Water table is deeper (worse)
- **Negative seasonal change** = Water level rose during monsoon (good)
- **Positive seasonal change** = Water level dropped during monsoon (concerning)

### Pre vs Post Monsoon
- **Pre-monsoon**: Measured before monsoon season (typically May-June)
- **Post-monsoon**: Measured after monsoon season (typically October-November)

## Permissions

- **Read (GET)**: Public access
- **Write (POST/PUT/PATCH/DELETE)**: Authenticated users only

## Admin Interface

Access the Django admin at `/admin/` to:
- View and manage aquifer records
- Filter by district and aquifer type
- Search by well ID or village name
- View measurements organized by year (collapsible sections)
- See latest measurement at a glance

## Usage Examples

### Track a Specific Well Over Time
```bash
# Get complete history for a well
GET /api/aquifer/?search=AQ-RAJ-001
```

### Compare Districts
```bash
# Get 2024 data by district
GET /api/aquifer/by_location/?level=district&year=2024
```

### Analyze Trends
```bash
# Get all trends
GET /api/aquifer/trends/

# Filter by district
GET /api/aquifer/trends/?district=Jaipur
```

### Find Wells with Declining Water Levels
Use the trend data to identify wells where pre-monsoon levels are increasing over time (water table dropping).

## Integration with Other APIs

The aquiferApi integrates seamlessly with:
- **locationApi**: Uses Village model for location hierarchy
- **account_app**: Uses JWT authentication for write operations

## Next Steps

To load aquifer data from an Excel file, create a management command similar to the water quality loader.
