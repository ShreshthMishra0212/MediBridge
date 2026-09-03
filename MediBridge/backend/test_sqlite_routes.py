"""
Comprehensive automated integration test suite for MediBridge SQLite routes.
Tests Auth, Patient, and Doctor flows using Flask test client against SQLite.
"""

import sys
import os
import unittest
import json
import uuid
import sqlite3

# Add backend and routes directories to sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROUTES_DIR = os.path.join(BASE_DIR, "routes")
if ROUTES_DIR not in sys.path:
    sys.path.insert(0, ROUTES_DIR)
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

import db
from index import app


class MediBridgeSQLiteRoutesTestCase(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        app.config["TESTING"] = True
        cls.client = app.test_client()
        db.init_db()

        # Generate unique test email prefixes
        cls.run_id = str(uuid.uuid4())[:8]
        cls.patient_email = f"test_patient_{cls.run_id}@example.com"
        cls.doctor_email = f"test_doctor_{cls.run_id}@example.com"
        cls.password = "TestPassword123!"

        cls.patient_token = None
        cls.patient_id = None
        cls.doctor_token = None
        cls.doctor_id = None
        cls.appointment_id = None
        cls.prescription_id = None

    def test_01_database_integrity_and_foreign_keys(self):
        """Verify DB integrity and foreign keys are intact."""
        with db.get_db_context() as conn:
            integrity = conn.execute("PRAGMA integrity_check").fetchall()
            fk_violations = conn.execute("PRAGMA foreign_key_check").fetchall()
            
            self.assertEqual(len(integrity), 1)
            self.assertEqual(integrity[0]["integrity_check"], "ok")
            self.assertEqual(len(fk_violations), 0, f"Foreign key violations found: {fk_violations}")

    def test_02_register_patient(self):
        """Test patient registration -> inserts into users & patients atomically."""
        payload = {
            "name": f"Test Patient {self.run_id}",
            "email": self.patient_email,
            "password": self.password,
            "role": "patient",
            "age": 28,
            "gender": "Female",
            "phone": "+91 9876543210",
            "address": "123 Test Street, New Delhi"
        }
        res = self.client.post("/api/auth/register", json=payload)
        self.assertEqual(res.status_code, 201)
        data = res.get_json()
        self.assertIn("user", data)
        self.assertEqual(data["user"]["email"], self.patient_email)
        self.assertEqual(data["user"]["role"], "patient")
        self.__class__.patient_id = data["user"]["id"]

        # Verify DB directly
        user_row = db.query_one("SELECT * FROM users WHERE email = ?", (self.patient_email,))
        self.assertIsNotNone(user_row)
        patient_row = db.query_one("SELECT * FROM patients WHERE id = ?", (self.patient_id,))
        self.assertIsNotNone(patient_row)
        self.assertEqual(patient_row["age"], 28)

    def test_03_register_doctor(self):
        """Test doctor registration -> inserts into users & doctors atomically."""
        payload = {
            "name": f"Dr. Test {self.run_id}",
            "email": self.doctor_email,
            "password": self.password,
            "role": "doctor",
            "specialization": "Cardiologist",
            "experience": "10 years",
            "location": "Apollo Hospital, Delhi",
            "description": "Experienced cardiologist specialist."
        }
        res = self.client.post("/api/auth/register", json=payload)
        self.assertEqual(res.status_code, 201)
        data = res.get_json()
        self.assertIn("user", data)
        self.assertEqual(data["user"]["email"], self.doctor_email)
        self.assertEqual(data["user"]["role"], "doctor")
        self.__class__.doctor_id = data["user"]["id"]

        # Verify DB directly
        doctor_row = db.query_one("SELECT * FROM doctors WHERE id = ?", (self.doctor_id,))
        self.assertIsNotNone(doctor_row)
        self.assertEqual(doctor_row["specialization"], "Cardiologist")

    def test_04_duplicate_registration_prevented(self):
        """Test duplicate registration returns 409."""
        payload = {
            "name": "Duplicate Test",
            "email": self.patient_email,
            "password": "some_password",
            "role": "patient"
        }
        res = self.client.post("/api/auth/register", json=payload)
        self.assertEqual(res.status_code, 409)

    def test_05_login_patient_and_doctor(self):
        """Test login returns JWT token for patient and doctor."""
        # Patient login
        res_p = self.client.post("/api/auth/login", json={
            "email": self.patient_email,
            "password": self.password
        })
        self.assertEqual(res_p.status_code, 200)
        data_p = res_p.get_json()
        self.assertIn("token", data_p)
        self.__class__.patient_token = data_p["token"]

        # Doctor login
        res_d = self.client.post("/api/auth/login", json={
            "email": self.doctor_email,
            "password": self.password
        })
        self.assertEqual(res_d.status_code, 200)
        data_d = res_d.get_json()
        self.assertIn("token", data_d)
        self.__class__.doctor_token = data_d["token"]

        # Invalid password
        res_inv = self.client.post("/api/auth/login", json={
            "email": self.patient_email,
            "password": "wrong_password"
        })
        self.assertEqual(res_inv.status_code, 401)

    def test_06_patient_profile_get_and_update(self):
        """Test GET and PUT /api/patients/me."""
        headers = {"Authorization": f"Bearer {self.patient_token}"}
        
        # GET profile
        res = self.client.get("/api/patients/me", headers=headers)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("patient", data)
        self.assertEqual(data["patient"]["email"], self.patient_email)
        self.assertIn("medical_documents", data["patient"])
        self.assertIsInstance(data["patient"]["medical_documents"], list)

        # PUT profile
        res_put = self.client.put("/api/patients/me", headers=headers, json={
            "phone": "+91 9999988888",
            "address": "456 Updated Address, New Delhi"
        })
        self.assertEqual(res_put.status_code, 200)
        updated_data = res_put.get_json()
        self.assertEqual(updated_data["patient"]["phone"], "+91 9999988888")
        self.assertEqual(updated_data["patient"]["address"], "456 Updated Address, New Delhi")

    def test_07_patient_get_doctors(self):
        """Test GET /api/patients/doctors returns doctors with available_slots parsed as list."""
        headers = {"Authorization": f"Bearer {self.patient_token}"}
        res = self.client.get("/api/patients/doctors", headers=headers)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("doctors", data)
        self.assertGreater(len(data["doctors"]), 0)
        for doc in data["doctors"]:
            self.assertIsInstance(doc.get("available_slots"), list)

    def test_08_patient_book_appointment(self):
        """Test POST /api/patients/appointments creates appointment in SQLite."""
        headers = {"Authorization": f"Bearer {self.patient_token}"}
        payload = {
            "doctor_id": self.doctor_id,
            "doctorName": f"Dr. Test {self.run_id}",
            "specialist": "Cardiologist",
            "date": "2026-09-10",
            "time": "10:30 AM"
        }
        res = self.client.post("/api/patients/appointments", headers=headers, json=payload)
        self.assertEqual(res.status_code, 201)
        data = res.get_json()
        self.assertIn("appointment", data)
        self.assertEqual(data["appointment"]["status"], "Pending")
        self.__class__.appointment_id = data["appointment"]["id"]

        # Verify DB directly
        app_row = db.query_one("SELECT * FROM appointments WHERE id = ?", (self.appointment_id,))
        self.assertIsNotNone(app_row)
        self.assertEqual(app_row["doctor_id"], self.doctor_id)
        self.assertEqual(app_row["patient_id"], self.patient_id)

    def test_09_doctor_get_appointments_and_profile(self):
        """Test doctor profile and appointment viewing."""
        headers = {"Authorization": f"Bearer {self.doctor_token}"}
        
        # Profile GET
        res_prof = self.client.get("/api/doctors/profile", headers=headers)
        self.assertEqual(res_prof.status_code, 200)
        self.assertEqual(res_prof.get_json()["doctor"]["id"], self.doctor_id)

        # Profile PUT
        res_prof_put = self.client.put("/api/doctors/profile", headers=headers, json={
            "description": "Updated doctor description."
        })
        self.assertEqual(res_prof_put.status_code, 200)
        self.assertEqual(res_prof_put.get_json()["doctor"]["description"], "Updated doctor description.")

        # Appointments GET
        res_app = self.client.get("/api/doctors/appointments", headers=headers)
        self.assertEqual(res_app.status_code, 200)
        appointments = res_app.get_json()["appointments"]
        found = any(a["id"] == self.appointment_id for a in appointments)
        self.assertTrue(found, "Booked appointment not found in doctor's appointment list")

    def test_10_doctor_accept_appointment(self):
        """Test doctor accepting appointment -> status becomes 'Confirmed'."""
        headers = {"Authorization": f"Bearer {self.doctor_token}"}
        res = self.client.put(f"/api/doctors/appointments/{self.appointment_id}/accept", headers=headers)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data["appointment"]["status"], "Confirmed")

        # Verify in DB
        app_row = db.query_one("SELECT status FROM appointments WHERE id = ?", (self.appointment_id,))
        self.assertEqual(app_row["status"], "Confirmed")

    def test_11_doctor_create_and_fetch_prescription(self):
        """Test doctor creates prescription for confirmed appointment with structured medicines list."""
        headers = {"Authorization": f"Bearer {self.doctor_token}"}
        payload = {
            "date": "2026-09-10",
            "diagnosis": "Mild Hypertension & Stress",
            "medicines": [
                {
                    "name": "Amlodipine",
                    "dosage": "5mg",
                    "frequency": "Once daily (Morning)",
                    "duration": "30 days"
                },
                {
                    "name": "Telmisartan",
                    "dosage": "40mg",
                    "frequency": "Once daily (Night)",
                    "duration": "30 days"
                }
            ],
            "advice": "Reduce sodium intake, monitor blood pressure daily, 30 min brisk walking.",
            "follow_up_date": "2026-10-10"
        }
        res = self.client.post(
            f"/api/doctors/appointments/{self.appointment_id}/prescription",
            headers=headers,
            json=payload
        )
        self.assertEqual(res.status_code, 201)
        data = res.get_json()
        self.assertIn("prescription", data)
        rx = data["prescription"]
        self.assertEqual(rx["diagnosis"], "Mild Hypertension & Stress")
        self.assertEqual(len(rx["medicines"]), 2)
        self.__class__.prescription_id = rx["id"]

        # Doctor GET prescriptions list
        res_list = self.client.get("/api/doctors/prescriptions", headers=headers)
        self.assertEqual(res_list.status_code, 200)
        rx_list = res_list.get_json()["prescriptions"]
        found = [r for r in rx_list if r["id"] == self.prescription_id]
        self.assertEqual(len(found), 1)
        self.assertIsInstance(found[0]["medicines"], list)

        # Doctor GET single prescription
        res_single = self.client.get(f"/api/doctors/prescriptions/{self.prescription_id}", headers=headers)
        self.assertEqual(res_single.status_code, 200)
        single_rx = res_single.get_json()["prescription"]
        self.assertEqual(single_rx["id"], self.prescription_id)
        self.assertIsInstance(single_rx["medicines"], list)

        # Patient GET prescriptions list
        p_headers = {"Authorization": f"Bearer {self.patient_token}"}
        p_res = self.client.get("/api/patients/prescriptions", headers=p_headers)
        self.assertEqual(p_res.status_code, 200)
        p_rx_list = p_res.get_json()["prescriptions"]
        p_found = [r for r in p_rx_list if r["id"] == self.prescription_id]
        self.assertEqual(len(p_found), 1)
        self.assertIsInstance(p_found[0]["medicines"], list)

    def test_12_doctor_my_patients_and_history(self):
        """Test GET /api/doctors/my-patients and GET /api/doctors/patient/<id>/history."""
        headers = {"Authorization": f"Bearer {self.doctor_token}"}

        # My patients
        res_pts = self.client.get("/api/doctors/my-patients", headers=headers)
        self.assertEqual(res_pts.status_code, 200)
        pts = res_pts.get_json()["patients"]
        found_pt = [p for p in pts if p["id"] == self.patient_id]
        self.assertEqual(len(found_pt), 1)

        # Patient history
        res_hist = self.client.get(f"/api/doctors/patient/{self.patient_id}/history", headers=headers)
        self.assertEqual(res_hist.status_code, 200)
        hist_data = res_hist.get_json()
        self.assertIn("patient", hist_data)
        self.assertIn("prescriptions", hist_data)
        self.assertIn("appointments", hist_data)
        self.assertEqual(len(hist_data["prescriptions"]), 1)
        self.assertIsInstance(hist_data["prescriptions"][0]["medicines"], list)

    def test_13_doctor_ai_brief(self):
        """Test POST /api/doctors/patient/<id>/ai-brief returns structured bilingual clinical summary."""
        headers = {"Authorization": f"Bearer {self.doctor_token}"}
        res = self.client.post(f"/api/doctors/patient/{self.patient_id}/ai-brief", headers=headers)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("brief", data)
        brief = data["brief"]
        self.assertIn("english", brief)
        self.assertIn("hindi", brief)
        self.assertIn("patient_summary", brief["english"])
        self.assertIn("previous_prescriptions", brief["english"])
        self.assertIn("patient_summary", brief["hindi"])

    def test_14_database_final_referential_integrity(self):
        """Final check to verify SQLite DB remains 100% clean and consistent."""
        with db.get_db_context() as conn:
            integrity = conn.execute("PRAGMA integrity_check").fetchall()
            fk_violations = conn.execute("PRAGMA foreign_key_check").fetchall()
            
            self.assertEqual(integrity[0]["integrity_check"], "ok")
            self.assertEqual(len(fk_violations), 0)

    @classmethod
    def tearDownClass(cls):
        """Clean up test users and associated records."""
        try:
            if cls.prescription_id:
                db.execute("DELETE FROM prescriptions WHERE id = ?", (cls.prescription_id,))
            if cls.appointment_id:
                db.execute("DELETE FROM appointments WHERE id = ?", (cls.appointment_id,))
            if cls.patient_id:
                db.execute("DELETE FROM patients WHERE id = ?", (cls.patient_id,))
                db.execute("DELETE FROM users WHERE id = ?", (cls.patient_id,))
            if cls.doctor_id:
                db.execute("DELETE FROM doctors WHERE id = ?", (cls.doctor_id,))
                db.execute("DELETE FROM users WHERE id = ?", (cls.doctor_id,))
        except Exception as e:
            print("Error during test cleanup:", e)


if __name__ == "__main__":
    unittest.main(verbosity=2)
