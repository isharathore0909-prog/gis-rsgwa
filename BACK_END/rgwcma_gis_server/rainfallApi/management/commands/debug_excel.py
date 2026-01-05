import pandas as pd
from django.core.management.base import BaseCommand
import os

class Command(BaseCommand):
    help = 'Inspect Excel columns'

    def handle(self, *args, **kwargs):
        file_path = r'D:\GIS_RSGWA_ANALYSIS\BACK_END\Rainfall.xlsx'
        try:
            df = pd.read_excel(file_path, nrows=5)
            with open('columns_log.txt', 'w') as f:
                f.write(str(df.columns.tolist()))
            self.stdout.write(self.style.SUCCESS(f'Columns: {df.columns.tolist()}'))
        except Exception as e:
            with open('columns_log.txt', 'w') as f:
                f.write(str(e))
            self.stdout.write(self.style.ERROR(f'Error: {e}'))
