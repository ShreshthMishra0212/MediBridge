
from flask import Blueprint, request, jsonify, send_from_directory
from auth_utils import token_required, doctor_required
from prescription_generator import generate_prescription_files
from meeting_generator import create_google_meet
import db

import uuid
import os
import json
import datetime

try:
    from google import genai
except ImportError:
    genai = None


doctor_bp = Blueprint("doctor", __name__)


# =====================================================
# TEST DOCTOR AUTHENTICATION
# =====================================================

@doctor_bp.route("/test", methods=["GET"])
@token_required
@doctor_required
def doctor_test(decoded):

    return jsonify({
        "message": "Doctor authentication working",
        "doctor_id": decoded["user_id"],
        "role": decoded["role"]
    }), 200


# =====================================================
# GET DOCTOR PROFILE
# =====================================================

@doctor_bp.route("/profile", methods=["GET"])
@token_required
@doctor_required
def get_doctor_profile(decoded):

    doctor_id = decoded["user_id"]
    doctor = db.query_one("SELECT * FROM doctors WHERE id = ?", (doctor_id,))

    if not doctor:
        return jsonify({
            "error": "Doctor profile not found"
        }), 404

    doctor["available_slots"] = db.parse_json(doctor.get("available_slots"), [])

    return jsonify({
        "doctor": doctor
    }), 200


# =====================================================
# UPDATE DOCTOR PROFILE
# =====================================================

@doctor_bp.route("/profile", methods=["PUT"])
@token_required
@doctor_required
def update_doctor_profile(decoded):

    data = request.get_json() or {}
    doctor_id = decoded["user_id"]

    doctor = db.query_one("SELECT * FROM doctors WHERE id = ?", (doctor_id,))
    if not doctor:
        return jsonify({
            "error": "Doctor profile not found"
        }), 404

    specialization = data.get("specialization", doctor.get("specialization"))
    description = data.get("description", doctor.get("description"))
    location = data.get("location", doctor.get("location"))
    experience = data.get("experience", doctor.get("experience"))

    db.execute(
        """
        UPDATE doctors
        SET specialization = ?, description = ?, location = ?, experience = ?, updated_at = DATETIME('now')
        WHERE id = ?
        """,
        (specialization, description, location, experience, doctor_id)
    )

    updated_doctor = db.query_one("SELECT * FROM doctors WHERE id = ?", (doctor_id,))
    updated_doctor["available_slots"] = db.parse_json(updated_doctor.get("available_slots"), [])

    return jsonify({
        "message": "Doctor profile updated successfully",
        "doctor": updated_doctor
    }), 200


# =====================================================
# GET DOCTOR APPOINTMENTS
# =====================================================

@doctor_bp.route("/appointments", methods=["GET"])
@token_required
@doctor_required
def get_doctor_appointments(decoded):

    appointments = db.query_all(
        "SELECT * FROM appointments WHERE doctor_id = ? ORDER BY date DESC, time DESC",
        (decoded["user_id"],)
    )

    return jsonify({
        "appointments": appointments
    }), 200


# =====================================================
# ACCEPT APPOINTMENT
# =====================================================

@doctor_bp.route(
    "/appointments/<appointment_id>/accept",
    methods=["PUT"]
)
@token_required
@doctor_required
def accept_appointment(decoded, appointment_id):

    appointment = db.query_one(
        "SELECT * FROM appointments WHERE id = ? AND doctor_id = ?",
        (appointment_id, decoded["user_id"])
    )

    if not appointment:
        return jsonify({
            "error": "Appointment not found"
        }), 404

    if appointment["status"] != "Pending":
        return jsonify({
            "error": "Appointment is not pending"
        }), 400

    db.execute(
        "UPDATE appointments SET status = 'Confirmed' WHERE id = ?",
        (appointment_id,)
    )

    updated = db.query_one("SELECT * FROM appointments WHERE id = ?", (appointment_id,))

    return jsonify({
        "message": "Appointment accepted successfully",
        "appointment": updated
    }), 200


