"""
MediBridge JSON to SQLite Data Migration Script
Migrates legacy JSON datasets into the normalized SQLite database with full transaction safety,
idempotency, and validation.
"""

import os
import sys
import json
import sqlite3
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("medibridge.migration")

# Set up paths
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
ROUTES_DIR = os.path.join(CURRENT_DIR, "routes")
if ROUTES_DIR not in sys.path:
    sys.path.insert(0, ROUTES_DIR)

import db

DATA_DIR = os.path.join(ROUTES_DIR, "data")


def load_json_file(filename):
    """Safely loads and returns JSON data from DATA_DIR."""
    if not filename.endswith(".json"):
        filename = f"{filename}.json"
    filepath = os.path.join(DATA_DIR, filename)
    if not os.path.exists(filepath):
        logger.warning(f"File not found: {filepath}")
        return []
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)


def migrate_all(db_path=None):
    """
    Executes the complete migration from JSON files to SQLite database.
    Returns a dict containing migration counts, validation results, and status.
    """
    # 1. Initialize schema
    db.init_db(db_path)
    resolved_db_path = db.get_db_path(db_path)
    logger.info(f"Starting migration to database: {resolved_db_path}")

    # Load JSON files
    raw_users = load_json_file("users.json")
    raw_patients = load_json_file("patients.json")
    raw_doctors = load_json_file("doctors.json")
    raw_appointments = load_json_file("appointments.json")
    raw_prescriptions = load_json_file("prescriptions.json")

    # Extract medical documents from patients
    raw_medical_docs = []
    for p in raw_patients:
        p_id = p.get("id")
        for doc in p.get("medical_documents", []):
            raw_medical_docs.append({
                "id": doc.get("id"),
                "patient_id": p_id,
                "original_name": doc.get("original_name", "document.pdf"),
                "filename": doc.get("filename", ""),
                "path": doc.get("path", "")
            })

    stats = {
        "users": {"json": len(raw_users), "migrated": 0, "skipped": 0, "failed": 0},
        "patients": {"json": len(raw_patients), "migrated": 0, "skipped": 0, "failed": 0},
        "doctors": {"json": len(raw_doctors), "migrated": 0, "skipped": 0, "failed": 0},
        "medical_documents": {"json": len(raw_medical_docs), "migrated": 0, "skipped": 0, "failed": 0},
        "appointments": {"json": len(raw_appointments), "migrated": 0, "skipped": 0, "failed": 0},
        "prescriptions": {"json": len(raw_prescriptions), "migrated": 0, "skipped": 0, "failed": 0},
    }

    # Execute all migrations within a single atomic transaction
    with db.get_db_context(resolved_db_path) as conn:
        cur = conn.cursor()

        # ----------------------------------------------------
        # 1. MIGRATE USERS
        # ----------------------------------------------------
        logger.info(f"Migrating {len(raw_users)} users...")
        for u in raw_users:
            try:
                cur.execute(
                    """
                    INSERT INTO users (id, name, email, password, role)
                    VALUES (?, ?, ?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET
                        name = excluded.name,
                        email = excluded.email,
                        password = excluded.password,
                        role = excluded.role
                    """,
                    (
                        u["id"],
                        u.get("name", ""),
                        u["email"],
                        u.get("password", ""),
                        u.get("role", "patient")
                    )
                )
                stats["users"]["migrated"] += 1
            except Exception as e:
                logger.error(f"Failed to migrate user {u.get('id')}: {e}")
                stats["users"]["failed"] += 1
                raise

        # ----------------------------------------------------
        # 2. MIGRATE PATIENTS
        # ----------------------------------------------------
        logger.info(f"Migrating {len(raw_patients)} patients...")
        for p in raw_patients:
            try:
                med_hist = p.get("medical_history", [])
                med_hist_str = json.dumps(med_hist) if not isinstance(med_hist, str) else med_hist

                cur.execute(
                    """
                    INSERT INTO patients (id, name, email, age, gender, phone, address, medical_history)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET
                        name = excluded.name,
                        email = excluded.email,
                        age = excluded.age,
                        gender = excluded.gender,
                        phone = excluded.phone,
                        address = excluded.address,
                        medical_history = excluded.medical_history
                    """,
                    (
                        p["id"],
                        p.get("name", ""),
                        p.get("email", ""),
                        p.get("age"),
                        p.get("gender"),
                        p.get("phone"),
                        p.get("address"),
                        med_hist_str
                    )
                )
                stats["patients"]["migrated"] += 1
            except Exception as e:
                logger.error(f"Failed to migrate patient {p.get('id')}: {e}")
                stats["patients"]["failed"] += 1
                raise

        # ----------------------------------------------------
        # 3. MIGRATE DOCTORS
        # ----------------------------------------------------
        logger.info(f"Migrating {len(raw_doctors)} doctors...")
        for d in raw_doctors:
            try:
                avail_slots = d.get("available_slots", [])
                avail_slots_str = json.dumps(avail_slots) if not isinstance(avail_slots, str) else avail_slots

                cur.execute(
                    """
                    INSERT INTO doctors (id, name, email, specialization, description, location, experience, rating, available_slots)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET
                        name = excluded.name,
                        email = excluded.email,
                        specialization = excluded.specialization,
                        description = excluded.description,
                        location = excluded.location,
                        experience = excluded.experience,
                        rating = excluded.rating,
                        available_slots = excluded.available_slots
                    """,
                    (
                        d["id"],
                        d.get("name", ""),
                        d.get("email", ""),
                        d.get("specialization"),
                        d.get("description"),
                        d.get("location"),
                        d.get("experience", 0),
                        d.get("rating", 0.0),
                        avail_slots_str
                    )
                )
                stats["doctors"]["migrated"] += 1
            except Exception as e:
                logger.error(f"Failed to migrate doctor {d.get('id')}: {e}")
                stats["doctors"]["failed"] += 1
                raise

        # ----------------------------------------------------
        # 4. MIGRATE MEDICAL DOCUMENTS
        # ----------------------------------------------------
        logger.info(f"Migrating {len(raw_medical_docs)} medical documents...")
        for doc in raw_medical_docs:
            try:
                cur.execute(
                    """
                    INSERT INTO medical_documents (id, patient_id, original_name, filename, path)
                    VALUES (?, ?, ?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET
                        patient_id = excluded.patient_id,
                        original_name = excluded.original_name,
                        filename = excluded.filename,
                        path = excluded.path
                    """,
                    (
                        doc["id"],
                        doc["patient_id"],
                        doc["original_name"],
                        doc["filename"],
                        doc["path"]
                    )
                )
                stats["medical_documents"]["migrated"] += 1
            except Exception as e:
                logger.error(f"Failed to migrate medical document {doc.get('id')}: {e}")
                stats["medical_documents"]["failed"] += 1
                raise

        # ----------------------------------------------------
        # 5. MIGRATE APPOINTMENTS
        # ----------------------------------------------------
        logger.info(f"Migrating {len(raw_appointments)} appointments...")
        for a in raw_appointments:
            try:
                cur.execute(
                    """
                    INSERT INTO appointments (
                        id, patient_id, doctor_id, doctorName, specialist, area, rating,
                        date, time, status, requested_date, requested_time, suggested_date,
                        suggested_time, join_url, event_id, meeting_start_time, meeting_expires_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET
                        patient_id = excluded.patient_id,
                        doctor_id = excluded.doctor_id,
                        doctorName = excluded.doctorName,
                        specialist = excluded.specialist,
                        area = excluded.area,
                        rating = excluded.rating,
                        date = excluded.date,
                        time = excluded.time,
                        status = excluded.status,
                        requested_date = excluded.requested_date,
                        requested_time = excluded.requested_time,
                        suggested_date = excluded.suggested_date,
                        suggested_time = excluded.suggested_time,
                        join_url = excluded.join_url,
                        event_id = excluded.event_id,
                        meeting_start_time = excluded.meeting_start_time,
                        meeting_expires_at = excluded.meeting_expires_at
                    """,
                    (
                        a["id"],
                        a["patient_id"],
                        a["doctor_id"],
                        a.get("doctorName", ""),
                        a.get("specialist"),
                        a.get("area"),
                        a.get("rating", 0.0),
                        a.get("date", ""),
                        a.get("time", ""),
                        a.get("status", "Pending"),
                        a.get("requested_date"),
                        a.get("requested_time"),
                        a.get("suggested_date"),
                        a.get("suggested_time"),
                        a.get("join_url"),
                        a.get("event_id"),
                        a.get("meeting_start_time"),
                        a.get("meeting_expires_at")
                    )
                )
                stats["appointments"]["migrated"] += 1
            except Exception as e:
                logger.error(f"Failed to migrate appointment {a.get('id')}: {e}")
                stats["appointments"]["failed"] += 1
                raise

        # ----------------------------------------------------
        # 6. MIGRATE PRESCRIPTIONS
        # ----------------------------------------------------
        logger.info(f"Migrating {len(raw_prescriptions)} prescriptions...")
        for p in raw_prescriptions:
            try:
                meds = p.get("medicines", [])
                meds_str = json.dumps(meds) if not isinstance(meds, str) else meds

                cur.execute(
                    """
                    INSERT INTO prescriptions (
                        id, appointment_id, doctor_id, doctor_name, specialization,
                        patient_id, patient_name, date, diagnosis, medicines, advice,
                        follow_up_date, pdf, docx
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET
                        appointment_id = excluded.appointment_id,
                        doctor_id = excluded.doctor_id,
                        doctor_name = excluded.doctor_name,
                        specialization = excluded.specialization,
                        patient_id = excluded.patient_id,
                        patient_name = excluded.patient_name,
                        date = excluded.date,
                        diagnosis = excluded.diagnosis,
                        medicines = excluded.medicines,
                        advice = excluded.advice,
                        follow_up_date = excluded.follow_up_date,
                        pdf = excluded.pdf,
                        docx = excluded.docx
                    """,
                    (
                        p["id"],
                        p["appointment_id"],
                        p["doctor_id"],
                        p.get("doctor_name", ""),
                        p.get("specialization"),
                        p["patient_id"],
                        p.get("patient_name", ""),
                        p.get("date", ""),
                        p.get("diagnosis", ""),
                        meds_str,
                        p.get("advice"),
                        p.get("follow_up_date"),
                        p.get("pdf"),
                        p.get("docx")
                    )
                )
                stats["prescriptions"]["migrated"] += 1
            except Exception as e:
                logger.error(f"Failed to migrate prescription {p.get('id')}: {e}")
                stats["prescriptions"]["failed"] += 1
                raise

    logger.info("Data migration completed successfully. Running verification checks...")
    validation = run_validation(
        raw_users, raw_patients, raw_doctors, raw_medical_docs, raw_appointments, raw_prescriptions, resolved_db_path
    )

    return {
        "stats": stats,
        "validation": validation,
        "status": "SUCCESS" if validation["all_passed"] else "FAILED"
    }


