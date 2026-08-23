
from flask import Blueprint, request, jsonify, send_from_directory
from routes.auth_utils import token_required, doctor_required
from storage import read_data, write_data
from utils.prescription_generator import generate_prescription_files
from meeting_generator import create_google_meet

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

    doctors = read_data("doctors.json")

    doctor_id = decoded["user_id"]

    for doctor in doctors:

        if doctor["id"] == doctor_id:

            return jsonify({
                "doctor": doctor
            }), 200

    return jsonify({
        "error": "Doctor profile not found"
    }), 404


# =====================================================
# UPDATE DOCTOR PROFILE
# =====================================================

@doctor_bp.route("/profile", methods=["PUT"])
@token_required
@doctor_required
def update_doctor_profile(decoded):

    data = request.get_json() or {}

    doctors = read_data("doctors.json")

    doctor_id = decoded["user_id"]

    for doctor in doctors:

        if doctor["id"] == doctor_id:

            if "specialization" in data:
                doctor["specialization"] = data["specialization"]

            if "description" in data:
                doctor["description"] = data["description"]

            if "location" in data:
                doctor["location"] = data["location"]

            if "experience" in data:
                doctor["experience"] = data["experience"]

            write_data("doctors.json", doctors)

            return jsonify({
                "message": "Doctor profile updated successfully",
                "doctor": doctor
            }), 200

    return jsonify({
        "error": "Doctor profile not found"
    }), 404


# =====================================================
# GET DOCTOR APPOINTMENTS
# =====================================================