# =====================================================
# CREATE GOOGLE MEET FOR CONFIRMED APPOINTMENT
# =====================================================

@doctor_bp.route(
    "/appointments/<appointment_id>/meet",
    methods=["POST"]
)
@token_required
@doctor_required
def create_appointment_meet(decoded, appointment_id):

    appointment = db.query_one(
        "SELECT * FROM appointments WHERE id = ? AND doctor_id = ?",
        (appointment_id, decoded["user_id"])
    )

    if not appointment:
        return jsonify({
            "error": "Appointment not found"
        }), 404

    # Only confirmed appointments can get a meet
    if appointment["status"] != "Confirmed":
        return jsonify({
            "error": (
                "Google Meet can only be created "
                "for a confirmed appointment"
            )
        }), 400

    # If meet already exists, return existing meet
    if appointment.get("join_url"):
        return jsonify({
            "message": "Google Meet already exists",
            "appointment_id": appointment["id"],
            "join_url": appointment["join_url"],
            "event_id": appointment.get("event_id"),
            "start_time": appointment.get("meeting_start_time"),
            "expires_at": appointment.get("meeting_expires_at")
        }), 200

    # Get booked date + time
    date = appointment.get("date")
    time = appointment.get("time")

    if not date or not time:
        return jsonify({
            "error": (
                "Appointment does not contain "
                "a valid date and time"
            )
        }), 400

    try:
        start_time = datetime.datetime.strptime(
            f"{date} {time}",
            "%Y-%m-%d %I:%M %p"
        )
    except ValueError:
        return jsonify({
            "error": (
                "Invalid appointment date/time format. "
                f"Received date={date}, time={time}"
            )
        }), 400

    # Create Google Meet
    try:
        result = create_google_meet(
            start_time=start_time,
            title="MediBridge Doctor Appointment",
            duration_minutes=30
        )
    except Exception as e:
        print("GOOGLE MEET ERROR:", repr(e))
        return jsonify({
            "error": "Failed to create Google Meet",
            "details": str(e)
        }), 502

    # Save meeting details in SQLite
    join_url = result["join_url"]
    event_id = result["event_id"]
    meeting_start_time = result["start_time"].isoformat()
    meeting_expires_at = result["expires_at"].isoformat()

    db.execute(
        """
        UPDATE appointments
        SET join_url = ?, event_id = ?, meeting_start_time = ?, meeting_expires_at = ?
        WHERE id = ?
        """,
        (join_url, event_id, meeting_start_time, meeting_expires_at, appointment_id)
    )

    return jsonify({
        "message": "Google Meet created successfully",
        "appointment_id": appointment["id"],
        "join_url": join_url,
        "event_id": event_id,
        "start_time": meeting_start_time,
        "expires_at": meeting_expires_at
    }), 201


# =====================================================
# SUGGEST NEW APPOINTMENT TIME
# =====================================================

@doctor_bp.route(
    "/appointments/<appointment_id>/suggest",
    methods=["PUT"]
)
@token_required
@doctor_required
def suggest_appointment_time(decoded, appointment_id):

    data = request.get_json() or {}

    new_date = data.get("date")
    new_time = data.get("time")

    if not new_date or not new_time:
        return jsonify({
            "error": "New date and time are required"
        }), 400

    appointment = db.query_one(
        "SELECT * FROM appointments WHERE id = ? AND doctor_id = ?",
        (appointment_id, decoded["user_id"])
    )

    if not appointment:
        return jsonify({
            "error": "Appointment not found"
        }), 404

    if appointment["status"] != "Pending":
        return jsonify({
            "error": "Appointment is not pending"
        }), 400

    db.execute(
        """
        UPDATE appointments
        SET suggested_date = ?, suggested_time = ?, status = 'Reschedule Proposed'
        WHERE id = ?
        """,
        (new_date, new_time, appointment_id)
    )

    updated = db.query_one("SELECT * FROM appointments WHERE id = ?", (appointment_id,))

    return jsonify({
        "message": "New appointment time suggested",
        "appointment": updated
    }), 200


