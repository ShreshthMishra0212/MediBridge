import os

SECRET_KEY = os.getenv(
    "SECRET_KEY",
    "medibridge-prototype-secret-key"
)
