from flask import Blueprint, request, jsonify, send_file
from storage import read_data, write_data
from routes.auth_utils import token_required
import os
import uuid


patient_bp = Blueprint("patient", __name__)


# =====================================================
# GET PATIENT PROFILE
# =====================================================

@patient_bp.route("/me", methods=["GET"])
@token_required
def get_my_profile(current_user):

    if current_user["role"] != "patient":
        return jsonify({
            "error": "Access denied. Patient account required."
        }), 403

    patients = read_data("patients.json")

    for patient in patients:

        if patient["id"] == current_user["user_id"]:

            return jsonify({
                "patient": patient
            }), 200

    return jsonify({
        "error": "Patient profile not found"
    }), 404


# =====================================================
# UPDATE PATIENT PROFILE
# =====================================================

@patient_bp.route("/me", methods=["PUT"])
@token_required
def update_my_profile(current_user):

    if current_user["role"] != "patient":
        return jsonify({
            "error": "Access denied. Patient account required."
        }), 403

    data = request.get_json()

    patients = read_data("patients.json")

    for patient in patients:

        if patient["id"] == current_user["user_id"]:

            if "age" in data:
                patient["age"] = data["age"]

            if "gender" in data:
                patient["gender"] = data["gender"]

            if "phone" in data:
                patient["phone"] = data["phone"]

            if "address" in data:
                patient["address"] = data["address"]

            write_data("patients.json", patients)

            return jsonify({
                "message": "Profile updated successfully",
                "patient": patient
            }), 200

    return jsonify({
        "error": "Patient profile not found"
    }), 404


# =====================================================
# UPLOAD MEDICAL DOCUMENTS
# =====================================================

@patient_bp.route("/me/medical-documents", methods=["POST"])
@token_required
def upload_medical_documents(current_user):

    if current_user["role"] != "patient":
        return jsonify({
            "error": "Access denied. Patient account required."
        }), 403

    if "files" not in request.files:
        return jsonify({
            "error": "No files uploaded"
        }), 400

    files = request.files.getlist("files")

    if not files:
        return jsonify({
            "error": "No files uploaded"
        }), 400

    patients = read_data("patients.json")

    for patient in patients:

        if patient["id"] == current_user["user_id"]:

            patient.setdefault("medical_documents", [])

            uploaded_documents = []

            for file in files:

                if file.filename == "":
                    continue

                if not file.filename.lower().endswith(".pdf"):
                    continue

                document_id = str(uuid.uuid4())

                filename = f"{document_id}.pdf"

                upload_folder = os.path.join(
                    os.path.dirname(os.path.dirname(__file__)),
                    "uploads"
                )

                os.makedirs(upload_folder, exist_ok=True)

                file_path = os.path.join(
                    upload_folder,
                    filename
                )

                file.save(file_path)

                document = {
                    "id": document_id,
                    "original_name": file.filename,
                    "filename": filename,
                    "path": f"uploads/{filename}"
                }

                patient["medical_documents"].append(document)

                uploaded_documents.append(document)

            write_data("patients.json", patients)

            return jsonify({
                "message": "Medical documents uploaded successfully",
                "documents": uploaded_documents
            }), 201

    return jsonify({
        "error": "Patient profile not found"
    }), 404


# =====================================================
# GET MEDICAL DOCUMENTS
# =====================================================

@patient_bp.route("/me/medical-documents", methods=["GET"])
@token_required
def get_medical_documents(current_user):

    if current_user["role"] != "patient":
        return jsonify({
            "error": "Access denied. Patient account required."
        }), 403

    patients = read_data("patients.json")

    for patient in patients:

        if patient["id"] == current_user["user_id"]:

            return jsonify({
                "medical_documents": patient.get(
                    "medical_documents",
                    []
                )
            }), 200

    return jsonify({
        "error": "Patient profile not found"
    }), 404


# =====================================================
# CREATE APPOINTMENT REQUEST
# =====================================================

