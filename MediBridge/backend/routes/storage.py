import os
import json
import logging

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
logger = logging.getLogger("medibridge.storage")


def read_data(filename):
    """
    Read dataset from local JSON storage in routes/data/<filename>.
    """
    if not filename.endswith(".json"):
        filename = f"{filename}.json"

    path = os.path.join(DATA_DIR, filename)

    if not os.path.exists(path):
        return []

    try:
        with open(path, "r", encoding="utf-8") as file:
            return json.load(file)
    except Exception as e:
        logger.error(f"Error reading {path}: {e}")
        return []


def write_data(filename, data):
    """
    Write dataset to local JSON storage in routes/data/<filename>.
    """
    if not filename.endswith(".json"):
        filename = f"{filename}.json"

    os.makedirs(DATA_DIR, exist_ok=True)
    path = os.path.join(DATA_DIR, filename)

    try:
        with open(path, "w", encoding="utf-8") as file:
            json.dump(data, file, indent=4)
        return True
    except Exception as e:
        logger.error(f"Error writing {path}: {e}")
        return False