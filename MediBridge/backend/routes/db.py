"""
MediBridge Database Layer (SQLite)
Provides connection management, schema initialization, and parameterized query helpers.
"""

import os
import json
import sqlite3
import logging
from contextlib import contextmanager

logger = logging.getLogger("medibridge.db")

# Default database path: backend/data/medibridge.db
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if os.path.basename(BASE_DIR) == "routes":
    BACKEND_DIR = os.path.dirname(BASE_DIR)
else:
    BACKEND_DIR = BASE_DIR

DEFAULT_DB_DIR = os.path.join(BACKEND_DIR, "data")
DEFAULT_DB_PATH = os.path.join(DEFAULT_DB_DIR, "medibridge.db")


def get_db_path(custom_path=None):
    """
    Returns the resolved SQLite database file path.
    Can be overridden via MEDIBRIDGE_DB_PATH environment variable or custom_path argument.
    """
    if custom_path:
        return custom_path
    return os.getenv("MEDIBRIDGE_DB_PATH", DEFAULT_DB_PATH)


def get_db_connection(db_path=None):
    """
    Creates and returns a new sqlite3.Connection with:
    - row_factory set to sqlite3.Row
    - PRAGMA foreign_keys = ON enabled
    - PRAGMA journal_mode = WAL enabled for performance/concurrency
    """
    path = get_db_path(db_path)
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)

    conn = sqlite3.connect(path, timeout=30.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA journal_mode = WAL;")
    return conn


@contextmanager
def get_db_context(db_path=None):
    """
    Context manager for database operations with automatic commit and rollback.
    Usage:
        with get_db_context() as conn:
            conn.execute("INSERT INTO ...", (...))
    """
    conn = get_db_connection(db_path)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


SCHEMA_SQL = """
PRAGMA foreign_keys = ON;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('patient', 'doctor')),
    created_at TEXT DEFAULT (DATETIME('now'))
);

-- 2. Patients Table
CREATE TABLE IF NOT EXISTS patients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    age INTEGER,
    gender TEXT,
    phone TEXT,
    address TEXT,
    medical_history TEXT DEFAULT '[]',
    created_at TEXT DEFAULT (DATETIME('now')),
    updated_at TEXT DEFAULT (DATETIME('now')),
    FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Doctors Table
CREATE TABLE IF NOT EXISTS doctors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    specialization TEXT,
    description TEXT,
    location TEXT,
    experience INTEGER DEFAULT 0,
    rating REAL DEFAULT 0.0,
    available_slots TEXT DEFAULT '[]',
    created_at TEXT DEFAULT (DATETIME('now')),
    updated_at TEXT DEFAULT (DATETIME('now')),
    FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. Medical Documents Table (normalized from patient medical_documents array)
CREATE TABLE IF NOT EXISTS medical_documents (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL,
    original_name TEXT NOT NULL,
    filename TEXT NOT NULL,
    path TEXT NOT NULL,
    uploaded_at TEXT DEFAULT (DATETIME('now')),
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- 5. Appointments Table
CREATE TABLE IF NOT EXISTS appointments (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL,
    doctor_id TEXT NOT NULL,
    doctorName TEXT NOT NULL,
    specialist TEXT,
    area TEXT,
    rating REAL DEFAULT 0.0,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending',
    requested_date TEXT,
    requested_time TEXT,
    suggested_date TEXT,
    suggested_time TEXT,
    join_url TEXT,
    event_id TEXT,
    meeting_start_time TEXT,
    meeting_expires_at TEXT,
    created_at TEXT DEFAULT (DATETIME('now')),
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE RESTRICT,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE RESTRICT
);

-- 6. Prescriptions Table
CREATE TABLE IF NOT EXISTS prescriptions (
    id TEXT PRIMARY KEY,
    appointment_id TEXT NOT NULL,
    doctor_id TEXT NOT NULL,
    doctor_name TEXT NOT NULL,
    specialization TEXT,
    patient_id TEXT NOT NULL,
    patient_name TEXT NOT NULL,
    date TEXT NOT NULL,
    diagnosis TEXT NOT NULL,
    medicines TEXT NOT NULL DEFAULT '[]',
    advice TEXT,
    follow_up_date TEXT,
    pdf TEXT,
    docx TEXT,
    created_at TEXT DEFAULT (DATETIME('now')),
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE RESTRICT,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE RESTRICT,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE RESTRICT
);

-- Indexes for fast querying
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

CREATE INDEX IF NOT EXISTS idx_doctors_specialization ON doctors(specialization);

CREATE INDEX IF NOT EXISTS idx_medical_docs_patient_id ON medical_documents(patient_id);

CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_date ON appointments(doctor_id, date);

CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_id ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor_id ON prescriptions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_appointment_id ON prescriptions(appointment_id);
"""


def init_db(db_path=None):
    """
    Initializes the SQLite database and executes the schema DDL.
    Safe to run repeatedly (uses CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS).
    Returns True upon successful creation.
    """
    resolved_path = get_db_path(db_path)
    logger.info(f"Initializing database at: {resolved_path}")
    with get_db_context(resolved_path) as conn:
        conn.executescript(SCHEMA_SQL)
    logger.info("Database schema initialized successfully.")
    return True


def row_to_dict(row):
    """
    Converts a sqlite3.Row object to a standard Python dictionary.
    Returns None if the input row is None.
    """
    if row is None:
        return None
    return dict(row)


def rows_to_dict_list(rows):
    """
    Converts an iterable of sqlite3.Row objects to a list of Python dictionaries.
    """
    if not rows:
        return []
    return [dict(r) for r in rows]


def query_one(sql, params=(), db_path=None):
    """
    Executes a parameterized SELECT query and returns a single row as a dictionary, or None.
    """
    with get_db_context(db_path) as conn:
        cur = conn.cursor()
        cur.execute(sql, params)
        row = cur.fetchone()
        return row_to_dict(row)


def query_all(sql, params=(), db_path=None):
    """
    Executes a parameterized SELECT query and returns all matching rows as a list of dictionaries.
    """
    with get_db_context(db_path) as conn:
        cur = conn.cursor()
        cur.execute(sql, params)
        rows = cur.fetchall()
        return rows_to_dict_list(rows)


def execute(sql, params=(), db_path=None):
    """
    Executes a parameterized INSERT/UPDATE/DELETE statement and returns the cursor rowcount.
    """
    with get_db_context(db_path) as conn:
        cur = conn.cursor()
        cur.execute(sql, params)
        return cur.rowcount


def execute_many(sql, seq_of_params, db_path=None):
    """
    Executes a parameterized batch operation using executemany.
    """
    with get_db_context(db_path) as conn:
        cur = conn.cursor()
        cur.executemany(sql, seq_of_params)
        return cur.rowcount


def parse_json(val, default=None):
    """
    Safely deserializes a JSON string into a Python object (list or dict).
    If val is already a Python list or dict, it is returned as is.
    If val is None or invalid JSON, returns default (or [] if default is None).
    """
    if default is None:
        default = []
    if val is None:
        return default
    if isinstance(val, (list, dict)):
        return val
    if isinstance(val, str):
        try:
            return json.loads(val)
        except Exception:
            return default
    return default


def check_integrity(db_path=None):
    """
    Executes SQLite integrity check and foreign key check.
    Returns a dict with 'integrity_check' and 'foreign_key_violations'.
    """
    with get_db_context(db_path) as conn:
        cur = conn.cursor()
        cur.execute("PRAGMA integrity_check;")
        integrity_rows = [r[0] for r in cur.fetchall()]

        cur.execute("PRAGMA foreign_key_check;")
        fk_violations = [dict(r) if isinstance(r, sqlite3.Row) else list(r) for r in cur.fetchall()]

        return {
            "integrity_check": integrity_rows,
            "foreign_key_violations": fk_violations,
            "ok": integrity_rows == ["ok"] and len(fk_violations) == 0
        }

