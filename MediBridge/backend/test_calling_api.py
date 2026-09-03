"""
Comprehensive test suite for MediBridge AI Calling Agent API Layer.
Tests caller identification, bilingual triage, emergency detection, doctor search,
availability resolution with booked-slot exclusion, atomic booking, security, and web integration.
"""

import sys
import os
import unittest
import json
import uuid

# Add backend and routes directories to sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROUTES_DIR = os.path.join(BASE_DIR, "routes")
if ROUTES_DIR not in sys.path:
    sys.path.insert(0, ROUTES_DIR)
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

import db
from index import app


class MediBridgeCallingAPITestCase(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        app.config["TESTING"] = True
        cls.api_key = os.getenv("EXOTEL_CALLING_API_KEY", "")
        cls.client = app.test_client()
        if cls.api_key:
            cls.client.environ_base["HTTP_X_API_KEY"] = cls.api_key
        db.init_db()

        cls.run_id = str(uuid.uuid4())[:8]
        # Phone numbers must be all-numeric; derive 5 digits from UUID int
        cls._phone_suffix = str(uuid.uuid4().int)[:5]
        cls.patient_phone = f"98111{cls._phone_suffix}"
        cls.patient_email = f"caller_patient_{cls.run_id}@example.com"
        cls.patient_name = f"Aman Verma {cls.run_id}"

        cls.other_patient_phone = f"98222{cls._phone_suffix}"
        cls.other_patient_email = f"other_patient_{cls.run_id}@example.com"

        cls.doctor_email = f"calling_doctor_{cls.run_id}@example.com"
        cls.doctor_name = f"Dr. Calling Cardiologist {cls.run_id}"

        # 1. Create primary test patient in SQLite
        cls.patient_id = str(uuid.uuid4())
        with db.get_db_context() as conn:
            conn.execute(
                "INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, 'hash', 'patient')",
                (cls.patient_id, cls.patient_name, cls.patient_email)
            )
            conn.execute(
                """
                INSERT INTO patients (id, name, email, age, gender, phone, address, medical_history)
                VALUES (?, ?, ?, 32, 'Male', ?, '45 Connaught Place, New Delhi', '[]')
                """,
                (cls.patient_id, cls.patient_name, cls.patient_email, cls.patient_phone)
            )

        # 2. Create second test patient in SQLite (for security testing)
        cls.other_patient_id = str(uuid.uuid4())
        with db.get_db_context() as conn:
            conn.execute(
                "INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, 'hash', 'patient')",
                (cls.other_patient_id, f"Other Patient {cls.run_id}", cls.other_patient_email)
            )
            conn.execute(
                """
                INSERT INTO patients (id, name, email, age, gender, phone, address, medical_history)
                VALUES (?, ?, ?, 40, 'Female', ?, 'Sector 62, Noida', '[]')
                """,
                (cls.other_patient_id, f"Other Patient {cls.run_id}", cls.other_patient_email, cls.other_patient_phone)
            )

        # 3. Create test doctor in SQLite
        cls.doctor_id = str(uuid.uuid4())
        with db.get_db_context() as conn:
            conn.execute(
                "INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, 'hash', 'doctor')",
                (cls.doctor_id, cls.doctor_name, cls.doctor_email)
            )
            conn.execute(
                """
                INSERT INTO doctors (id, name, email, specialization, description, location, experience, rating, available_slots)
                VALUES (?, ?, ?, 'Cardiologist', 'Senior Cardiac Specialist', 'Apollo Delhi', 15, 4.9, ?)
                """,
                (cls.doctor_id, cls.doctor_name, cls.doctor_email, json.dumps(["09:00 AM", "10:00 AM", "11:00 AM", "02:00 PM"]))
            )

        cls.booked_appointment_id = None

    # =====================================================
    # 1. CALLER IDENTIFICATION TESTS
    # =====================================================

    def test_01_identify_known_patient_standard_phone(self):
        """Test caller identification with standard 10-digit number."""
        res = self.client.post("/api/calling/identify", json={"phone": self.patient_phone})
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["success"])
        self.assertTrue(data["patient_found"])
        self.assertEqual(data["patient"]["id"], self.patient_id)
        self.assertIn(self.patient_name, data["spoken_greeting_en"])
        self.assertIn(self.patient_name, data["spoken_greeting_hi"])

    def test_02_identify_known_patient_with_e164_and_spaces(self):
        """Test caller identification with +91 prefix, spaces, and hyphens."""
        varied_phone = f"+91 {self.patient_phone[:5]}-{self.patient_phone[5:]}"
        res = self.client.post("/api/calling/identify", json={"phone": varied_phone})
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["success"])
        self.assertEqual(data["patient"]["id"], self.patient_id)

    def test_03_identify_unknown_caller(self):
        """Test caller identification for unknown phone number returns 404 with registration guidance."""
        res = self.client.post("/api/calling/identify", json={"phone": "9998887776"})
        self.assertEqual(res.status_code, 404)
        data = res.get_json()
        self.assertFalse(data["success"])
        self.assertFalse(data["patient_found"])
        self.assertEqual(data["error"], "PATIENT_NOT_FOUND")
        self.assertIn("spoken_greeting_en", data)
        self.assertIn("spoken_greeting_hi", data)

    def test_04_identify_missing_phone(self):
        """Test caller identification with empty payload returns 400."""
        res = self.client.post("/api/calling/identify", json={})
        self.assertEqual(res.status_code, 400)
        data = res.get_json()
        self.assertEqual(data["error"], "PHONE_REQUIRED")

    # =====================================================
    # 2. EMERGENCY DETECTION TESTS
    # =====================================================

    def test_05_emergency_detection_english(self):
        """Test emergency symptom in English triggers immediate emergency guidance."""
        payload = {
            "problem": "I have severe chest pain and cannot breathe, feeling like a heart attack",
            "language": "en"
        }
        res = self.client.post("/api/calling/recommend-specialty", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["success"])
        self.assertTrue(data["emergency"])
        self.assertEqual(data["action"], "emergency_guidance")
        self.assertEqual(data["emergency_number"], "112")
        self.assertIn("112", data["message_en"])

    def test_06_emergency_detection_hinglish(self):
        """Test emergency symptom in Hinglish triggers immediate emergency guidance."""
        payload = {
            "problem": "Patient behosh ho gaya hai aur bahut zyada bleeding ho rahi hai",
            "language": "hi"
        }
        res = self.client.post("/api/calling/recommend-specialty", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["success"])
        self.assertTrue(data["emergency"])
        self.assertEqual(data["action"], "emergency_guidance")

    # =====================================================
    # 3. SPECIALTY RECOMMENDATION TESTS
    # =====================================================

    def test_07_specialty_recommendation_english(self):
        """Test English symptom description routes to appropriate registered doctor specialty."""
        payload = {
            "problem": "I am experiencing irregular heart palpitations and high blood pressure",
            "language": "en"
        }
        res = self.client.post("/api/calling/recommend-specialty", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["success"])
        self.assertFalse(data["emergency"])
        self.assertEqual(data["specialty"], "Cardiologist")
        self.assertGreaterEqual(data["matching_doctor_count"], 1)
        self.assertIn("spoken_recommendation_en", data)
        self.assertIn("spoken_recommendation_hi", data)

    def test_08_specialty_recommendation_hindi_devanagari(self):
        """Test Hindi symptom description maps to appropriate registered specialty."""
        payload = {
            "problem": "चेहरे पर बहुत दाने और खुजली हो रही है, त्वचा लाल हो गई है",
            "language": "hi"
        }
        res = self.client.post("/api/calling/recommend-specialty", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["success"])
        self.assertEqual(data["specialty"], "Dermatologist")

    def test_09_specialty_recommendation_hinglish(self):
        """Test Hinglish symptom description maps to appropriate registered specialty."""
        payload = {
            "problem": "Cycle se gir gaya tha, ghutne mein aur wrist mein bahut pain hai",
            "language": "hinglish"
        }
        res = self.client.post("/api/calling/recommend-specialty", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["success"])
        self.assertIn(data["specialty"], ["Orthopedist", "Orthopedics", "General Physician"])

    def test_10_specialty_recommendation_constrained_to_registered_db(self):
        """Verify recommended specialty is strictly constrained to registered doctor specialties."""
        payload = {
            "problem": "I have persistent headaches and mild fatigue",
            "language": "en"
        }
        res = self.client.post("/api/calling/recommend-specialty", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn(data["specialty"], data["available_specialties"])

    # =====================================================
    # 4. DOCTOR SEARCH & RANKING TESTS
    # =====================================================

    def test_11_get_doctors_by_specialty(self):
        """Test doctor search filters by specialty and returns sorted real doctors."""
        res = self.client.get("/api/calling/doctors?specialty=Cardiologist")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["success"])
        self.assertGreater(data["count"], 0)
        self.assertTrue(all("Cardiologist" in d["specialization"] for d in data["doctors"]))
        self.assertIn("spoken_summary_en", data)
        self.assertIn("spoken_summary_hi", data)

    def test_12_get_doctors_all(self):
        """Test doctor search without specialty returns registered specialists."""
        res = self.client.get("/api/calling/doctors")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["success"])
        self.assertGreater(data["count"], 0)

    # =====================================================
    # 5. AVAILABILITY & BOOKED SLOT EXCLUSION TESTS
    # =====================================================

    def test_13_get_doctor_availability_natural_date(self):
        """Test availability lookup with natural date 'tomorrow'."""
        res = self.client.get(f"/api/calling/availability?doctor_id={self.doctor_id}&date=tomorrow")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["success"])
        self.assertEqual(data["doctor_id"], self.doctor_id)
        self.assertIn("09:00 AM", data["available_slots"])
        self.assertIn("10:00 AM", data["available_slots"])

    def test_14_get_doctor_availability_time_preference(self):
        """Test availability lookup with morning time preference."""
        res = self.client.get(f"/api/calling/availability?doctor_id={self.doctor_id}&date=tomorrow&time_preference=morning")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["success"])
        self.assertTrue(all("AM" in s or s.startswith("11") for s in data["available_slots"]))

    # =====================================================
    # 6. ATOMIC APPOINTMENT BOOKING TESTS
    # =====================================================

    def test_15_booking_without_confirmation_rejected(self):
        """Test booking fails when confirmed=false."""
        payload = {
            "phone": self.patient_phone,
            "patient_id": self.patient_id,
            "doctor_id": self.doctor_id,
            "date": "2026-09-15",
            "time": "10:00 AM",
            "confirmed": False
        }
        res = self.client.post("/api/calling/book", json=payload)
        self.assertEqual(res.status_code, 400)
        data = res.get_json()
        self.assertEqual(data["error"], "CONFIRMATION_REQUIRED")

    def test_16_booking_cross_patient_impersonation_rejected(self):
        """Security: Test caller cannot book on behalf of another patient ID."""
        payload = {
            "phone": self.patient_phone,
            "patient_id": self.other_patient_id,  # Mismatched patient ID!
            "doctor_id": self.doctor_id,
            "date": "2026-09-15",
            "time": "10:00 AM",
            "confirmed": True
        }
        res = self.client.post("/api/calling/book", json=payload)
        self.assertEqual(res.status_code, 403)
        data = res.get_json()
        self.assertEqual(data["error"], "IDENTITY_MISMATCH")

    def test_17_booking_successful_atomic(self):
        """Test successful atomic appointment booking in SQLite."""
        payload = {
            "phone": self.patient_phone,
            "patient_id": self.patient_id,
            "doctor_id": self.doctor_id,
            "date": "2026-09-15",
            "time": "10:00 AM",
            "confirmed": True
        }
        res = self.client.post("/api/calling/book", json=payload)
        self.assertEqual(res.status_code, 201)
        data = res.get_json()
        self.assertTrue(data["success"])
        self.assertIn("appointment", data)
        self.assertEqual(data["appointment"]["status"], "Confirmed")
        self.assertEqual(data["appointment"]["date"], "2026-09-15")
        self.assertEqual(data["appointment"]["time"], "10:00 AM")
        self.__class__.booked_appointment_id = data["appointment"]["id"]

        # Verify DB directly
        app_row = db.query_one("SELECT * FROM appointments WHERE id = ?", (self.booked_appointment_id,))
        self.assertIsNotNone(app_row)
        self.assertEqual(app_row["status"], "Confirmed")

    def test_18_booking_idempotent_duplicate_protection(self):
        """Test duplicate booking call by same patient returns existing confirmation without duplicate."""
        payload = {
            "phone": self.patient_phone,
            "patient_id": self.patient_id,
            "doctor_id": self.doctor_id,
            "date": "2026-09-15",
            "time": "10:00 AM",
            "confirmed": True
        }
        res = self.client.post("/api/calling/book", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["success"])
        self.assertTrue(data.get("already_booked"))
        self.assertEqual(data["appointment"]["id"], self.booked_appointment_id)

    def test_19_availability_excludes_booked_slot(self):
        """Verify availability endpoint now excludes 10:00 AM on 2026-09-15 because it was booked."""
        res = self.client.get(f"/api/calling/availability?doctor_id={self.doctor_id}&date=2026-09-15")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertNotIn("10:00 AM", data["available_slots"])
        self.assertIn("09:00 AM", data["available_slots"])

    def test_20_slot_conflict_rejection(self):
        """Test another patient trying to book the already booked slot is rejected with 409."""
        payload = {
            "phone": self.other_patient_phone,
            "patient_id": self.other_patient_id,
            "doctor_id": self.doctor_id,
            "date": "2026-09-15",
            "time": "10:00 AM",  # Already booked by first patient!
            "confirmed": True
        }
        res = self.client.post("/api/calling/book", json=payload)
        self.assertEqual(res.status_code, 409)
        data = res.get_json()
        self.assertEqual(data["error"], "SLOT_UNAVAILABLE")

    # =====================================================
    # 7. APPOINTMENT LOOKUP & CANCELLATION TESTS
    # =====================================================

    def test_21_get_caller_appointments(self):
        """Test caller can retrieve their active appointments."""
        res = self.client.get(f"/api/calling/appointments?phone={self.patient_phone}")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["success"])
        self.assertGreaterEqual(data["count"], 1)
        found = any(a["id"] == self.booked_appointment_id for a in data["appointments"])
        self.assertTrue(found)

    def test_22_cancel_appointment_unconfirmed_rejected(self):
        """Test cancellation fails when confirmed=false."""
        payload = {
            "phone": self.patient_phone,
            "appointment_id": self.booked_appointment_id,
            "confirmed": False
        }
        res = self.client.post("/api/calling/cancel", json=payload)
        self.assertEqual(res.status_code, 400)
        data = res.get_json()
        self.assertEqual(data["error"], "CONFIRMATION_REQUIRED")

    def test_23_cancel_appointment_confirmed(self):
        """Test successful cancellation updates status in SQLite to 'Cancelled'."""
        payload = {
            "phone": self.patient_phone,
            "appointment_id": self.booked_appointment_id,
            "confirmed": True
        }
        res = self.client.post("/api/calling/cancel", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["success"])

        # Verify in DB
        app_row = db.query_one("SELECT status FROM appointments WHERE id = ?", (self.booked_appointment_id,))
        self.assertEqual(app_row["status"], "Cancelled")

    # =====================================================
    # 8. WEB INTERFACE INTEGRATION TEST
    # =====================================================

    def test_24_web_compatibility(self):
        """Verify phone-booked appointment reflects in patient and doctor web endpoints."""
        # Book a fresh appointment via phone API
        payload = {
            "phone": self.patient_phone,
            "patient_id": self.patient_id,
            "doctor_id": self.doctor_id,
            "date": "2026-09-20",
            "time": "09:00 AM",
            "confirmed": True
        }
        res = self.client.post("/api/calling/book", json=payload)
        self.assertEqual(res.status_code, 201)
        fresh_app_id = res.get_json()["appointment"]["id"]

        # 1. Check patient appointments in DB (used by /api/patients/appointments)
        patient_apps = db.query_all("SELECT * FROM appointments WHERE patient_id = ?", (self.patient_id,))
        self.assertTrue(any(a["id"] == fresh_app_id for a in patient_apps))

        # 2. Check doctor appointments in DB (used by /api/doctors/appointments)
        doctor_apps = db.query_all("SELECT * FROM appointments WHERE doctor_id = ?", (self.doctor_id,))
        self.assertTrue(any(a["id"] == fresh_app_id for a in doctor_apps))

        # Clean up fresh appointment
        db.execute("DELETE FROM appointments WHERE id = ?", (fresh_app_id,))

    # =====================================================
    # 9. API KEY AUTHENTICATION TESTS
    # =====================================================

    def test_26_api_key_auth_rejected_when_missing(self):
        """Verify endpoints reject requests with 401 when EXOTEL_CALLING_API_KEY is configured and no key is provided."""
        if not self.api_key:
            self.skipTest("EXOTEL_CALLING_API_KEY not configured in environment")
        unauthed_client = app.test_client()
        unauthed_client.environ_base.pop("HTTP_X_API_KEY", None)
        res = unauthed_client.post("/api/calling/identify", json={"phone": self.patient_phone})
        self.assertEqual(res.status_code, 401)
        data = res.get_json()
        self.assertFalse(data["success"])
        self.assertEqual(data["error"], "UNAUTHORIZED")

    def test_27_api_key_auth_rejected_when_invalid(self):
        """Verify endpoints reject requests with 401 when an incorrect API key is provided."""
        if not self.api_key:
            self.skipTest("EXOTEL_CALLING_API_KEY not configured in environment")
        unauthed_client = app.test_client()
        unauthed_client.environ_base["HTTP_X_API_KEY"] = "invalid-secret-key-123"
        res = unauthed_client.get("/api/calling/doctors")
        self.assertEqual(res.status_code, 401)
        data = res.get_json()
        self.assertFalse(data["success"])
        self.assertEqual(data["error"], "UNAUTHORIZED")

    def test_28_api_key_auth_accepted_when_valid(self):
        """Verify endpoints accept requests with 200 when the correct X-API-Key is provided."""
        if not self.api_key:
            self.skipTest("EXOTEL_CALLING_API_KEY not configured in environment")
        authed_client = app.test_client()
        authed_client.environ_base["HTTP_X_API_KEY"] = self.api_key
        res = authed_client.get("/api/calling/doctors")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["success"])

    # =====================================================
    # 10. FINAL INTEGRITY & CLEANUP
    # =====================================================

    def test_29_db_referential_integrity(self):
        """Verify SQLite DB integrity and foreign keys remain 100% clean."""
        with db.get_db_context() as conn:
            integrity = conn.execute("PRAGMA integrity_check").fetchall()
            fk_violations = conn.execute("PRAGMA foreign_key_check").fetchall()
            self.assertEqual(integrity[0]["integrity_check"], "ok")
            self.assertEqual(len(fk_violations), 0)

    @classmethod
    def tearDownClass(cls):
        """Clean up test users and appointments."""
        try:
            if cls.booked_appointment_id:
                db.execute("DELETE FROM appointments WHERE id = ?", (cls.booked_appointment_id,))
            if cls.patient_id:
                db.execute("DELETE FROM appointments WHERE patient_id = ?", (cls.patient_id,))
                db.execute("DELETE FROM patients WHERE id = ?", (cls.patient_id,))
                db.execute("DELETE FROM users WHERE id = ?", (cls.patient_id,))
            if cls.other_patient_id:
                db.execute("DELETE FROM appointments WHERE patient_id = ?", (cls.other_patient_id,))
                db.execute("DELETE FROM patients WHERE id = ?", (cls.other_patient_id,))
                db.execute("DELETE FROM users WHERE id = ?", (cls.other_patient_id,))
            if cls.doctor_id:
                db.execute("DELETE FROM appointments WHERE doctor_id = ?", (cls.doctor_id,))
                db.execute("DELETE FROM doctors WHERE id = ?", (cls.doctor_id,))
                db.execute("DELETE FROM users WHERE id = ?", (cls.doctor_id,))
        except Exception as e:
            print("Error during test cleanup:", e)


if __name__ == "__main__":
    unittest.main(verbosity=2)