@doctor_bp.route("/appointments", methods=["GET"])
@token_required
@doctor_required
def get_doctor_appointments(decoded):

    appointments = read_data("appointments.json")

    doctor_appointments = []

    for appointment in appointments:

        if appointment["doctor_id"] == decoded["user_id"]:
            doctor_appointments.append(appointment)

    return jsonify({
        "appointments": doctor_appointments
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

    appointments = read_data("appointments.json")

    for appointment in appointments:

        if (
            appointment["id"] == appointment_id
            and appointment["doctor_id"] == decoded["user_id"]
        ):

            if appointment["status"] != "Pending":
                return jsonify({
                    "error": "Appointment is not pending"
                }), 400

            appointment["status"] = "Confirmed"

            write_data(
                "appointments.json",
                appointments
            )

            return jsonify({
                "message": "Appointment accepted successfully",
                "appointment": appointment
            }), 200

    return jsonify({
        "error": "Appointment not found"
    }), 404


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

    appointments = read_data(
        "appointments.json"
    )

    appointment = None

    # -------------------------------------------------
    # FIND APPOINTMENT + VERIFY DOCTOR OWNERSHIP
    # -------------------------------------------------

    for a in appointments:

        if (
            a["id"] == appointment_id
            and a["doctor_id"] == decoded["user_id"]
        ):
            appointment = a
            break

    if not appointment:

        return jsonify({
            "error": "Appointment not found"
        }), 404

    # -------------------------------------------------
    # ONLY CONFIRMED APPOINTMENTS CAN GET A MEET
    # -------------------------------------------------

    if appointment["status"] != "Confirmed":

        return jsonify({
            "error": (
                "Google Meet can only be created "
                "for a confirmed appointment"
            )
        }), 400

    # -------------------------------------------------
    # IF MEET ALREADY EXISTS, RETURN EXISTING MEET
    # -------------------------------------------------

    if appointment.get("join_url"):

        return jsonify({
            "message": "Google Meet already exists",
            "appointment_id": appointment["id"],
            "join_url": appointment["join_url"],
            "event_id": appointment.get("event_id"),
            "start_time": appointment.get(
                "meeting_start_time"
            ),
            "expires_at": appointment.get(
                "meeting_expires_at"
            )
        }), 200

    # -------------------------------------------------
    # GET BOOKED DATE + TIME
    # -------------------------------------------------

    date = appointment.get("date")
    time = appointment.get("time")

    if not date or not time:

        return jsonify({
            "error": (
                "Appointment does not contain "
                "a valid date and time"
            )
        }), 400

    # -------------------------------------------------
    # CONVERT APPOINTMENT SLOT TO DATETIME
    #
    # appointments.json uses:
    # "date": "2026-08-25"
    # "time": "10:00 AM"
    #
    # Convert to Python datetime.
    # meeting_generator.py will treat the naive
    # datetime as IST.
    # -------------------------------------------------

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

    # -------------------------------------------------
    # CREATE GOOGLE MEET
    # -------------------------------------------------

    try:

        result = create_google_meet(
            start_time=start_time,
            title="MediBridge Doctor Appointment",
            duration_minutes=30
        )

    except Exception as e:

        print(
            "GOOGLE MEET ERROR:",
            repr(e)
        )

        return jsonify({
            "error": "Failed to create Google Meet",
            "details": str(e)
        }), 502

    # -------------------------------------------------
    # SAVE MEETING DETAILS IN APPOINTMENT
    # -------------------------------------------------

    appointment["join_url"] = result["join_url"]

    appointment["event_id"] = result["event_id"]

    appointment["meeting_start_time"] = (
        result["start_time"].isoformat()
    )

    appointment["meeting_expires_at"] = (
        result["expires_at"].isoformat()
    )

    write_data(
        "appointments.json",
        appointments
    )

    # -------------------------------------------------
    # RETURN MEETING DETAILS
    # -------------------------------------------------

    return jsonify({

        "message":
            "Google Meet created successfully",

        "appointment_id":
            appointment["id"],

        "join_url":
            result["join_url"],

        "event_id":
            result["event_id"],

        "start_time":
            result["start_time"].isoformat(),

        "expires_at":
            result["expires_at"].isoformat()

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

    appointments = read_data("appointments.json")

    for appointment in appointments:

        if (
            appointment["id"] == appointment_id
            and appointment["doctor_id"] == decoded["user_id"]
        ):

            if appointment["status"] != "Pending":

                return jsonify({
                    "error": "Appointment is not pending"
                }), 400

            appointment["suggested_date"] = new_date
            appointment["suggested_time"] = new_time

            appointment["status"] = "Reschedule Proposed"

            write_data(
                "appointments.json",
                appointments
            )

            return jsonify({
                "message": "New appointment time suggested",
                "appointment": appointment
            }), 200

    return jsonify({
        "error": "Appointment not found"
    }), 404


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

    appointments = read_data("appointments.json")

    appointment = None

    for a in appointments:

        if a["id"] == appointment_id:

            appointment = a
            break

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

    doctors = read_data("doctors.json")

    doctor = None

    for d in doctors:

        if d["id"] == decoded["user_id"]:

            doctor = d
            break

    if not doctor:

        return jsonify({
            "error": "Doctor not found"
        }), 404

    patients = read_data("patients.json")

    patient = None

    for p in patients:

        if p["id"] == appointment["patient_id"]:

            patient = p
            break

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

        "appointment_id":
            appointment["id"],

        "doctor_id":
            doctor["id"],

        "doctor_name":
            doctor.get("name", ""),

        "specialization":
            doctor.get(
                "specialization",
                appointment.get("specialist", "")
            ),

        "patient_id":
            patient["id"],

        "patient_name":
            patient.get("name", ""),

        "date":
            data.get(
                "date",
                appointment.get("date", "")
            ),

        "diagnosis":
            diagnosis,

        "medicines":
            medicines,

        "advice":
            data.get("advice", ""),

        "follow_up_date":
            data.get(
                "follow_up_date",
                "Not specified"
            )
    }

    try:

        files = generate_prescription_files(
            prescription
        )

    except Exception as e:

        return jsonify({
            "error": "Failed to generate prescription files",
            "details": str(e)
        }), 500

    prescription["pdf"] = files["pdf"]
    prescription["docx"] = files["docx"]

    prescriptions = read_data(
        "prescriptions.json"
    )

    prescriptions.append(
        prescription
    )

    write_data(
        "prescriptions.json",
        prescriptions
    )

    return jsonify({

        "message":
            "Prescription created successfully",

        "prescription":
            prescription

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

    prescriptions = read_data(
        "prescriptions.json"
    )

    doctor_prescriptions = []

    for prescription in prescriptions:

        if prescription["doctor_id"] == decoded["user_id"]:

            doctor_prescriptions.append(
                prescription
            )

    return jsonify({
        "prescriptions": doctor_prescriptions
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

    prescriptions = read_data(
        "prescriptions.json"
    )

    for prescription in prescriptions:

        if (
            prescription["id"] == prescription_id
            and prescription["doctor_id"] == decoded["user_id"]
        ):

            return jsonify({
                "prescription": prescription
            }), 200

    return jsonify({
        "error": "Prescription not found"
    }), 404


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

    prescriptions = read_data(
        "prescriptions.json"
    )

    prescription = None

    for p in prescriptions:

        if (
            p["id"] == prescription_id
            and p["doctor_id"] == decoded["user_id"]
        ):

            prescription = p
            break

    if not prescription:

        return jsonify({
            "error": "Prescription not found"
        }), 404

    relative_path = prescription.get(file_type)

    if not relative_path:

        return jsonify({
            "error":
                f"{file_type.upper()} file not available"
        }), 404

    filename = os.path.basename(
        relative_path
    )

    prescription_folder = os.path.join(
        os.path.dirname(
            os.path.dirname(__file__)
        ),
        "prescriptions"
    )

    file_path = os.path.join(
        prescription_folder,
        filename
    )

    if not os.path.exists(file_path):

        return jsonify({
            "error":
                "Prescription file not found on server"
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

    appointments = read_data("appointments.json")
    patients = read_data("patients.json")
    users = read_data("users.json")

    # Collect unique patient IDs from this doctor's appointments
    patient_ids = set()

    for appointment in appointments:

        if appointment["doctor_id"] == decoded["user_id"]:
            patient_ids.add(appointment["patient_id"])

    # Build patient info list
    patient_list = []

    for pid in patient_ids:

        # Get name from patients.json
        name = ""

        for p in patients:
            if p["id"] == pid:
                name = p.get("name", "")
                break

        # Fallback: get name from users.json
        if not name:
            for u in users:
                if u["id"] == pid:
                    name = u.get("name", "")
                    break

        patient_list.append({
            "id": pid,
            "name": name or f"Patient {pid[:8]}..."
        })

    return jsonify({
        "patients": patient_list
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

    # -------------------------------------------------
    # AUTHORIZATION: Doctor must have an appointment
    # with this patient
    # -------------------------------------------------

    appointments = read_data("appointments.json")

    authorized = False

    for appointment in appointments:

        if (
            appointment["doctor_id"] == decoded["user_id"]
            and appointment["patient_id"] == patient_id
        ):
            authorized = True
            break

    if not authorized:

        return jsonify({
            "error":
                "You are not authorized to view this patient's records. "
                "Only patients with existing appointments can be accessed."
        }), 403

    # -------------------------------------------------
    # GET PATIENT PRESCRIPTIONS
    # -------------------------------------------------

    prescriptions = read_data("prescriptions.json")

    patient_prescriptions = []

    for p in prescriptions:

        if p["patient_id"] == patient_id:
            patient_prescriptions.append({
                "id": p.get("id"),
                "doctor_name": p.get("doctor_name", ""),
                "specialization": p.get("specialization", ""),
                "date": p.get("date", ""),
                "diagnosis": p.get("diagnosis", ""),
                "medicines": p.get("medicines", []),
                "advice": p.get("advice", ""),
                "follow_up_date": p.get("follow_up_date", "")
            })

    # -------------------------------------------------
    # GET PATIENT PROFILE
    # -------------------------------------------------

    patients = read_data("patients.json")

    patient_info = {}

    for patient in patients:

        if patient["id"] == patient_id:
            patient_info = {
                "name": patient.get("name", ""),
                "age": patient.get("age"),
                "gender": patient.get("gender"),
                "phone": patient.get("phone"),
                "address": patient.get("address")
            }
            break

    # -------------------------------------------------
    # GET APPOINTMENTS HISTORY
    # -------------------------------------------------

    patient_appointments = []

    for a in appointments:

        if (
            a["patient_id"] == patient_id
            and a["doctor_id"] == decoded["user_id"]
        ):
            patient_appointments.append({
                "date": a.get("date", ""),
                "time": a.get("time", ""),
                "status": a.get("status", ""),
                "specialist": a.get("specialist", "")
            })

    return jsonify({
        "patient": patient_info,
        "prescriptions": patient_prescriptions,
        "appointments": patient_appointments
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

    # -------------------------------------------------
    # AUTHORIZATION
    # -------------------------------------------------

    appointments = read_data("appointments.json")

    authorized = False

    for appointment in appointments:

        if (
            appointment["doctor_id"] == decoded["user_id"]
            and appointment["patient_id"] == patient_id
        ):
            authorized = True
            break

    if not authorized:

        return jsonify({
            "error":
                "You are not authorized to generate a brief for this patient."
        }), 403

    # -------------------------------------------------
    # GATHER PATIENT DATA
    # -------------------------------------------------

    prescriptions = read_data("prescriptions.json")
    patients = read_data("patients.json")

    patient_name = ""
    patient_age = ""
    patient_gender = ""

    for patient in patients:

        if patient["id"] == patient_id:
            patient_name = patient.get("name", "Unknown")
            patient_age = patient.get("age", "Not specified")
            patient_gender = patient.get("gender", "Not specified")
            break

    # Collect prescriptions for this patient
    patient_prescriptions = []

    for p in prescriptions:

        if p["patient_id"] == patient_id:
            patient_prescriptions.append(p)

    # Collect appointment history
    patient_appointments = []

    for a in appointments:

        if a["patient_id"] == patient_id:
            patient_appointments.append({
                "date": a.get("date", ""),
                "time": a.get("time", ""),
                "status": a.get("status", ""),
                "doctor": a.get("doctorName", ""),
                "specialist": a.get("specialist", "")
            })

    # -------------------------------------------------
    # BUILD CONTEXT FOR AI
    # -------------------------------------------------

    context_parts = []

    context_parts.append(
        f"Patient: {patient_name}, Age: {patient_age}, "
        f"Gender: {patient_gender}"
    )

    if patient_prescriptions:

        context_parts.append(
            "\n\nPRESCRIPTIONS:"
        )

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

        context_parts.append(
            "\n\nAPPOINTMENT HISTORY:"
        )

        for a in patient_appointments:
            context_parts.append(
                f"  - {a['date']} {a['time']} | "
                f"{a['specialist'] or 'General'} | "
                f"Status: {a['status']}"
            )

    full_context = "\n".join(context_parts)

    if not patient_prescriptions and not patient_appointments:

        return jsonify({
            "error":
                "No medical records are available for this patient yet. "
                "Upload patient history or create prescriptions first."
        }), 404

    # -------------------------------------------------
    # GEMINI CALL
    # -------------------------------------------------

    if genai is None:

        return jsonify({
            "error": "AI service not available. google-genai not installed."
        }), 503

    api_key = os.getenv("GOOGLE_API_KEY", "").strip()

    if not api_key:

        return jsonify({
            "error": "AI service not configured. GOOGLE_API_KEY missing."
        }), 503

    prompt = f"""You are a senior medical assistant preparing a structured
clinical briefing for a consulting doctor.

PATIENT DATA:
{full_context}

TASK:
Generate a comprehensive, structured medical briefing in BOTH English and Hindi.

IMPORTANT RULES:
1. Do NOT invent any medical information.
2. Only include information actually present in the provided data.
3. If a section has no data, write "No information available" (English)
   or "कोई जानकारी उपलब्ध नहीं" (Hindi).
4. Hindi must be proper Hindi, not transliterated English.
5. Return ONLY valid JSON with no markdown formatting.
6. Each section value must be a string (use newlines within strings
   for multi-line content).

Return EXACTLY this JSON structure:
{{
  "english": {{
    "patient_summary": "<overall patient summary>",
    "previous_conditions": "<conditions and complaints>",
    "previous_prescriptions": "<medicines, dosages, frequencies>",
    "investigations": "<tests, reports, lab results>",
    "important_observations": "<key clinical observations>",
    "key_points": "<concise points for the doctor>",
    "timeline": "<chronological medical events>"
  }},
  "hindi": {{
    "patient_summary": "<रोगी का सारांश>",
    "previous_conditions": "<पिछली स्थितियाँ और शिकायतें>",
    "previous_prescriptions": "<दवाइयाँ, खुराक, आवृत्ति>",
    "investigations": "<जाँच, रिपोर्ट, प्रयोगशाला परिणाम>",
    "important_observations": "<महत्वपूर्ण नैदानिक अवलोकन>",
    "key_points": "<डॉक्टर के लिए संक्षिप्त बिंदु>",
    "timeline": "<कालानुक्रमिक चिकित्सा घटनाएँ>"
  }}
}}"""

    result = None
    for model_name in ["gemini-3.6-flash", "gemini-3.7-flash", "gemini-1.5-flash"]:
        try:
            client = genai.Client(api_key=api_key)
            response = client.models.generate_content(
                model=model_name,
                contents=prompt
            )
            raw_text = (response.text or "").strip()

            if raw_text.startswith("```"):
                lines = raw_text.split("\n")
                lines = [l for l in lines if not l.strip().startswith("```")]
                raw_text = "\n".join(lines).strip()

            result = json.loads(raw_text)
            if result:
                break
        except Exception as e:
            print(f"DOCTOR AI BRIEF ({model_name}) ERROR:", repr(e))
            continue

    if not result:
        return jsonify({
            "error": "Unable to generate the AI brief right now. Please try again."
        }), 502

    return jsonify({
        "brief": result,
        "patient_name": patient_name,
        "disclaimer":
            "AI-generated summary. Verify important medical "
            "information against the original patient records "
            "before making clinical decisions."
    }), 200
