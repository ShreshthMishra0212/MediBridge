"""
MediBridge Database Layer Bridge
Allows importing db from backend root or routes package.
"""
import os
import sys

# Ensure routes is in sys.path
ROUTES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "routes")
if ROUTES_DIR not in sys.path:
    sys.path.insert(0, ROUTES_DIR)

from db import (
    get_db_path,
    get_db_connection,
    get_db_context,
    init_db,
    row_to_dict,
    rows_to_dict_list,
    query_one,
    query_all,
    execute,
    execute_many,
    check_integrity,
    SCHEMA_SQL
)