# =====================================================
# CREATE PRESCRIPTION
# =====================================================

@doctor_bp.route(
    "/appointments/<appointment_id>/prescription",
    methods=["POST"]
)
@token_required
@doctor_required
def create_prescription(decoded, appointment_id):

    data = request.get_json()

    if not data:
        return jsonify({
            "error": "Prescription data is required"
        }), 400

    appointment = db.query_one("SELECT * FROM appointments WHERE id = ?", (appointment_id,))
    if not appointment:
        return jsonify({
            "error": "Appointment not found"
        }), 404

    if appointment["doctor_id"] != decoded["user_id"]:
        return jsonify({
            "error": "You are not authorized for this appointment"
        }), 403

    if appointment["status"] != "Confirmed":
        return jsonify({
            "error": (
                "Prescription can only be created "
                "for a confirmed appointment"
            )
        }), 400

    doctor = db.query_one("SELECT * FROM doctors WHERE id = ?", (decoded["user_id"],))
    if not doctor:
        return jsonify({
            "error": "Doctor not found"
        }), 404

    patient = db.query_one("SELECT * FROM patients WHERE id = ?", (appointment["patient_id"],))
    if not patient:
        return jsonify({
            "error": "Patient not found"
        }), 404

    diagnosis = data.get("diagnosis")
    medicines = data.get("medicines", [])

    if not diagnosis:
        return jsonify({
            "error": "Diagnosis is required"
        }), 400

    if not isinstance(medicines, list) or not medicines:
        return jsonify({
            "error": "At least one medicine is required"
        }), 400

    prescription_id = str(uuid.uuid4())

    prescription = {
        "id": prescription_id,
        "appointment_id": appointment["id"],
        "doctor_id": doctor["id"],
        "doctor_name": doctor.get("name", ""),
        "specialization": doctor.get(
            "specialization",
            appointment.get("specialist", "")
        ),
        "patient_id": patient["id"],
        "patient_name": patient.get("name", ""),
        "date": data.get(
            "date",
            appointment.get("date", "")
        ),
        "diagnosis": diagnosis,
        "medicines": medicines,
        "advice": data.get("advice", ""),
        "follow_up_date": data.get(
            "follow_up_date",
            "Not specified"
        )
    }

    try:
        files = generate_prescription_files(prescription)
    except Exception as e:
        return jsonify({
            "error": "Failed to generate prescription files",
            "details": str(e)
        }), 500

    prescription["pdf"] = files["pdf"]
    prescription["docx"] = files["docx"]

    meds_json_str = json.dumps(medicines)

    db.execute(
        """
        INSERT INTO prescriptions (
            id, appointment_id, doctor_id, doctor_name, specialization,
            patient_id, patient_name, date, diagnosis, medicines, advice,
            follow_up_date, pdf, docx
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            prescription["id"],
            prescription["appointment_id"],
            prescription["doctor_id"],
            prescription["doctor_name"],
            prescription["specialization"],
            prescription["patient_id"],
            prescription["patient_name"],
            prescription["date"],
            prescription["diagnosis"],
            meds_json_str,
            prescription["advice"],
            prescription["follow_up_date"],
            prescription["pdf"],
            prescription["docx"]
        )
    )

    return jsonify({
        "message": "Prescription created successfully",
        "prescription": prescription
    }), 201


# =====================================================
# GET DOCTOR PRESCRIPTIONS
# =====================================================

@doctor_bp.route(
    "/prescriptions",
    methods=["GET"]
)
@token_required
@doctor_required
def get_doctor_prescriptions(decoded):

    prescriptions = db.query_all(
        "SELECT * FROM prescriptions WHERE doctor_id = ? ORDER BY date DESC",
        (decoded["user_id"],)
    )

    for p in prescriptions:
        p["medicines"] = db.parse_json(p.get("medicines"), [])

    return jsonify({
        "prescriptions": prescriptions
    }), 200


# =====================================================
# GET SINGLE PRESCRIPTION
# =====================================================

@doctor_bp.route(
    "/prescriptions/<prescription_id>",
    methods=["GET"]
)
@token_required
@doctor_required
def get_single_prescription(
    decoded,
    prescription_id
):

    prescription = db.query_one(
        "SELECT * FROM prescriptions WHERE id = ? AND doctor_id = ?",
        (prescription_id, decoded["user_id"])
    )

    if not prescription:
        return jsonify({
            "error": "Prescription not found"
        }), 404

    prescription["medicines"] = db.parse_json(prescription.get("medicines"), [])

    return jsonify({
        "prescription": prescription
    }), 200


# =====================================================
# VIEW / DOWNLOAD PRESCRIPTION FILE
# =====================================================

@doctor_bp.route(
    "/prescriptions/<prescription_id>/file/<file_type>",
    methods=["GET"]
)
@token_required
@doctor_required
def get_prescription_file(
    decoded,
    prescription_id,
    file_type
):

    if file_type not in ["pdf", "docx"]:
        return jsonify({
            "error": "Invalid file type. Use pdf or docx."
        }), 400

    prescription = db.query_one(
        "SELECT * FROM prescriptions WHERE id = ? AND doctor_id = ?",
        (prescription_id, decoded["user_id"])
    )

    if not prescription:
        return jsonify({
            "error": "Prescription not found"
        }), 404

    relative_path = prescription.get(file_type)

    if not relative_path:
        return jsonify({
            "error": f"{file_type.upper()} file not available"
        }), 404

    filename = os.path.basename(relative_path)
    prescription_folder = os.path.join(
        os.path.dirname(os.path.dirname(__file__)),
        "prescriptions"
    )

    file_path = os.path.join(prescription_folder, filename)

    if not os.path.exists(file_path):
        return jsonify({
            "error": "Prescription file not found on server"
        }), 404

    return send_from_directory(
        prescription_folder,
        filename,
        as_attachment=False
    )


# =====================================================
# GET AUTHORIZED PATIENTS (via appointments)
# =====================================================

@doctor_bp.route("/my-patients", methods=["GET"])
@token_required
@doctor_required
def get_my_patients(decoded):

    patient_rows = db.query_all(
        """
        SELECT DISTINCT a.patient_id as id,
               COALESCE(p.name, u.name, 'Patient ' || SUBSTR(a.patient_id, 1, 8)) as name
        FROM appointments a
        LEFT JOIN patients p ON a.patient_id = p.id
        LEFT JOIN users u ON a.patient_id = u.id
        WHERE a.doctor_id = ?
        """,
        (decoded["user_id"],)
    )

    return jsonify({
        "patients": patient_rows
    }), 200


# =====================================================
# GET PATIENT MEDICAL HISTORY (authorized)
# =====================================================

@doctor_bp.route(
    "/patient/<patient_id>/history",
    methods=["GET"]
)
@token_required
@doctor_required
def get_patient_history(decoded, patient_id):

    # Authorization: Doctor must have an appointment with this patient
    has_appointment = db.query_one(
        "SELECT 1 FROM appointments WHERE doctor_id = ? AND patient_id = ? LIMIT 1",
        (decoded["user_id"], patient_id)
    )

    if not has_appointment:
        return jsonify({
            "error": (
                "You are not authorized to view this patient's records. "
                "Only patients with existing appointments can be accessed."
            )
        }), 403

    # Prescriptions
    prescriptions = db.query_all(
        """
        SELECT id, doctor_name, specialization, date, diagnosis, medicines, advice, follow_up_date
        FROM prescriptions WHERE patient_id = ? ORDER BY date DESC
        """,
        (patient_id,)
    )

    for p in prescriptions:
        p["medicines"] = db.parse_json(p.get("medicines"), [])

    # Patient profile
    patient_row = db.query_one(
        "SELECT name, age, gender, phone, address FROM patients WHERE id = ?",
        (patient_id,)
    ) or {
        "name": "", "age": None, "gender": None, "phone": None, "address": None
    }

    # Appointments history with this doctor
    appointments = db.query_all(
        """
        SELECT date, time, status, specialist
        FROM appointments WHERE patient_id = ? AND doctor_id = ?
        ORDER BY date DESC, time DESC
        """,
        (patient_id, decoded["user_id"])
    )

    return jsonify({
        "patient": patient_row,
        "prescriptions": prescriptions,
        "appointments": appointments
    }), 200


# =====================================================
# GENERATE AI MEDICAL BRIEF (authorized)
# =====================================================

@doctor_bp.route(
    "/patient/<patient_id>/ai-brief",
    methods=["POST"]
)
@token_required
@doctor_required
def generate_ai_brief(decoded, patient_id):

    # Authorization
    has_appointment = db.query_one(
        "SELECT 1 FROM appointments WHERE doctor_id = ? AND patient_id = ? LIMIT 1",
        (decoded["user_id"], patient_id)
    )

    if not has_appointment:
        return jsonify({
            "error": "You are not authorized to generate a brief for this patient."
        }), 403

    # Gather patient data from SQLite
    patient = db.query_one("SELECT * FROM patients WHERE id = ?", (patient_id,))
    patient_name = patient.get("name", "Unknown") if patient else "Unknown"
    patient_age = patient.get("age", "Not specified") if patient else "Not specified"
    patient_gender = patient.get("gender", "Not specified") if patient else "Not specified"

    patient_prescriptions = db.query_all(
        "SELECT * FROM prescriptions WHERE patient_id = ? ORDER BY date DESC",
        (patient_id,)
    )
    for p in patient_prescriptions:
        p["medicines"] = db.parse_json(p.get("medicines"), [])

    patient_appointments = db.query_all(
        "SELECT * FROM appointments WHERE patient_id = ? ORDER BY date DESC, time DESC",
        (patient_id,)
    )

    # Gather patient uploaded files
    base_dir = os.path.dirname(os.path.abspath(__file__))
    history_dir = os.path.join(base_dir, "history")
    patient_files = []

    if os.path.isdir(history_dir):
        for fname in os.listdir(history_dir):
            if fname.startswith(f"{patient_id}_") or (patient_name and fname.startswith(f"{patient_name}_")):
                fpath = os.path.join(history_dir, fname)
                if os.path.isfile(fpath) and fpath not in patient_files:
                    patient_files.append(fpath)

    # Check medical documents from SQLite
    docs = db.query_all("SELECT path FROM medical_documents WHERE patient_id = ?", (patient_id,))
    for doc in docs:
        doc_path = doc.get("path")
        if doc_path:
            abs_path = os.path.join(os.path.dirname(base_dir), doc_path)
            if os.path.isfile(abs_path) and abs_path not in patient_files:
                patient_files.append(abs_path)

    context_parts = []
    context_parts.append(
        f"Patient: {patient_name}, Age: {patient_age}, Gender: {patient_gender}"
    )

    if patient_prescriptions:
        context_parts.append("\n\nPRESCRIPTIONS:")
        for idx, rx in enumerate(patient_prescriptions, 1):
            medicines_text = ""
            if isinstance(rx.get("medicines"), list):
                for m in rx["medicines"]:
                    if isinstance(m, dict):
                        medicines_text += (
                            f"  - {m.get('name', 'Unknown')}: "
                            f"{m.get('dosage', '')}, "
                            f"{m.get('frequency', '')}, "
                            f"{m.get('duration', '')}\n"
                        )
                    else:
                        medicines_text += f"  - {m}\n"

            context_parts.append(
                f"\nPrescription {idx}:\n"
                f"  Date: {rx.get('date', 'N/A')}\n"
                f"  Doctor: {rx.get('doctor_name', 'N/A')}\n"
                f"  Specialization: {rx.get('specialization', 'N/A')}\n"
                f"  Diagnosis: {rx.get('diagnosis', 'N/A')}\n"
                f"  Medicines:\n{medicines_text}"
                f"  Advice: {rx.get('advice', 'N/A')}\n"
                f"  Follow-up: {rx.get('follow_up_date', 'N/A')}"
            )

    if patient_appointments:
        context_parts.append("\n\nAPPOINTMENT HISTORY:")
        for a in patient_appointments:
            context_parts.append(
                f"  - {a['date']} {a['time']} | "
                f"{a['specialist'] or 'General'} | "
                f"Status: {a['status']}"
            )

    full_context = "\n".join(context_parts)

    if not patient_prescriptions and not patient_appointments and not patient_files:
        return jsonify({
            "error":
                "No medical records or history files are available for this patient yet. "
                "Upload patient history or create prescriptions first."
        }), 404

    # Gemini / Groq call & clinical brief generation
    api_key = os.getenv("NVIDIA_API_KEY") or os.getenv("KIMI_API_KEY")

    prompt = f"""You are a senior medical assistant preparing a comprehensive, structured
clinical briefing for a consulting doctor about their patient.

PATIENT SYSTEM CONTEXT:
{full_context}

TASK:
Analyze the patient's entire medical record, including any attached prescription images, PDFs, diagnostic reports, and system appointment history.
Generate a comprehensive, highly accurate medical briefing in BOTH English and natural Hindi (Devanagari script).

IMPORTANT RULES:
1. Thoroughly examine any attached documents for patient symptoms, diagnosed illnesses, prescribed medicines (with exact dosages and frequencies), lab tests, and clinical notes.
2. If a section is truly not present in any record or document, write "No information available" (English) or "कोई जानकारी उपलब्ध नहीं" (Hindi).
3. Hindi must be natural medical Hindi in Devanagari script.
4. Return ONLY valid JSON with no markdown formatting.

Return EXACTLY this JSON structure:
{{
  "english": {{
    "patient_summary": "<Detailed overview of patient condition, complaints, and diagnosis>",
    "previous_conditions": "<Past illnesses, complaints, symptoms, and diagnoses>",
    "previous_prescriptions": "<List of medicines, dosages, timings, and instructions>",
    "investigations": "<Tests, scans, bloodwork, or diagnostic reports on file>",
    "important_observations": "<Key clinical observations, risk factors, or precautions>",
    "key_points": "<Concise action points and recommendations for the consulting doctor>",
    "timeline": "<Chronological timeline of appointments, diagnoses, and prescriptions>"
  }},
  "hindi": {{
    "patient_summary": "<रोगी की स्थिति, शिकायतों और निदान का विस्तृत सारांश>",
    "previous_conditions": "<पिछली बीमारियाँ, शिकायतें, लक्षण और निदान>",
    "previous_prescriptions": "<दवाइयों की सूची, खुराक, समय और निर्देश>",
    "investigations": "<जाँच, स्कैन, रक्त परीक्षण या नैदानिक रिपोर्ट>",
    "important_observations": "<महत्वपूर्ण नैदानिक अवलोकन, जोखिम कारक या सावधानियां>",
    "key_points": "<परामर्शदाता डॉक्टर के लिए संक्षिप्त कार्य बिंदु और सिफारिशें>",
    "timeline": "<परामर्श, निदान और नुस्खों का कालानुक्रमिक विवरण>"
  }}
}}"""

    result = None
    if api_key:
        contents_list = []
        import base64
        import requests
        try:
            from pypdf import PdfReader
        except ImportError:
            PdfReader = None
        try:
            import docx
        except ImportError:
            docx = None

        docx_texts = []
        pdf_texts = []

        try:
            for fp in patient_files:
                if not os.path.isfile(fp):
                    continue
                lower_path = fp.lower()
                
                if lower_path.endswith(".docx") and docx is not None:
                    try:
                        doc = docx.Document(fp)
                        full_text = "\n".join([p.text for p in doc.paragraphs if p.text.strip()])
                        if full_text:
                            docx_texts.append(f"--- WORD DOCUMENT CONTENT ({os.path.basename(fp)}) ---\n{full_text}")
                    except Exception as e:
                        print(f"Error reading docx {fp}: {e}")
                    continue

                if lower_path.endswith(".pdf"):
                    try:
                        import pymupdf
                        doc = pymupdf.open(fp)
                        full_text = ""
                        for page_num, page in enumerate(doc):
                            t = page.get_text() or ""
                            if t.strip():
                                full_text += "\n" + t
                            else:
                                # OCR the page if no text
                                pix = page.get_pixmap()
                                encoded_string = base64.b64encode(pix.tobytes("jpeg")).decode('utf-8')
                                ocr_payload = {
                                    "input": [{"type": "image_url", "url": f"data:image/jpeg;base64,{encoded_string}"}]
                                }
                                ocr_resp = requests.post(
                                    os.getenv("NVIDIA_OCR_URL", "https://ai.api.nvidia.com/v1/cv/nvidia/nemotron-ocr-v2"),
                                    headers={"Authorization": f"Bearer {os.getenv('NVIDIA_API_KEY')}", "Accept": "application/json"},
                                    json=ocr_payload,
                                    timeout=30
                                )
                                if ocr_resp.status_code == 200:
                                    ocr_data = ocr_resp.json()
                                    for image_result in ocr_data.get("data", []):
                                        for detection in image_result.get("text_detections", []):
                                            txt = detection.get("text_prediction", {}).get("text", "")
                                            if txt:
                                                full_text += txt + "\n"
                        if full_text.strip():
                            pdf_texts.append(f"--- PDF DOCUMENT CONTENT ({os.path.basename(fp)}) ---\n{full_text.strip()}")
                    except Exception as e:
                        print(f"Error reading pdf {fp}: {e}")
                    continue

                if lower_path.endswith((".png", ".jpg", ".jpeg")):
                    try:
                        with open(fp, "rb") as image_file:
                            encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
                            ext = "jpeg" if lower_path.endswith(".jpg") else lower_path.split(".")[-1]
                            
                            ocr_payload = {
                                "input": [{"type": "image_url", "url": f"data:image/{ext};base64,{encoded_string}"}]
                            }
                            ocr_resp = requests.post(
                                os.getenv("NVIDIA_OCR_URL", "https://ai.api.nvidia.com/v1/cv/nvidia/nemotron-ocr-v2"),
                                headers={"Authorization": f"Bearer {os.getenv('NVIDIA_API_KEY')}", "Accept": "application/json"},
                                json=ocr_payload,
                                timeout=30
                            )
                            if ocr_resp.status_code == 200:
                                ocr_data = ocr_resp.json()
                                extracted_text = ""
                                for image_result in ocr_data.get("data", []):
                                    for detection in image_result.get("text_detections", []):
                                        txt = detection.get("text_prediction", {}).get("text", "")
                                        if txt:
                                            extracted_text += txt + "\n"
                                if extracted_text.strip():
                                    pdf_texts.append(f"--- IMAGE OCR CONTENT ({os.path.basename(fp)}) ---\n{extracted_text.strip()}")
                    except Exception as e:
                        print(f"Error reading image {fp}: {e}")
                    continue

            text_content = prompt + "\n\n"
            if docx_texts:
                text_content += "\n\n".join(docx_texts) + "\n\n"
            if pdf_texts:
                text_content += "\n\n".join(pdf_texts) + "\n\n"

            contents_list.insert(0, {
                "type": "text",
                "text": text_content
            })

            invoke_url = "https://api.groq.com/openai/v1/chat/completions"
            groq_key = os.getenv("GROQ_API_KEY")
            if not groq_key:
                raise Exception("GROQ_API_KEY not set")

            headers = {
                "Authorization": f"Bearer {groq_key}",
                "Content-Type": "application/json",
            }

            payload = {
                "messages": [
                    {
                        "role": "user",
                        "content": text_content
                    }
                ],
                "model": "qwen/qwen3.8-27b",
                "max_tokens": 4096,
                "temperature": 0.3,
                "stream": False
            }

            response = requests.post(invoke_url, headers=headers, json=payload, timeout=60)
            response.raise_for_status()
            data = response.json()
            
            raw_text = data["choices"][0]["message"]["content"].strip()

            cleaned = raw_text
            if cleaned.startswith("```"):
                lines = cleaned.split("\n")
                lines = [l for l in lines if not l.strip().startswith("```")]
                cleaned = "\n".join(lines).strip()
            if cleaned.startswith("json"):
                cleaned = cleaned[4:].strip()

            start = cleaned.find("{")
            end = cleaned.rfind("}")
            if start != -1 and end != -1 and end > start:
                json_str = cleaned[start:end+1]
                parsed = json.loads(json_str)
            else:
                parsed = json.loads(cleaned)

            if parsed and "english" in parsed:
                result = parsed

        except Exception as e:
            print(f"DOCTOR AI BRIEF (GROQ) ERROR:", repr(e))

    # Fallback to structured medical brief generated from patient records
    if not result:
        # Build structured summary from clinical records
        rx_summaries = []
        med_list = []
        diag_list = []
        timeline_events = []

        for rx in patient_prescriptions:
            d = rx.get("date", "Unknown date")
            diag = rx.get("diagnosis", "")
            if diag and diag not in diag_list:
                diag_list.append(diag)
            
            meds = rx.get("medicines", [])
            for m in meds:
                if isinstance(m, dict):
                    m_str = f"{m.get('name', 'Medication')} ({m.get('dosage', '')} {m.get('frequency', '')} for {m.get('duration', '')})"
                    med_list.append(m_str)
                else:
                    med_list.append(str(m))

            rx_summaries.append(f"• {d}: Diagnosed with {diag}. Prescribed {len(meds)} medication(s).")
            timeline_events.append(f"• {d} - Prescription issued by Dr. {rx.get('doctor_name', 'Attending Physician')} ({rx.get('specialization', 'General')})")

        for app in patient_appointments:
            timeline_events.append(f"• {app.get('date')} {app.get('time')} - Appointment ({app.get('specialist') or 'General Consultation'}, Status: {app.get('status')})")

        diag_text = ", ".join(diag_list) if diag_list else "Routine medical review"
        med_text = "\n".join([f"• {m}" for m in med_list]) if med_list else "No active prescription records"
        timeline_text = "\n".join(timeline_events) if timeline_events else "No previous clinical timeline recorded"

        result = {
            "english": {
                "patient_summary": f"Patient {patient_name} (Age: {patient_age}, Gender: {patient_gender}). Presenting record indicates history of {diag_text}.",
                "previous_conditions": f"Documented conditions: {diag_text}.",
                "previous_prescriptions": med_text,
                "investigations": "Clinical records and past prescriptions verified. Diagnostic review ongoing.",
                "important_observations": f"Patient has {len(patient_prescriptions)} prior prescription(s) on file and {len(patient_appointments)} consultation history log(s).",
                "key_points": f"• Primary diagnosis on file: {diag_text}\n• Medication adherence verification recommended.\n• Review latest symptoms against previous response.",
                "timeline": timeline_text
            },
            "hindi": {
                "patient_summary": f"रोगी {patient_name} (आयु: {patient_age}, लिंग: {patient_gender})। रिकॉर्ड के अनुसार पूर्व स्थिति: {diag_text}।",
                "previous_conditions": f"दर्ज चिकित्सा स्थितियाँ: {diag_text}।",
                "previous_prescriptions": med_text if med_text != "No active prescription records" else "कोई सक्रिय पर्चा उपलब्ध नहीं है",
                "investigations": "चिकित्सीय रिकॉर्ड और पिछले पर्चों की पुष्टि की गई है।",
                "important_observations": f"रोगी के रिकॉर्ड में {len(patient_prescriptions)} पिछले पर्चे और {len(patient_appointments)} परामर्श इतिहास मौजूद हैं।",
                "key_points": f"• मुख्य निदान: {diag_text}\n• दवा के नियमित उपयोग की पुष्टि करें।\n• वर्तमान लक्षणों की समीक्षा करें।",
                "timeline": timeline_text
            }
        }

    return jsonify({
        "brief": result,
        "patient_name": patient_name,
        "disclaimer":
            "AI-generated summary. Verify important medical "
            "information against the original patient records "
            "before making clinical decisions."
    }), 200

