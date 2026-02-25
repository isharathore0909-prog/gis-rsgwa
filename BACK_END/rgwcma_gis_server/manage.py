#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys


def main():
    """Run administrative tasks."""
    # Windows PROJ_LIB conflict fix
    if os.name == 'nt':
        # Priority 1: Check for pyproj's internal PROJ database (best match for pip-installed GDAL)
        # We construct the path relative to the site-packages if we can't import it directly here.
        # But a common path is Lib/site-packages/pyproj/proj_dir/share
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        # Assuming djenv is peer to rgwcma_gis_server or similar structure, but safer to check site-packages relative to sys.executable or common paths.
        # Actually, let's try a direct check for the known path if we are in the venv:
        
        possible_paths = [
            os.path.join(os.path.dirname(sys.executable), 'Lib', 'site-packages', 'pyproj', 'proj_dir', 'share'),
            r"C:\OSGeo4W\share\proj",
        ]
        
        found_proj = None
        for p in possible_paths:
            if os.path.exists(os.path.join(p, 'proj.db')):
                found_proj = p
                break
        
        if found_proj:
            # print(f"Force-setting PROJ_LIB to: {found_proj}")
            os.environ['PROJ_LIB'] = found_proj
        elif 'PROJ_LIB' in os.environ:
             # If we can't find a good one, at least remove the bad one from PostgreSQL
            if 'PostgreSQL' in os.environ['PROJ_LIB']:
                 # print(f"Removing conflicting PROJ_LIB: {os.environ['PROJ_LIB']}")
                 del os.environ['PROJ_LIB']

    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rgwcma_gis_server.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()