@patient_bp.route("/appointments", methods=["POST"])
@token_required
def create_appointment(current_user):

    if current_user["role"] != "patient":
        return jsonify({
            "error": "Access denied. Patient account required."
        }), 403

    data = request.get_json()

    doctor_id = data.get("doctor_id")
    date = data.get("date")
    time = data.get("time")

    if not doctor_id or not date or not time:
        return jsonify({
            "error": "doctor_id, date and time are required"
        }), 400

    doctors = read_data("doctors.json")
    appointments = read_data("appointments.json")

    # Find doctor
    doctor = None

    for d in doctors:

        if d["id"] == str(doctor_id):
            doctor = d
            break

    if not doctor:
        return jsonify({
            "error": "Doctor not found"
        }), 404

    # Create appointment
    appointment = {
        "id": str(uuid.uuid4()),
        "patient_id": current_user["user_id"],
        "doctor_id": doctor["id"],

        "doctorName": doctor["name"],
        "specialist": doctor.get("specialization"),
        "area": doctor.get("location"),
        "rating": doctor.get("rating", 0),

        "date": date,
        "time": time,

        "status": "Pending",

        "requested_date": date,
        "requested_time": time,

        "suggested_date": None,
        "suggested_time": None
    }

    appointments.append(appointment)

    write_data("appointments.json", appointments)

    return jsonify({
        "message": "Appointment request sent successfully",
        "appointment": appointment
    }), 201


# =====================================================
# GET MY APPOINTMENTS
# =====================================================

@patient_bp.route("/appointments", methods=["GET"])
@token_required
def get_my_appointments(current_user):

    if current_user["role"] != "patient":
        return jsonify({
            "error": "Access denied. Patient account required."
        }), 403

    appointments = read_data("appointments.json")

    my_appointments = []

    for appointment in appointments:

        if appointment["patient_id"] == current_user["user_id"]:
            my_appointments.append(appointment)

    return jsonify({
        "appointments": my_appointments
    }), 200


# =====================================================
# ACCEPT SUGGESTED APPOINTMENT TIME
# =====================================================

@patient_bp.route(
    "/appointments/<appointment_id>/accept",
    methods=["PUT"]
)
@token_required
def accept_suggested_appointment(current_user, appointment_id):

    if current_user["role"] != "patient":
        return jsonify({
            "error": "Access denied. Patient account required."
        }), 403

    appointments = read_data("appointments.json")

    for appointment in appointments:

        if (
            appointment["id"] == appointment_id
            and appointment["patient_id"] == current_user["user_id"]
        ):

            if appointment["status"] != "Reschedule Proposed":
                return jsonify({
                    "error": "No reschedule proposal available"
                }), 400

            # Apply doctor's suggested date/time
            appointment["date"] = appointment["suggested_date"]
            appointment["time"] = appointment["suggested_time"]

            appointment["status"] = "Confirmed"

            # Clear suggestion
            appointment["suggested_date"] = None
            appointment["suggested_time"] = None

            write_data("appointments.json", appointments)

            return jsonify({
                "message": "New appointment time accepted",
                "appointment": appointment
            }), 200

    return jsonify({
        "error": "Appointment not found"
    }), 404


# =====================================================
# REJECT SUGGESTED APPOINTMENT TIME
# =====================================================

@patient_bp.route(
    "/appointments/<appointment_id>/reject",
    methods=["PUT"]
)
@token_required
def reject_suggested_appointment(current_user, appointment_id):

    if current_user["role"] != "patient":
        return jsonify({
            "error": "Access denied. Patient account required."
        }), 403

    appointments = read_data("appointments.json")

    for appointment in appointments:

        if (
            appointment["id"] == appointment_id
            and appointment["patient_id"] == current_user["user_id"]
        ):

            if appointment["status"] != "Reschedule Proposed":
                return jsonify({
                    "error": "No reschedule proposal available"
                }), 400

            appointment["status"] = "Cancelled"

            appointment["suggested_date"] = None
            appointment["suggested_time"] = None

            write_data("appointments.json", appointments)

            return jsonify({
                "message": "Suggested appointment time rejected",
                "appointment": appointment
            }), 200

    return jsonify({
        "error": "Appointment not found"
    }), 404


