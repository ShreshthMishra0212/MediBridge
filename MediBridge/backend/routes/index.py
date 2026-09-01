
import os
import base64
import io
import datetime

from dotenv import load_dotenv

# ============================================================
# LOAD .ENV FROM BACKEND DIRECTORY
# ============================================================

BASE_DIR = os.path.dirname(
    os.path.abspath(__file__)
)

load_dotenv(
    os.path.join(
        BASE_DIR,
        ".env"
    )
)


# ============================================================
# IMPORTS
# ============================================================

import requests

from flask import (
    Flask,
    request,
    jsonify
)

from flask_cors import CORS

from PIL import Image
from werkzeug.utils import secure_filename

from auth import auth_bp
from patient import patient_bp
from doctor import doctor_bp

from med_salts import extract_meds_from_text
from briefer import summarize_health_report

# Google Meet
from meeting_generator import create_google_meet


# ============================================================
# FLASK APP
# ============================================================

app = Flask(
    __name__
)

CORS(
    app
)


# ============================================================
# EXISTING MEDIBRIDGE BLUEPRINTS
# ============================================================

app.register_blueprint(
    auth_bp,
    url_prefix="/api/auth"
)

app.register_blueprint(
    patient_bp,
    url_prefix="/api/patients"
)

app.register_blueprint(
    doctor_bp,
    url_prefix="/api/doctors"
)


# ============================================================
# NVIDIA CONFIGURATION
# ============================================================

NVIDIA_API_KEY = "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"
NVIDIA_OCR_URL = "https://ai.api.nvidia.com/v1/cv/nvidia/nemotron-ocr-v2"


# ============================================================
# HISTORY DIRECTORY
# ============================================================

HISTORY_DIR = os.path.join(
    BASE_DIR,
    "history"
)


# ============================================================
# STARTUP DEBUG
# ============================================================

print("----------------------------------------")
print("MEDIBRIDGE BACKEND")
print("----------------------------------------")

print(
    "BASE DIR:",
    BASE_DIR
)

print(
    "HISTORY DIR:",
    HISTORY_DIR
)

print(
    "NVIDIA KEY LOADED:",
    bool(NVIDIA_API_KEY)
)

print(
    "KIMI KEY LOADED:",
    bool(
        os.getenv(
            "KIMI_API_KEY"
        )
    )
)

print("----------------------------------------")


# ============================================================
# IMAGE COMPRESSION
# ============================================================

def compress_image(
    image_bytes,
    max_size_kb=100
):

    img = Image.open(
        io.BytesIO(
            image_bytes
        )
    ).convert(
        "RGB"
    )

    max_dim = 1600

    if max(img.size) > max_dim:

        img.thumbnail(
            (
                max_dim,
                max_dim
            )
        )

    quality = 85

    buf = io.BytesIO()

    while quality > 20:

        buf = io.BytesIO()

        img.save(
            buf,
            format="JPEG",
            quality=quality
        )

        if (
            buf.tell()
            <= max_size_kb * 1024
        ):

            break

        quality -= 10

    return (
        buf.getvalue(),
        "image/jpeg"
    )


# ============================================================
# PATIENT HISTORY UPLOAD
# ============================================================

@app.route(
    "/upload",
    methods=["POST"]
)
def prescription():

    os.makedirs(
        HISTORY_DIR,
        exist_ok=True
    )

    name = request.args.get(
        "fname"
    )

    if not name:

        return jsonify({
            "error":
                "fname is required"
        }), 400

    files = request.files.getlist(
        "files"
    )

    if not files:

        return jsonify({
            "error":
                "No files uploaded"
        }), 400

    saved_files = []

    for file in files:

        if (
            not file
            or not file.filename
        ):

            continue

        safe_name = secure_filename(
            file.filename
        )

        if not safe_name:

            continue

        file_path = os.path.join(
            HISTORY_DIR,
            f"{name}_{safe_name}"
        )

        file.save(
            file_path
        )

        saved_files.append(
            safe_name
        )

        print(
            "Saved history file:",
            file_path
        )

    if not saved_files:

        return jsonify({
            "error":
                "No valid files uploaded"
        }), 400

    return jsonify({
        "status":
            "recieved",

        "files":
            saved_files
    }), 200


# ============================================================
# AI HEALTH REPORT BRIEF
# ============================================================