def run_validation(raw_users, raw_patients, raw_doctors, raw_medical_docs, raw_appointments, raw_prescriptions, db_path):
    """
    Validates record counts, foreign key constraints, SQLite integrity, and field-level content matching.
    """
    results = {
        "counts": {},
        "referential_integrity": {},
        "content_verification": {},
        "integrity_check": None,
        "foreign_key_check": None,
        "all_passed": True
    }

    with db.get_db_context(db_path) as conn:
        cur = conn.cursor()

        # 1. Count Verifications
        tables = [
            ("users", len(raw_users)),
            ("patients", len(raw_patients)),
            ("doctors", len(raw_doctors)),
            ("medical_documents", len(raw_medical_docs)),
            ("appointments", len(raw_appointments)),
            ("prescriptions", len(raw_prescriptions))
        ]

        for tbl, expected_count in tables:
            cur.execute(f"SELECT COUNT(*) FROM {tbl};")
            actual_count = cur.fetchone()[0]
            passed = actual_count == expected_count
            results["counts"][tbl] = {
                "json_count": expected_count,
                "sqlite_count": actual_count,
                "match": passed
            }
            if not passed:
                results["all_passed"] = False

        # 2. Referential Integrity
        # Every patient.id exists in users.id
        cur.execute("SELECT COUNT(*) FROM patients WHERE id NOT IN (SELECT id FROM users);")
        orphaned_patients = cur.fetchone()[0]
        results["referential_integrity"]["patients_in_users"] = (orphaned_patients == 0)

        # Every doctor.id exists in users.id
        cur.execute("SELECT COUNT(*) FROM doctors WHERE id NOT IN (SELECT id FROM users);")
        orphaned_doctors = cur.fetchone()[0]
        results["referential_integrity"]["doctors_in_users"] = (orphaned_doctors == 0)

        # Every appointment.patient_id exists in patients.id
        cur.execute("SELECT COUNT(*) FROM appointments WHERE patient_id NOT IN (SELECT id FROM patients);")
        orphaned_app_patients = cur.fetchone()[0]
        results["referential_integrity"]["appointments_patient_id"] = (orphaned_app_patients == 0)

        # Every appointment.doctor_id exists in doctors.id
        cur.execute("SELECT COUNT(*) FROM appointments WHERE doctor_id NOT IN (SELECT id FROM doctors);")
        orphaned_app_doctors = cur.fetchone()[0]
        results["referential_integrity"]["appointments_doctor_id"] = (orphaned_app_doctors == 0)

        # Every prescription.appointment_id exists in appointments.id
        cur.execute("SELECT COUNT(*) FROM prescriptions WHERE appointment_id NOT IN (SELECT id FROM appointments);")
        orphaned_rx_app = cur.fetchone()[0]
        results["referential_integrity"]["prescriptions_appointment_id"] = (orphaned_rx_app == 0)

        # Every prescription.patient_id exists in patients.id
        cur.execute("SELECT COUNT(*) FROM prescriptions WHERE patient_id NOT IN (SELECT id FROM patients);")
        orphaned_rx_patients = cur.fetchone()[0]
        results["referential_integrity"]["prescriptions_patient_id"] = (orphaned_rx_patients == 0)

        # Every prescription.doctor_id exists in doctors.id
        cur.execute("SELECT COUNT(*) FROM prescriptions WHERE doctor_id NOT IN (SELECT id FROM doctors);")
        orphaned_rx_doctors = cur.fetchone()[0]
        results["referential_integrity"]["prescriptions_doctor_id"] = (orphaned_rx_doctors == 0)

        # Every medical_documents.patient_id exists in patients.id
        cur.execute("SELECT COUNT(*) FROM medical_documents WHERE patient_id NOT IN (SELECT id FROM patients);")
        orphaned_docs = cur.fetchone()[0]
        results["referential_integrity"]["medical_documents_patient_id"] = (orphaned_docs == 0)

        for check_name, passed in results["referential_integrity"].items():
            if not passed:
                results["all_passed"] = False

        # 3. Content Fidelity Verification
        # Check users content
        for u in raw_users:
            cur.execute("SELECT name, email, role FROM users WHERE id = ?", (u["id"],))
            row = cur.fetchone()
            if not row or row["email"] != u["email"] or row["role"] != u["role"]:
                results["content_verification"]["users"] = False
                results["all_passed"] = False
                break
        else:
            results["content_verification"]["users"] = True

        # Check patients content
        for p in raw_patients:
            cur.execute("SELECT name, email, age, gender FROM patients WHERE id = ?", (p["id"],))
            row = cur.fetchone()
            if not row or row["name"] != p["name"] or row["age"] != p["age"]:
                results["content_verification"]["patients"] = False
                results["all_passed"] = False
                break
        else:
            results["content_verification"]["patients"] = True

        # Check doctors content
        for d in raw_doctors:
            cur.execute("SELECT name, email, specialization, rating FROM doctors WHERE id = ?", (d["id"],))
            row = cur.fetchone()
            if not row or row["name"] != d["name"] or row["specialization"] != d["specialization"]:
                results["content_verification"]["doctors"] = False
                results["all_passed"] = False
                break
        else:
            results["content_verification"]["doctors"] = True

        # Check appointments content
        for a in raw_appointments:
            cur.execute("SELECT patient_id, doctor_id, date, time, status, join_url FROM appointments WHERE id = ?", (a["id"],))
            row = cur.fetchone()
            if not row or row["patient_id"] != a["patient_id"] or row["doctor_id"] != a["doctor_id"] or row["status"] != a["status"]:
                results["content_verification"]["appointments"] = False
                results["all_passed"] = False
                break
        else:
            results["content_verification"]["appointments"] = True

        # Check prescriptions content (including JSON medicines parsing)
        for pr in raw_prescriptions:
            cur.execute("SELECT patient_id, doctor_id, diagnosis, medicines FROM prescriptions WHERE id = ?", (pr["id"],))
            row = cur.fetchone()
            if not row or row["patient_id"] != pr["patient_id"] or row["diagnosis"] != pr["diagnosis"]:
                results["content_verification"]["prescriptions"] = False
                results["all_passed"] = False
                break
            # Verify medicines JSON deserialization
            parsed_meds = json.loads(row["medicines"])
            if parsed_meds != pr.get("medicines", []):
                results["content_verification"]["prescriptions_medicines_fidelity"] = False
                results["all_passed"] = False
                break
        else:
            results["content_verification"]["prescriptions"] = True

        # 4. PRAGMA integrity_check & foreign_key_check
        cur.execute("PRAGMA integrity_check;")
        integrity_rows = [r[0] for r in cur.fetchall()]
        results["integrity_check"] = integrity_rows

        cur.execute("PRAGMA foreign_key_check;")
        fk_rows = [list(r) for r in cur.fetchall()]
        results["foreign_key_check"] = fk_rows

        if integrity_rows != ["ok"] or len(fk_rows) > 0:
            results["all_passed"] = False

    return results


