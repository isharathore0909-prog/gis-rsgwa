# API Testing Guide for Location API

This document provides `curl` commands to test the Location API endpoints.

## Prerequisites

All API requests require an API Key. You can generate one via the Django Admin or by using the shell if you have access to the server.

**Header:** `X-Auth-Key: <YOUR_API_KEY>`

### Generating an API Key (via Shell)
If you don't have an API key, run the following in your terminal to create one:

```powershell
docker exec -it geomapapi python manage.py shell
```

Then inside the python shell:
```python
from geomapapi_1.models import ApiKey
key = ApiKey.objects.create(name_of_org="Test User", contact_no="1234567890")
print(key.api_key)
exit()
```
*Copy the UUID printed above and use it in the commands below.*

---

## 1. Get Address by Lat/Long

Fetch full address details (District, Block, GP, Village) for a specific location.

**Endpoint:** `GET /pincode/`

### Case A: Basic Address (No Boundary)
Returns JSON object with address details.

```bash
curl -X GET "http://localhost:8010/pincode/?lat=3338893.2686&lon= 400975.5764" \
     -H "X-Auth-Key: <YOUR_API_KEY>"
```

### Case B: Address with Boundary Geometry
Returns GeoJSON Feature with the polygon boundary of the village/location.

```bash
curl -X GET "http://localhost:8010/pincode/?lat=3338893.2686&lon= 400975.5764&boundary=true" \
     -H "X-Auth-Key: <YOUR_API_KEY>"
```

**Parameters:**
- `lat`: Latitude (Example: 26.9124)
- `lon`: Longitude (Example: 75.7873)
- `boundary`: set to `true` to include geometry (Optional)

---

## 2. Get Boundary by Administrative Code

Fetch the boundary geometry for a specific administrative unit (District, Block, GP, or Village) using its code.

**Endpoint:** `GET /boundary-by-code/`

### Examples

**By Village Code:**
```bash
curl -X GET "http://localhost:8000/boundary-by-code/?village_code=123456" \
     -H "X-Auth-Key: <YOUR_API_KEY>"
```

**By GP Code:**
```bash
curl -X GET "http://localhost:8000/boundary-by-code/?gpcode=987654" \
     -H "X-Auth-Key: <YOUR_API_KEY>"
```

**By Block Code:**
```bash
curl -X GET "http://localhost:8000/boundary-by-code/?block_code=BLOCK123" \
     -H "X-Auth-Key: <YOUR_API_KEY>"
```

**By District Code:**
```bash
curl -X GET "http://localhost:8000/boundary-by-code/?district_code=DIST01" \
     -H "X-Auth-Key: <YOUR_API_KEY>"
```

**Parameters (At least one required):**
- `district_code`
- `block_code`
- `gpcode`
- `village_code`

---

## 3. Multiple Points in Polygon

Check multiple coordinates at once to find their containing polygon/address.

**Endpoint:** `POST /mpinp/`

```bash
curl -X POST "http://localhost:8000/mpinp/" \
     -H "X-Auth-Key: <YOUR_API_KEY>" \
     -H "Content-Type: application/json" \
     -d '{
           "points": [
             {"id": 1, "lat": 26.9124, "lon": 75.7873},
             {"id": 2, "lat": 28.6139, "lon": 77.2090}
           ]
         }'
```

---

## 4. Add/Update Polygon Data (Admin Only)

**Endpoint:** `POST /pincode/`

```bash
curl -X POST "http://localhost:8000/pincode/" \
     -H "X-Auth-Key: <YOUR_API_KEY>" \
     -H "Content-Type: application/json" \
     -d '[
           {
             "type": "Feature",
             "properties": {
               "dist_code": "D01",
               "dist_name": "Jaipur",
               "block_code": "B01",
               "block_name": "Sanganer",
               "vllg_code": "V001",
               "vllg_name": "Pratap Nagar"
             },
             "geometry": {
               "type": "MultiPolygon",
               "coordinates": [[[[75.78, 26.91], [75.79, 26.91], [75.79, 26.92], [75.78, 26.92], [75.78, 26.91]]]]
             }
           }
         ]'
```
POSTGRES_DB=gisdb
POSTGRES_USER=shubham
POSTGRES_PASSWORD=Shu@19999
POSTGRES_HOST=72.60.192.17
POSTGRES_PORT=5432

#db_for_api_location
@15766892101811