@app.route("/brief_assist", methods=["GET"])
def brief_assist():
    p_id = request.args.get("fname")
    if not p_id:
        return jsonify({"error": "fname (patient_id) is required"}), 400

    files = []

    # 1. Search HISTORY_DIR for files associated with p_id
    if os.path.isdir(HISTORY_DIR):
        for filename in os.listdir(HISTORY_DIR):
            if filename.startswith(p_id + "_") or filename.startswith(p_id + "."):
                full_path = os.path.join(HISTORY_DIR, filename)
                if os.path.isfile(full_path):
                    files.append(full_path)

    # 2. Search uploads directory for documents registered to this patient
    try:
        patients_json_path = os.path.join(BASE_DIR, "data", "patients.json")
        if os.path.exists(patients_json_path):
            with open(patients_json_path, "r", encoding="utf-8") as f:
                patients_data = json.load(f)
            for pt in patients_data:
                if pt.get("id") == p_id:
                    for doc in pt.get("medical_documents", []):
                        doc_rel = doc.get("path")
                        if doc_rel:
                            doc_abs = os.path.join(os.path.dirname(BASE_DIR), doc_rel)
                            if os.path.isfile(doc_abs) and doc_abs not in files:
                                files.append(doc_abs)
    except Exception as e:
        print(f"Error checking patient upload records: {e}")

    print("----------------------------------------")
    print("BRIEF ASSIST REQUEST")
    print("Patient ID:", p_id)
    print("Identified Document Files:", files)
    print("----------------------------------------")

    try:
        summary = summarize_health_report(
            report_text="",
            file_paths=files,
            patient_id=p_id
        )

        return jsonify({
            "status": "success",
            "summary": summary
        }), 200
    except Exception as err:
        print(f"Error in summarize_health_report: {err}")
        return jsonify({
            "status": "error",
            "error": str(err)
        }), 500


# ============================================================
# GOOGLE MEET - CREATE MEETING
# ============================================================

@app.route(
    "/api/create-meet",
    methods=["POST"]
)
def create_meet():

    data = request.get_json(
        silent=True
    ) or {}

    start_time_str = data.get(
        "start_time"
    )

    if not start_time_str:

        return jsonify({
            "error":
                "start_time is required. "
                "Use ISO 8601 format, "
                "example: 2026-08-22T15:00:00"
        }), 400

    # --------------------------------------------------------
    # PARSE SLOT START TIME
    # --------------------------------------------------------

    try:

        start_time = (
            datetime.datetime
            .fromisoformat(
                start_time_str
            )
        )

    except ValueError:

        return jsonify({
            "error":
                "Invalid start_time format. "
                "Use ISO 8601 format, "
                "example: 2026-08-22T15:00:00"
        }), 400

    # --------------------------------------------------------
    # MEETING DETAILS
    # --------------------------------------------------------

    title = data.get(
        "title",
        "MediBridge Doctor Appointment"
    )

    duration_minutes = data.get(
        "duration_minutes",
        30
    )

    try:

        duration_minutes = int(
            duration_minutes
        )

    except (
        ValueError,
        TypeError
    ):

        return jsonify({
            "error":
                "duration_minutes must be a number"
        }), 400

    if duration_minutes <= 0:

        return jsonify({
            "error":
                "duration_minutes must be greater than 0"
        }), 400

    # --------------------------------------------------------
    # CREATE GOOGLE MEET
    # --------------------------------------------------------

    try:

        result = create_google_meet(
            start_time,
            title=title,
            duration_minutes=duration_minutes
        )

    except Exception as e:

        print(
            "GOOGLE MEET ERROR:",
            repr(e)
        )

        return jsonify({
            "error":
                f"Failed to create meeting: {str(e)}"
        }), 502

    # --------------------------------------------------------
    # RESPONSE
    # --------------------------------------------------------

    return jsonify({

        "status":
            "success",

        "join_url":
            result["join_url"],

        "event_id":
            result["event_id"],

        "start_time":
            result["start_time"].isoformat(),

        "expires_at":
            result["expires_at"].isoformat()

    }), 200


# ============================================================
# GOOGLE MEET - CHECK STATUS
# ============================================================