def print_report(migration_result):
    """Prints a formatted migration and validation report."""
    stats = migration_result["stats"]
    val = migration_result["validation"]

    print("\n" + "=" * 60)
    print("      MEDIBRIDGE JSON -> SQLITE MIGRATION REPORT")
    print("=" * 60)

    print("\n[Record Counts]")
    print(f"Users:              {stats['users']['json']} JSON -> {stats['users']['migrated']} SQLite")
    print(f"Patients:           {stats['patients']['json']} JSON -> {stats['patients']['migrated']} SQLite")
    print(f"Doctors:            {stats['doctors']['json']} JSON -> {stats['doctors']['migrated']} SQLite")
    print(f"Medical documents:  {stats['medical_documents']['json']} JSON -> {stats['medical_documents']['migrated']} SQLite")
    print(f"Appointments:       {stats['appointments']['json']} JSON -> {stats['appointments']['migrated']} SQLite")
    print(f"Prescriptions:      {stats['prescriptions']['json']} JSON -> {stats['prescriptions']['migrated']} SQLite")

    total_skipped = sum(s["skipped"] for s in stats.values())
    total_failed = sum(s["failed"] for s in stats.values())

    print("\n[Execution Statistics]")
    print(f"Skipped duplicate records: {total_skipped}")
    print(f"Failed records:            {total_failed}")

    print("\n[Referential Integrity Checks]")
    for check, passed in val["referential_integrity"].items():
        status = "PASSED" if passed else "FAILED"
        print(f"  * {check}: {status}")

    print("\n[Content Fidelity Checks]")
    for check, passed in val["content_verification"].items():
        status = "PASSED" if passed else "FAILED"
        print(f"  * {check}: {status}")

    print("\n[SQLite Health Diagnostics]")
    print(f"  * PRAGMA integrity_check:   {val['integrity_check']}")
    print(f"  * PRAGMA foreign_key_check: {len(val['foreign_key_check'])} violations {val['foreign_key_check']}")

    print("\n" + "=" * 60)
    print(f"OVERALL MIGRATION STATUS: {migration_result['status']}")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    result = migrate_all()
    print_report(result)
    if not result["validation"]["all_passed"]:
        sys.exit(1)
