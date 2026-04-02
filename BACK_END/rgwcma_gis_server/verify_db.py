import os
import django
from django.db import connections
from django.db.utils import OperationalError

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rgwcma_gis_server.settings')
django.setup()

db_conn = connections['default']
try:
    db_conn.cursor()
    print("SUCCESS: Database connection established.")
except OperationalError as e:
    print(f"FAILURE: Database connection failed: {e}")
except Exception as e:
    print(f"ERROR: An unexpected error occurred: {e}")
