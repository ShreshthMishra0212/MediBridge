import json
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")


def read_data(filename):
    path = os.path.join(DATA_DIR, filename)

    with open(path, "r") as file:
        return json.load(file)


def write_data(filename, data):
    path = os.path.join(DATA_DIR, filename)

    with open(path, "w") as file:
        json.dump(data, file, indent=4)