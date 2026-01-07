# Water Quality API

## Overview
The `water_qualityApi` provides comprehensive water quality data management for wells across Rajasthan, India. It tracks various water quality parameters and integrates with the location hierarchy (State → District → Block → Grampanchayat → Village).

## Model Structure

### WaterQuality Model
Stores water quality measurements for individual wells with the following fields:

#### Location Fields
- **village** (ForeignKey): Links to Village in locationApi
- **latitude** (Float): GPS latitude of the well
- **longitude** (Float): GPS longitude of the well

#### Well Information
- **well_id** (String): Unique identifier for the well
- **type_of_well** (Choice): Type of well (Bore Well, Dug Well, Hand Pump, Tube Well, Open Well, Other)
- **well_depth** (Float): Depth of well in meters
- **meta_date** (Date): Date of measurement

#### Water Quality Parameters
- **ph** (Float): pH level (0-14)
- **hardness** (Float): Hardness in mg/L
- **alkalinity** (Float): Alkalinity in mg/L
- **nitrate** (Float): Nitrate concentration in mg/L
- **fluoride** (Float): Fluoride concentration in mg/L
- **ec** (Float): Electrical Conductivity in µS/cm
- **tds** (Float): Total Dissolved Solids in mg/L

## API Endpoints

### Base URL: `/api/water-quality/`

### 1. List All Water Quality Records
```
GET /api/water-quality/
```

**Query Parameters:**
- `state`: Filter by state name (e.g., `Rajasthan`)
- `district`: Filter by district name
- `block`: Filter by block name
- `grampanchayat`: Filter by grampanchayat name
- `village_name`: Filter by village name
- `type_of_well`: Filter by well type
- `meta_date`: Filter by measurement date
- `ph_min`, `ph_max`: Filter by pH range
- `tds_min`, `tds_max`: Filter by TDS range
- `search`: Search by well_id or village name
- `ordering`: Order results (e.g., `-meta_date`, `ph`, `tds`)

**Example:**
```bash
GET /api/water-quality/?district=Jaipur&ph_min=6.5&ph_max=8.5
```

### 2. Retrieve Single Record
```
GET /api/water-quality/{id}/
```

### 3. Create New Record (Authenticated)
```
POST /api/water-quality/
Content-Type: application/json

{
  "village": 1,
  "well_id": "WELL-RAJ-001",
  "type_of_well": "bore_well",
  "well_depth": 45.5,
  "latitude": 26.9124,
  "longitude": 75.7873,
  "meta_date": "2026-01-07",
  "ph": 7.2,
  "hardness": 250.0,
  "alkalinity": 180.0,
  "nitrate": 15.5,
  "fluoride": 0.8,
  "ec": 850.0,
  "tds": 520.0
}
```

### 4. Update Record (Authenticated)
```
PUT /api/water-quality/{id}/
PATCH /api/water-quality/{id}/
```

### 5. Delete Record (Authenticated)
```
DELETE /api/water-quality/{id}/
```

### 6. Get Statistics
```
GET /api/water-quality/statistics/
```

**Response:**
```json
{
  "summary": {
    "total_wells": 150,
    "total_records": 450,
    "avg_ph": 7.3,
    "min_ph": 6.2,
    "max_ph": 8.5,
    "avg_hardness": 245.5,
    "avg_alkalinity": 175.2,
    "avg_nitrate": 18.3,
    "avg_fluoride": 0.9,
    "avg_ec": 820.5,
    "avg_tds": 495.3,
    "max_tds": 1200.0,
    "min_tds": 150.0
  },
  "well_type_distribution": [
    {"type_of_well": "bore_well", "count": 250},
    {"type_of_well": "hand_pump", "count": 120},
    {"type_of_well": "dug_well", "count": 80}
  ]
}
```

### 7. Get Data by Location
```
GET /api/water-quality/by_location/?level=district
GET /api/water-quality/by_location/?level=block
```

**Response (district level):**
```json
{
  "level": "district",
  "data": [
    {
      "village__grampanchayat__block__district__name": "Jaipur",
      "count": 150,
      "avg_ph": 7.2,
      "avg_tds": 480.5
    }
  ]
}
```

## Model Properties

The WaterQuality model provides convenient properties to access location hierarchy:
- `state`: Returns state name
- `district`: Returns district name
- `block`: Returns block name
- `grampanchayat`: Returns grampanchayat name
- `village_name`: Returns village name

## Validation

- **pH**: Must be between 0 and 14
- **well_depth**: Must be positive
- **well_id + meta_date**: Must be unique (prevents duplicate measurements)

## Permissions

- **Read (GET)**: Public access
- **Write (POST/PUT/PATCH/DELETE)**: Authenticated users only

## Admin Interface

Access the Django admin at `/admin/` to:
- View and manage water quality records
- Filter by district, well type, and date
- Search by well ID or village name
- View organized fieldsets for location, well info, and water quality parameters

## Usage Examples

### Filter by Location Hierarchy
```bash
# Get all records from a specific district
GET /api/water-quality/?district=Jodhpur

# Get all records from a specific block
GET /api/water-quality/?district=Jodhpur&block=Osian

# Get all records from a specific village
GET /api/water-quality/?village_name=Khejarla
```

### Filter by Water Quality Parameters
```bash
# Find wells with high TDS
GET /api/water-quality/?tds_min=1000

# Find wells with pH outside safe range
GET /api/water-quality/?ph_min=0&ph_max=6.5
GET /api/water-quality/?ph_min=8.5&ph_max=14

# Find wells with high fluoride
GET /api/water-quality/?fluoride_min=1.5
```

### Search and Order
```bash
# Search by well ID
GET /api/water-quality/?search=WELL-RAJ-001

# Order by latest measurements
GET /api/water-quality/?ordering=-meta_date

# Order by TDS (highest first)
GET /api/water-quality/?ordering=-tds
```

## Integration with Other APIs

The water_qualityApi integrates seamlessly with:
- **locationApi**: Uses Village model for location hierarchy
- **account_app**: Uses JWT authentication for write operations

## Next Steps

To load water quality data from an Excel file, you can create a management command similar to the `robust_load` command used for rainfall data.