@app.route(
    "/api/check-status",
    methods=["GET"]
)
def check_status():

    expires_at_str = request.args.get(
        "expires_at"
    )

    if not expires_at_str:

        return jsonify({
            "error":
                "expires_at query param is required"
        }), 400

    try:

        expires_at = (
            datetime.datetime
            .fromisoformat(
                expires_at_str
            )
        )

    except ValueError:

        return jsonify({
            "error":
                "Invalid expires_at format"
        }), 400

    # --------------------------------------------------------
    # HANDLE TIMEZONE
    # --------------------------------------------------------

    if expires_at.tzinfo is None:

        # Treat naive timestamps as IST
        expires_at = expires_at.replace(
            tzinfo=datetime.timezone(
                datetime.timedelta(
                    hours=5,
                    minutes=30
                )
            )
        )

    now = datetime.datetime.now(
        datetime.timezone.utc
    )

    expires_at_utc = (
        expires_at.astimezone(
            datetime.timezone.utc
        )
    )

    is_expired = (
        now >= expires_at_utc
    )

    return jsonify({

        "expired":
            is_expired

    }), 200


# ============================================================
# NVIDIA OCR + MEDICINE SALT LOOKUP
# ============================================================

@app.route(
    "/api/extract",
    methods=["POST"]
)
def extract_text():

    if "image" not in request.files:

        return jsonify({
            "error":
                "No image file provided. "
                "Use form field 'image'."
        }), 400

    if not NVIDIA_API_KEY:

        return jsonify({
            "error":
                "NVIDIA_API_KEY is not configured"
        }), 503

    file = request.files[
        "image"
    ]

    image_bytes = file.read()

    # --------------------------------------------------------
    # COMPRESS IMAGE
    # --------------------------------------------------------

    try:

        image_bytes, mime = compress_image(
            image_bytes
        )

    except Exception as e:

        return jsonify({
            "error":
                f"Invalid image: {str(e)}"
        }), 400

    # --------------------------------------------------------
    # BASE64
    # --------------------------------------------------------

    image_b64 = base64.b64encode(
        image_bytes
    ).decode()

    if len(image_b64) >= 180_000:

        return jsonify({
            "error":
                "Image still too large after compression."
        }), 413

    # --------------------------------------------------------
    # NVIDIA REQUEST
    # --------------------------------------------------------

    headers = {
        "Authorization":
            f"Bearer {NVIDIA_API_KEY}",

        "Accept":
            "application/json"
    }

    payload = {
        "input": [
            {
                "type":
                    "image_url",

                "url":
                    f"data:{mime};base64,{image_b64}"
            }
        ]
    }

    try:

        resp = requests.post(
            NVIDIA_OCR_URL,
            headers=headers,
            json=payload,
            timeout=30
        )

        resp.raise_for_status()

        result = resp.json()

    except Exception as e:

        print(
            "NVIDIA OCR ERROR:",
            repr(e)
        )

        if getattr(
            e,
            "response",
            None
        ) is not None:

            print(
                "Response body:",
                e.response.text
            )

        return jsonify({
            "error":
                f"OCR failed: {str(e)}"
        }), 502

    # --------------------------------------------------------
    # EXTRACT OCR TEXT
    # --------------------------------------------------------

    text = extract_text_from_nvidia_response(
        result
    )

    # --------------------------------------------------------
    # MEDICINE MATCHING
    # --------------------------------------------------------

    matches = extract_meds_from_text(
        text
    )

    if not matches:

        return jsonify({
            "error":
                "No known medicine detected in image.",

            "raw_ocr":
                text
        }), 404

    salts = [
        {
            "medicine":
                name,

            "salt":
                salt
        }

        for name, salt in matches
    ]

    # Keep existing frontend contract
    return jsonify({
        "salts":
            salts[0]
    }), 200


# ============================================================
# NVIDIA RESPONSE PARSER
# ============================================================

def extract_text_from_nvidia_response(
    result
):
    try:
        extracted_text = ""
        for image_result in result.get("data", []):
            for detection in image_result.get("text_detections", []):
                txt = detection.get("text_prediction", {}).get("text", "")
                if txt:
                    extracted_text += txt + "\n"
        if extracted_text:
            return extracted_text.strip()
        
        # Fallback for other structures just in case
        if "output" in result:
            output = result["output"]
            if isinstance(output, list) and len(output) > 0:
                first = output[0]
                if isinstance(first, dict):
                    return first.get("text", "") or str(first)
                return str(first)
            return str(output)
        if "text" in result:
            return result["text"]
        return str(result)
    except Exception:
        return str(result)


# ============================================================
# HEALTH CHECK
# ============================================================

@app.route(
    "/",
    methods=["GET"]
)
def health():

    return jsonify({
        "status":
            "ok"
    }), 200


# ============================================================
# START SERVER
# ============================================================

if __name__ == "__main__":

    app.run(
        host="0.0.0.0",
        port=5000,
        debug=False
    )

