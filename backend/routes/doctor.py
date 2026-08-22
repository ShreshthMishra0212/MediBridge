
from flask import Blueprint, request, jsonify, send_from_directory
from routes.auth_utils import token_required, doctor_required
from storage import read_data, write_data
from utils.prescription_generator import generate_prescription_files
from meeting_generator import create_google_meet

import uuid
import os
import datetime


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