# =====================================================
# GET MY PRESCRIPTIONS
# =====================================================

@patient_bp.route("/prescriptions", methods=["GET"])
@token_required
def get_my_prescriptions(current_user):

    if current_user["role"] != "patient":
        return jsonify({
            "error": "Access denied. Patient account required."
        }), 403

    prescriptions = read_data("prescriptions.json")

    my_prescriptions = []

    for prescription in prescriptions:

        if prescription["patient_id"] == current_user["user_id"]:
            my_prescriptions.append(prescription)

    return jsonify({
        "prescriptions": my_prescriptions
    }), 200


# =====================================================
# DOWNLOAD MY PRESCRIPTION PDF
# =====================================================

@patient_bp.route(
    "/prescriptions/<prescription_id>/pdf",
    methods=["GET"]
)
@token_required
def download_prescription_pdf(current_user, prescription_id):

    if current_user["role"] != "patient":
        return jsonify({
            "error": "Access denied. Patient account required."
        }), 403

    prescriptions = read_data("prescriptions.json")

    for prescription in prescriptions:

        if (
            prescription["id"] == prescription_id
            and prescription["patient_id"] == current_user["user_id"]
        ):

            base_dir = os.path.dirname(
                os.path.dirname(os.path.abspath(__file__))
            )

            relative_path = prescription.get("pdf")

            if not relative_path:
                return jsonify({
                    "error": "Prescription PDF is not available"
                }), 404

            file_path = os.path.join(
                base_dir,
                relative_path
            )

            if not os.path.exists(file_path):
                return jsonify({
                    "error": "Prescription PDF not found"
                }), 404

            return send_file(
                file_path,
                as_attachment=True,
                download_name=f"prescription-{prescription_id}.pdf",
                mimetype="application/pdf"
            )

    return jsonify({
        "error": "Prescription not found"
    }), 404


# =====================================================
# DOWNLOAD MY PRESCRIPTION DOCX
# =====================================================

@patient_bp.route(
    "/prescriptions/<prescription_id>/docx",
    methods=["GET"]
)
@token_required
def download_prescription_docx(current_user, prescription_id):

    if current_user["role"] != "patient":
        return jsonify({
            "error": "Access denied. Patient account required."
        }), 403

    prescriptions = read_data("prescriptions.json")

    for prescription in prescriptions:

        if (
            prescription["id"] == prescription_id
            and prescription["patient_id"] == current_user["user_id"]
        ):

            base_dir = os.path.dirname(
                os.path.dirname(os.path.abspath(__file__))
            )

            relative_path = prescription.get("docx")

            if not relative_path:
                return jsonify({
                    "error": "Prescription DOCX is not available"
                }), 404

            file_path = os.path.join(
                base_dir,
                relative_path
            )

            if not os.path.exists(file_path):
                return jsonify({
                    "error": "Prescription DOCX not found"
                }), 404

            return send_file(
                file_path,
                as_attachment=True,
                download_name=f"prescription-{prescription_id}.docx",
                mimetype=(
                    "application/vnd.openxmlformats-officedocument."
                    "wordprocessingml.document"
                )
            )

    return jsonify({
        "error": "Prescription not found"
    }), 404
# =====================================================
# GET ALL REGISTERED DOCTORS
# =====================================================

@patient_bp.route("/doctors", methods=["GET"])
@token_required
def get_all_doctors(current_user):

    if current_user["role"] != "patient":
        return jsonify({
            "error": "Access denied. Patient account required."
        }), 403

    doctors = read_data("doctors.json")

    doctor_list = []

    for doctor in doctors:
        doctor_list.append({
            "id": doctor.get("id"),
            "name": doctor.get("name", ""),
            "specialization": doctor.get("specialization", ""),
            "description": doctor.get("description", ""),
            "location": doctor.get("location", ""),
            "experience": doctor.get("experience", 0),
            "rating": doctor.get("rating", 0)
        })

    return jsonify({
        "doctors": doctor_list
    }), 200