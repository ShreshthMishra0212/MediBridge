"""
MediBridge AI Calling Agent API Layer
Designed for integration with Exotel Voicebot / Workflow Builder.
Provides caller identification, natural bilingual triage, doctor search,
availability resolution with booked-slot exclusion, and atomic appointment booking.
"""

from flask import Blueprint, request, jsonify
import db
import uuid
import os
import re
import json
import logging
from datetime import datetime, timedelta, date

logger = logging.getLogger("medibridge.calling")

calling_bp = Blueprint("calling", __name__)


# =====================================================
# API AUTHENTICATION & SECURITY HELPER
# =====================================================

def check_calling_api_key():
    """
    Validates optional X-API-Key or X-Calling-Auth-Token against EXOTEL_CALLING_API_KEY.
    If EXOTEL_CALLING_API_KEY is configured in the environment, requests must provide it.
    """
    expected_key = os.getenv("EXOTEL_CALLING_API_KEY")
    if not expected_key:
        return True, None

    auth_header = (
        request.headers.get("X-API-Key")
        or request.headers.get("X-Calling-Auth-Token")
        or request.headers.get("Authorization", "").replace("Bearer ", "").strip()
    )

    if not auth_header or auth_header != expected_key:
        return False, (jsonify({
            "success": False,
            "error": "UNAUTHORIZED",
            "message": "Invalid or missing X-API-Key header"
        }), 401)

    return True, None


# =====================================================
# PHONE NUMBER NORMALIZATION
# =====================================================

def normalize_phone_number(raw_phone):
    """
    Normalizes phone numbers to standard 10-digit format and +91 format.
    Handles +91, 91, 0 prefixes, spaces, hyphens, and brackets safely.
    Returns (10_digit_str, standard_e164_str).
    """
    if not raw_phone:
        return "", ""

    digits = re.sub(r"\D", "", str(raw_phone))

    if len(digits) == 12 and digits.startswith("91"):
        digits_10 = digits[2:]
    elif len(digits) == 11 and digits.startswith("0"):
        digits_10 = digits[1:]
    elif len(digits) >= 10:
        digits_10 = digits[-10:]
    else:
        digits_10 = digits

    e164 = f"+91{digits_10}" if len(digits_10) == 10 else digits
    return digits_10, e164


def find_patient_by_phone(phone_input):
    """
    Finds a patient by phone number across patients and users tables.
    Uses clean 10-digit suffix matching after stripping non-digit characters
    from both the input and the stored phone numbers.
    """
    digits_10, e164 = normalize_phone_number(phone_input)
    if not digits_10:
        return None

    # Normalize stored phone by removing all non-digit characters and comparing last 10 digits
    # This handles stored formats like '9876543210', '+91 9876543210', '+91-98765-43210'
    patient = db.query_one(
        """
        SELECT p.id, p.name, p.phone, p.email, p.age, p.gender, p.address
        FROM patients p
        WHERE p.phone IS NOT NULL AND
            SUBSTR(
                REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(p.phone, ' ', ''), '+', ''), '-', ''), '(', ''), ')', ''),
                -10
            ) = ?
        LIMIT 1
        """,
        (digits_10,)
    )

    if patient:
        return patient

    # Fallback: also try exact matches for edge cases
    patient = db.query_one(
        """
        SELECT p.id, p.name, p.phone, p.email, p.age, p.gender, p.address
        FROM patients p
        WHERE p.phone IS NOT NULL AND (p.phone = ? OR p.phone = ?)
        LIMIT 1
        """,
        (phone_input, e164)
    )

    return patient


def verify_caller_owns_patient(caller_phone, patient_id):
    """
    Security check: Verifies that caller_phone belongs to patient_id.
    Prevents a caller from accessing or modifying another patient's data.
    """
    if not caller_phone or not patient_id:
        return False

    patient = find_patient_by_phone(caller_phone)
    if not patient:
        return False

    return patient["id"] == patient_id


# =====================================================
# EMERGENCY DETECTION (Medical Safety Rule)
# =====================================================

EMERGENCY_KEYWORDS = [
    # English keywords
    "chest pain", "heart attack", "difficulty breathing", "cannot breathe",
    "can't breathe", "choking", "unconscious", "passed out", "fainted",
    "severe bleeding", "profuse bleeding", "heavy bleeding", "stroke",
    "face drooping", "slurred speech", "paralysis", "seizure", "fits",
    "convulsion", "anaphylaxis", "allergic reaction", "suicide",
    "kill myself", "overdose", "poison", "poisoning",

    # Hindi (Devanagari) keywords
    "सीने में दर्द", "सांस नहीं आ रही", "सांस लेने में तकलीफ", "बेहोश",
    "खून बह रहा", "दौरा", "स्ट्रोक", "जहर", "दिल का दौरा",

    # Hinglish keywords
    "seene mein dard", "seene me pain", "chest me severe pain", "saans nahi aa rahi",
    "saans lene me takleef", "behosh ho gaya", "behosh hai", "bahut zyada khoon",
    "heavy bleeding ho rahi", "daura pada", "stroke aa gaya", "poison kha liya",
    "zahar kha liya"
]


def check_emergency(problem_text):
    """
    Checks if the caller's described problem indicates an acute life-threatening emergency.
    Returns (is_emergency: bool, emergency_payload: dict).
    """
    if not problem_text:
        return False, None

    text_lower = problem_text.lower()
    for kw in EMERGENCY_KEYWORDS:
        if kw in text_lower:
            return True, {
                "success": True,
                "emergency": True,
                "action": "emergency_guidance",
                "emergency_number": "112",
                "message_en": (
                    "This sounds like a critical medical emergency. Please hang up immediately "
                    "and call 112 for emergency services or go to the nearest hospital emergency room."
                ),
                "message_hi": (
                    "यह एक गंभीर आपातकालीन स्थिति लगती है। कृपया तुरंत कॉल समाप्त करें और 112 पर "
                    "आपातकालीन सेवाओं को कॉल करें या निकटतम अस्पताल के आपातकालीन कक्ष (Emergency Room) में जाएँ।"
                ),
                "spoken_text": (
                    "This sounds like a medical emergency. Please hang up and call 112 immediately "
                    "or visit the nearest emergency room."
                )
            }

    return False, None


# =====================================================
# 1. IDENTIFY CALLER
# =====================================================

@calling_bp.route("/identify", methods=["POST"])
def identify_caller():
    """
    Identifies incoming caller by phone number.
    Returns patient profile and conversational greetings in English & Hindi.
    """
    is_valid, err_resp = check_calling_api_key()
    if not is_valid:
        return err_resp

    data = request.get_json() or {}
    raw_phone = data.get("phone", "").strip()

    if not raw_phone:
        return jsonify({
            "success": False,
            "error": "PHONE_REQUIRED",
            "message": "Phone number is required for identification"
        }), 400

    patient = find_patient_by_phone(raw_phone)

    if not patient:
        return jsonify({
            "success": False,
            "patient_found": False,
            "error": "PATIENT_NOT_FOUND",
            "message": "No MediBridge account associated with this phone number.",
            "spoken_greeting_en": (
                "Welcome to MediBridge. I couldn't find an existing account for this phone number. "
                "Please register on the MediBridge website or mobile app to book appointments."
            ),
            "spoken_greeting_hi": (
                "MediBridge में आपका स्वागत है। इस नंबर से कोई खाता नहीं मिला। "
                "Appointment बुक करने के लिए कृपया पहले MediBridge पर रजिस्टर करें।"
            )
        }), 404

    name = patient.get("name") or "Patient"
    digits_10, e164 = normalize_phone_number(raw_phone)

    greeting_en = f"Hello {name}! Welcome to MediBridge. How can I help you today?"
    greeting_hi = f"नमस्ते {name}! MediBridge में आपका स्वागत है। मैं आज आपकी क्या सहायता कर सकता हूँ?"
    greeting_hinglish = f"Hello {name}! MediBridge mein aapka welcome hai. Aaj main aapki kya help kar sakta hoon?"

    return jsonify({
        "success": True,
        "patient_found": True,
        "patient": {
            "id": patient["id"],
            "name": name,
            "phone": e164 or patient.get("phone"),
            "email": patient.get("email"),
            "age": patient.get("age"),
            "gender": patient.get("gender")
        },
        "spoken_greeting_en": greeting_en,
        "spoken_greeting_hi": greeting_hi,
        "spoken_greeting_hinglish": greeting_hinglish,
        "preferred_language": "auto"
    }), 200


# =====================================================
# 2. RECOMMEND SPECIALTY (Problem -> Specialty)
# =====================================================

@calling_bp.route("/recommend-specialty", methods=["POST"])
def recommend_specialty():
    """
    Analyzes patient symptom description in English, Hindi, or Hinglish.
    Checks emergency safety first.
    Constrains final specialty to specialties actually available in the SQLite doctors database.
    """
    is_valid, err_resp = check_calling_api_key()
    if not is_valid:
        return err_resp

    data = request.get_json() or {}
    problem = data.get("problem", "").strip()
    language = data.get("language", "auto").lower()

    if not problem:
        return jsonify({
            "success": False,
            "error": "PROBLEM_REQUIRED",
            "message": "Please provide a description of the health problem or symptoms."
        }), 400

    # 1. Emergency safety check
    is_emergency, emergency_data = check_emergency(problem)
    if is_emergency:
        return jsonify(emergency_data), 200

    # 2. Fetch registered doctor specialties from SQLite
    registered_docs = db.query_all(
        "SELECT DISTINCT specialization FROM doctors WHERE specialization IS NOT NULL AND specialization != ''"
    )
    registered_specialties = [d["specialization"] for d in registered_docs if d.get("specialization")]

    # If database has no registered doctors at all
    if not registered_specialties:
        return jsonify({
            "success": True,
            "emergency": False,
            "specialty": "General Physician",
            "reason": "General primary consultation.",
            "matching_doctor_count": 0,
            "spoken_recommendation_en": "I can assist you with booking a General Physician consultation.",
            "spoken_recommendation_hi": "मैं आपके लिए एक सामान्य चिकित्सक (General Physician) से परामर्श बुक करने में मदद कर सकता हूँ।"
        }), 200

    # 3. AI Triage via Groq / Qwen or rule-based fallback
    inferred_specialty = ""
    reason_en = ""
    reason_hi = ""

    api_key = os.getenv("GROQ_API_KEY") or os.getenv("NVIDIA_API_KEY") or os.getenv("KIMI_API_KEY")

    if api_key:
        try:
            import requests
            groq_key = os.getenv("GROQ_API_KEY")
            prompt = f"""You are a medical triage receptionist for MediBridge hospital.
Analyze the patient's health problem (which may be in English, Hindi, or Hinglish) and select the single most appropriate medical specialty from this available list:
{json.dumps(registered_specialties)}

Patient description: "{problem}"

Instructions:
1. Select the closest specialty from the list above.
2. Provide a 1-sentence plain English reason for why this specialist is appropriate.
3. Provide a 1-sentence natural Hindi reason (in Devanagari script).
4. Return ONLY valid JSON with no markdown formatting.

Format:
{{
  "specialty": "<Exact Name from list>",
  "reason_en": "<1 sentence English>",
  "reason_hi": "<1 sentence Hindi>"
}}"""

            invoke_url = "https://api.groq.com/openai/v1/chat/completions"
            headers = {
                "Authorization": f"Bearer {groq_key}",
                "Content-Type": "application/json",
            }
            payload = {
                "messages": [{"role": "user", "content": prompt}],
                "model": "qwen/qwen3.8-27b",
                "max_tokens": 512,
                "temperature": 0.2,
                "stream": False
            }

            resp = requests.post(invoke_url, headers=headers, json=payload, timeout=15)
            if resp.status_code == 200:
                raw_text = resp.json()["choices"][0]["message"]["content"].strip()
                if raw_text.startswith("```"):
                    lines = raw_text.split("\n")
                    lines = [l for l in lines if not l.strip().startswith("```")]
                    raw_text = "\n".join(lines).strip()
                if raw_text.startswith("json"):
                    raw_text = raw_text[4:].strip()

                start = raw_text.find("{")
                end = raw_text.rfind("}")
                if start != -1 and end != -1:
                    parsed = json.loads(raw_text[start:end+1])
                    inferred_specialty = parsed.get("specialty", "").strip()
                    reason_en = parsed.get("reason_en", "").strip()
                    reason_hi = parsed.get("reason_hi", "").strip()
        except Exception as e:
            logger.warning(f"Groq specialty recommendation failed: {e}")

    # Fallback heuristic supporting English, Hindi, and Hinglish keywords
    if not inferred_specialty:
        prob_lower = problem.lower()

        # Bone / Orthopedic
        if any(k in prob_lower for k in [
            "bone", "joint", "wrist", "knee", "leg", "arm", "fracture", "fall", "gir gaya",
            "pain in leg", "haddi", "ghutna", "kamar dard", "back pain", "sprain", "murg", "ligament"
        ]):
            inferred_specialty = "Orthopedist"
            reason_en = "An Orthopedic specialist evaluates bone, joint, and injury-related symptoms."
            reason_hi = "हड्डियों, जोड़ों और चोट संबंधी समस्याओं के लिए हड्डी रोग विशेषज्ञ उपयुक्त हैं।"

        # Heart / Cardiology
        elif any(k in prob_lower for k in [
            "heart", "palpitation", "bp", "blood pressure", "dil", "dhadkan", "cardiac", "heavy chest"
        ]):
            inferred_specialty = "Cardiologist"
            reason_en = "A Cardiologist evaluates heart, pulse, and blood pressure conditions."
            reason_hi = "हृदय और रक्तचाप संबंधी समस्याओं के लिए हृदय रोग विशेषज्ञ (Cardiologist) से परामर्श करें।"

        # Skin / Dermatology
        elif any(k in prob_lower for k in [
            "skin", "rash", "itch", "khujli", "acne", "pimple", "allergy", "redness", "daane", "tvacha"
        ]):
            inferred_specialty = "Dermatologist"
            reason_en = "A Dermatologist diagnoses and treats skin conditions, rashes, and allergies."
            reason_hi = "त्वचा के चकत्ते, खुजली और एलर्जी के इलाज के लिए त्वचा रोग विशेषज्ञ उपयुक्त हैं।"

        # Gynecologist / Women's health
        elif any(k in prob_lower for k in [
            "period", "periods", "cycle", "cramp", "menstrual", "pregnant", "pregnancy", "vagina", "uterus", "pcos", "garbh"
        ]):
            inferred_specialty = "Gynecologist"
            reason_en = "A Gynecologist specializes in female reproductive health and menstrual wellness."
            reason_hi = "महिला स्वास्थ्य और मासिक धर्म संबंधी समस्याओं के लिए स्त्री रोग विशेषज्ञ उपयुक्त हैं।"

        # Pediatrician / Children
        elif any(k in prob_lower for k in [
            "child", "baby", "kid", "infant", "baccha", "bachhe", "beti", "beta", "toddler"
        ]):
            inferred_specialty = "Pediatrician"
            reason_en = "A Pediatrician specializes in children's healthcare and development."
            reason_hi = "बच्चों के स्वास्थ्य और विकास की देखभाल के लिए शिशु रोग विशेषज्ञ उपयुक्त हैं।"

        # General Physician (Default)
        else:
            inferred_specialty = "General Physician"
            reason_en = "A General Physician is recommended for comprehensive primary medical evaluation."
            reason_hi = "सामान्य स्वास्थ्य जांच और प्राथमिक उपचार के लिए सामान्य चिकित्सक (General Physician) उपयुक्त हैं।"

    # 4. Map inferred specialty to actual registered specialties in DB
    matched_specialty = None
    for reg_spec in registered_specialties:
        if reg_spec.lower() == inferred_specialty.lower():
            matched_specialty = reg_spec
            break
        elif inferred_specialty.lower() in reg_spec.lower() or reg_spec.lower() in inferred_specialty.lower():
            matched_specialty = reg_spec
            break

    # If no exact or substring match, check if "General Physician" or first registered exists
    if not matched_specialty:
        for reg_spec in registered_specialties:
            if "general" in reg_spec.lower() or "physician" in reg_spec.lower():
                matched_specialty = reg_spec
                break
        if not matched_specialty and registered_specialties:
            matched_specialty = registered_specialties[0]

    # 5. Count matching doctors in SQLite
    doc_count_row = db.query_one(
        "SELECT COUNT(*) as cnt FROM doctors WHERE LOWER(specialization) = LOWER(?)",
        (matched_specialty,)
    )
    doc_count = doc_count_row["cnt"] if doc_count_row else 0

    spoken_en = (
        f"Based on what you described, I recommend consulting a {matched_specialty}. "
        f"We have {doc_count} specialist{'s' if doc_count != 1 else ''} available. "
        "Would you like me to find the best available doctor for you?"
    )

    spoken_hi = (
        f"आपके बताए अनुसार, {matched_specialty} से परामर्श लेना सबसे उपयुक्त रहेगा। "
        f"हमारे पास {doc_count} विशेषज्ञ डॉक्टर उपलब्ध हैं। "
        "क्या मैं आपके लिए डॉक्टर की सूची चेक करूँ?"
    )

    return jsonify({
        "success": True,
        "emergency": False,
        "specialty": matched_specialty,
        "reason": reason_en or f"Suitable for symptoms matching {matched_specialty}.",
        "reason_hi": reason_hi or f"{matched_specialty} आपकी समस्या के लिए उपयुक्त विशेषज्ञ हैं।",
        "matching_doctor_count": doc_count,
        "spoken_recommendation_en": spoken_en,
        "spoken_recommendation_hi": spoken_hi,
        "available_specialties": registered_specialties
    }), 200


# =====================================================
# 3. DOCTOR SEARCH & RANKING
# =====================================================

@calling_bp.route("/doctors", methods=["GET"])
def get_calling_doctors():
    """
    Fetches real registered doctors filtered by specialty.
    Ranks doctors by rating and experience.
    Returns clean, voice-friendly doctor details and spoken selection summaries.
    """
    is_valid, err_resp = check_calling_api_key()
    if not is_valid:
        return err_resp

    specialty = request.args.get("specialty", "").strip()
    preferred_date = request.args.get("date", "").strip()

    if specialty:
        doctors = db.query_all(
            """
            SELECT id, name, specialization, description, location, experience, rating, available_slots
            FROM doctors
            WHERE LOWER(specialization) LIKE '%' || LOWER(?) || '%' OR LOWER(?) LIKE '%' || LOWER(specialization) || '%'
            ORDER BY rating DESC, experience DESC, name ASC
            """,
            (specialty, specialty)
        )
    else:
        doctors = db.query_all(
            """
            SELECT id, name, specialization, description, location, experience, rating, available_slots
            FROM doctors
            WHERE specialization IS NOT NULL AND specialization != ''
            ORDER BY rating DESC, experience DESC, name ASC
            """
        )

    formatted_doctors = []
    for d in doctors:
        slots = db.parse_json(d.get("available_slots"), [])
        formatted_doctors.append({
            "id": d["id"],
            "name": d["name"],
            "specialization": d.get("specialization") or "General Physician",
            "experience": d.get("experience") or 0,
            "rating": round(float(d.get("rating") or 0.0), 1),
            "location": d.get("location") or "MediBridge Clinic",
            "description": d.get("description") or "",
            "has_configured_slots": len(slots) > 0
        })

    if not formatted_doctors:
        return jsonify({
            "success": True,
            "doctors": [],
            "count": 0,
            "spoken_summary_en": f"I couldn't find any currently registered doctors for {specialty}. Let me check general physicians for you.",
            "spoken_summary_hi": f"क्षमा करें, {specialty} के लिए कोई डॉक्टर उपलब्ध नहीं मिले। क्या मैं सामान्य चिकित्सक चेक करूँ?"
        }), 200

    # Build natural spoken options for voicebot
    top_docs = formatted_doctors[:2]
    if len(top_docs) == 1:
        doc = top_docs[0]
        spoken_en = f"I found {doc['name']}, a {doc['specialization']} with a {doc['rating']} star rating. Would you like to check their available appointment slots?"
        spoken_hi = f"मुझे {doc['name']} मिले हैं, जो {doc['specialization']} हैं और उनकी रेटिंग {doc['rating']} स्टार है। क्या आप उनके उपलब्ध समय देखना चाहेंगे?"
    else:
        d1, d2 = top_docs[0], top_docs[1]
        spoken_en = (
            f"I found {len(formatted_doctors)} specialists. For example, {d1['name']} with a {d1['rating']} star rating, "
            f"and {d2['name']} with a {d2['rating']} star rating. Which doctor would you prefer?"
        )
        spoken_hi = (
            f"मुझे {len(formatted_doctors)} डॉक्टर मिले हैं। जैसे {d1['name']} जिनकी रेटिंग {d1['rating']} स्टार है, "
            f"और {d2['name']} जिनकी रेटिंग {d2['rating']} स्टार है। आप किसे चुनना चाहेंगे?"
        )

    return jsonify({
        "success": True,
        "count": len(formatted_doctors),
        "doctors": formatted_doctors,
        "spoken_summary_en": spoken_en,
        "spoken_summary_hi": spoken_hi
    }), 200


# =====================================================
# 4. AVAILABILITY RESOLVER (With Booked Slot Exclusion)
# =====================================================

DEFAULT_CONSULTATION_SLOTS = [
    "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM",
    "11:00 AM", "11:30 AM", "12:00 PM",
    "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM",
    "04:00 PM", "04:30 PM", "05:00 PM"
]


def resolve_date_expression(date_str):
    """
    Resolves natural date expressions ('tomorrow', 'today', 'monday', etc.)
    into 'YYYY-MM-DD'.
    """
    if not date_str:
        return (date.today() + timedelta(days=1)).isoformat()

    cleaned = date_str.lower().strip()
    today = date.today()

    if cleaned in ["today", "aaj"]:
        return today.isoformat()
    if cleaned in ["tomorrow", "kal", "next day"]:
        return (today + timedelta(days=1)).isoformat()
    if cleaned in ["day after tomorrow", "parson", "day after"]:
        return (today + timedelta(days=2)).isoformat()

    # Match standard YYYY-MM-DD
    if re.match(r"^\d{4}-\d{2}-\d{2}$", cleaned):
        return cleaned

    # Match weekdays (e.g. monday, tuesday)
    weekdays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
    for idx, day_name in enumerate(weekdays):
        if day_name in cleaned:
            days_ahead = idx - today.weekday()
            if days_ahead <= 0:
                days_ahead += 7
            return (today + timedelta(days=days_ahead)).isoformat()

    return (today + timedelta(days=1)).isoformat()


@calling_bp.route("/availability", methods=["GET"])
def get_doctor_availability():
    """
    Fetches real available slots for a doctor on a specific date.
    Subtracts already booked (Confirmed/Pending) appointments from SQLite.
    Supports natural time-of-day filtering (morning, afternoon, evening).
    """
    is_valid, err_resp = check_calling_api_key()
    if not is_valid:
        return err_resp

    doctor_id = request.args.get("doctor_id", "").strip()
    raw_date = request.args.get("date", "").strip()
    time_pref = request.args.get("time_preference", "").lower().strip()

    if not doctor_id:
        return jsonify({
            "success": False,
            "error": "DOCTOR_ID_REQUIRED",
            "message": "Doctor ID is required to check availability"
        }), 400

    doctor = db.query_one("SELECT id, name, specialization, available_slots FROM doctors WHERE id = ?", (doctor_id,))
    if not doctor:
        return jsonify({
            "success": False,
            "error": "DOCTOR_NOT_FOUND",
            "message": "Doctor not found"
        }), 404

    target_date = resolve_date_expression(raw_date)

    # 1. Base slots from doctor.available_slots or clinic default consultation slots
    configured_slots = db.parse_json(doctor.get("available_slots"), [])
    if configured_slots and isinstance(configured_slots, list) and len(configured_slots) > 0:
        base_times = [s if isinstance(s, str) else s.get("time") for s in configured_slots if s]
    else:
        base_times = list(DEFAULT_CONSULTATION_SLOTS)

    # 2. Subtract already booked appointments from SQLite
    booked_rows = db.query_all(
        """
        SELECT time FROM appointments
        WHERE doctor_id = ? AND date = ? AND status != 'Cancelled'
        """,
        (doctor_id, target_date)
    )
    booked_times = set(r["time"].strip().upper() for r in booked_rows if r.get("time"))

    available_times = [
        t for t in base_times
        if t and t.strip().upper() not in booked_times
    ]

    # 3. Apply time-of-day preference if requested
    filtered_times = []
    for t in available_times:
        is_morning = "AM" in t or t.startswith(("09", "10", "11"))
        is_afternoon = "PM" in t and (t.startswith(("12", "01", "02", "03", "1", "2", "3")))
        is_evening = "PM" in t and (t.startswith(("04", "05", "06", "07", "4", "5", "6", "7")))

        if time_pref in ["morning", "subah", "saver"]:
            if is_morning:
                filtered_times.append(t)
        elif time_pref in ["afternoon", "dopahar"]:
            if is_afternoon:
                filtered_times.append(t)
        elif time_pref in ["evening", "shaam", "raat"]:
            if is_evening:
                filtered_times.append(t)
        else:
            filtered_times.append(t)

    # Fallback to all available if time filter was too strict
    slots_to_return = filtered_times if filtered_times else available_times

    # Spoken suggestion building
    doc_name = doctor.get("name", "Doctor")
    if slots_to_return:
        sample_slots = slots_to_return[:3]
        sample_str = ", ".join(sample_slots)
        spoken_en = f"On {target_date}, {doc_name} is available at {sample_str}. Which time works best for you?"
        spoken_hi = f"{target_date} को {doc_name} {sample_str} पर उपलब्ध हैं। आप कौन सा समय पसंद करेंगे?"
    else:
        # Check next available day
        spoken_en = f"I'm sorry, {doc_name} has no available slots left on {target_date}. Would you like to check the following day?"
        spoken_hi = f"माफ़ कीजिए, {target_date} को {doc_name} के सभी स्लॉट बुक हैं। क्या मैं अगले दिन का समय चेक करूँ?"

    return jsonify({
        "success": True,
        "doctor_id": doctor_id,
        "doctor_name": doc_name,
        "date": target_date,
        "available_slots": slots_to_return,
        "total_available": len(slots_to_return),
        "spoken_availability_en": spoken_en,
        "spoken_availability_hi": spoken_hi
    }), 200


# =====================================================
# 5. ATOMIC APPOINTMENT BOOKING
# =====================================================

@calling_bp.route("/book", methods=["POST"])
def book_calling_appointment():
    """
    Atomically creates an appointment in SQLite after explicit confirmation.
    Enforces security: caller phone must match patient_id.
    Prevents duplicate bookings and slot collisions.
    """
    is_valid, err_resp = check_calling_api_key()
    if not is_valid:
        return err_resp

    data = request.get_json() or {}

    phone = data.get("phone", "").strip()
    patient_id = data.get("patient_id", "").strip()
    doctor_id = data.get("doctor_id", "").strip()
    date_val = data.get("date", "").strip()
    time_val = data.get("time", "").strip()
    confirmed = data.get("confirmed", False)

    # 1. Validate required fields
    if not phone or not doctor_id or not date_val or not time_val:
        return jsonify({
            "success": False,
            "error": "MISSING_FIELDS",
            "message": "phone, doctor_id, date, and time are required for booking."
        }), 400

    # 2. Resolve patient by phone and verify identity ownership
    patient = find_patient_by_phone(phone)
    if not patient:
        return jsonify({
            "success": False,
            "error": "PATIENT_NOT_FOUND",
            "message": "No registered patient found for this phone number."
        }), 404

    resolved_patient_id = patient["id"]

    # If caller provided patient_id, ensure it strictly matches verified caller phone
    if patient_id and patient_id != resolved_patient_id:
        return jsonify({
            "success": False,
            "error": "IDENTITY_MISMATCH",
            "message": "Security error: Caller phone does not match requested patient identity."
        }), 403

    # 3. Explicit confirmation requirement
    if not confirmed or confirmed not in [True, "true", "True", 1]:
        return jsonify({
            "success": False,
            "error": "CONFIRMATION_REQUIRED",
            "message": "Appointment requires explicit patient confirmation before booking."
        }), 400

    # 4. Verify doctor exists
    doctor = db.query_one("SELECT * FROM doctors WHERE id = ?", (doctor_id,))
    if not doctor:
        return jsonify({
            "success": False,
            "error": "DOCTOR_NOT_FOUND",
            "message": "Selected doctor was not found in the database."
        }), 404

    resolved_date = resolve_date_expression(date_val)
    patient_name = patient.get("name") or "Patient"
    doctor_name = doctor.get("name") or "Doctor"
    specialization = doctor.get("specialization") or "General Physician"
    location = doctor.get("location") or "MediBridge Clinic"
    rating = float(doctor.get("rating") or 0.0)

    # 5. Check for duplicate appointment by the same patient
    existing_patient_app = db.query_one(
        """
        SELECT id, status, date, time FROM appointments
        WHERE patient_id = ? AND doctor_id = ? AND date = ? AND time = ? AND status != 'Cancelled'
        LIMIT 1
        """,
        (resolved_patient_id, doctor_id, resolved_date, time_val)
    )

    if existing_patient_app:
        return jsonify({
            "success": True,
            "already_booked": True,
            "message": "Appointment already booked.",
            "appointment": {
                "id": existing_patient_app["id"],
                "patient_id": resolved_patient_id,
                "patient_name": patient_name,
                "doctor_id": doctor_id,
                "doctor_name": doctor_name,
                "specialization": specialization,
                "date": resolved_date,
                "time": time_val,
                "status": existing_patient_app["status"]
            },
            "spoken_confirmation_en": (
                f"Your appointment with {doctor_name} on {resolved_date} at {time_val} is already confirmed."
            ),
            "spoken_confirmation_hi": (
                f"{doctor_name} के साथ आपका appointment {resolved_date} को {time_val} पर पहले से confirm है।"
            )
        }), 200

    # 6. Check slot conflict (another patient booked the same slot)
    slot_conflict = db.query_one(
        """
        SELECT id FROM appointments
        WHERE doctor_id = ? AND date = ? AND time = ? AND status != 'Cancelled'
        LIMIT 1
        """,
        (doctor_id, resolved_date, time_val)
    )

    if slot_conflict:
        return jsonify({
            "success": False,
            "error": "SLOT_UNAVAILABLE",
            "message": "This appointment slot is no longer available. Please choose another time."
        }), 409

    # 7. Atomic transaction insertion into appointments table
    new_app_id = str(uuid.uuid4())

    with db.get_db_context() as conn:
        conn.execute(
            """
            INSERT INTO appointments (
                id, patient_id, doctor_id, doctorName, specialist, area, rating,
                date, time, status, requested_date, requested_time, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Confirmed', ?, ?, DATETIME('now'))
            """,
            (
                new_app_id,
                resolved_patient_id,
                doctor_id,
                doctor_name,
                specialization,
                location,
                rating,
                resolved_date,
                time_val,
                resolved_date,
                time_val
            )
        )

    # 8. Conversational confirmation message
    spoken_en = (
        f"Your appointment with {doctor_name}, a {specialization} specialist, has been confirmed for "
        f"{resolved_date} at {time_val}. Thank you for choosing MediBridge!"
    )
    spoken_hi = (
        f"{doctor_name} ({specialization}) के साथ आपका appointment {resolved_date} को "
        f"{time_val} बजे सफलतापूर्वक confirm हो गया है। MediBridge चुनने के लिए धन्यवाद!"
    )

    return jsonify({
        "success": True,
        "message": "Appointment booked successfully",
        "appointment": {
            "id": new_app_id,
            "patient_id": resolved_patient_id,
            "patient_name": patient_name,
            "doctor_id": doctor_id,
            "doctor_name": doctor_name,
            "specialization": specialization,
            "location": location,
            "date": resolved_date,
            "time": time_val,
            "status": "Confirmed"
        },
        "spoken_confirmation_en": spoken_en,
        "spoken_confirmation_hi": spoken_hi
    }), 201


# =====================================================
# 6. APPOINTMENT LOOKUP FOR CALLER
# =====================================================

@calling_bp.route("/appointments", methods=["GET"])
def get_caller_appointments():
    """
    Retrieves upcoming and active appointments for the verified caller phone.
    """
    is_valid, err_resp = check_calling_api_key()
    if not is_valid:
        return err_resp

    phone = request.args.get("phone", "").strip()
    if not phone:
        return jsonify({
            "success": False,
            "error": "PHONE_REQUIRED",
            "message": "Phone number is required to retrieve appointments."
        }), 400

    patient = find_patient_by_phone(phone)
    if not patient:
        return jsonify({
            "success": False,
            "error": "PATIENT_NOT_FOUND",
            "message": "No registered patient found for this phone number."
        }), 404

    appointments = db.query_all(
        """
        SELECT id, doctor_id, doctorName, specialist, area, date, time, status, join_url
        FROM appointments
        WHERE patient_id = ? AND status != 'Cancelled'
        ORDER BY date ASC, time ASC
        """,
        (patient["id"],)
    )

    if not appointments:
        return jsonify({
            "success": True,
            "count": 0,
            "appointments": [],
            "spoken_summary_en": "You currently have no active appointments scheduled.",
            "spoken_summary_hi": "आपके पास वर्तमान में कोई सक्रिय appointment बुक नहीं है।"
        }), 200

    # Spoken summary for first upcoming appointment
    first_app = appointments[0]
    spoken_en = (
        f"You have an upcoming appointment with {first_app['doctorName']} on "
        f"{first_app['date']} at {first_app['time']}. Status: {first_app['status']}."
    )
    spoken_hi = (
        f"आपका अगला appointment {first_app['date']} को {first_app['time']} बजे "
        f"{first_app['doctorName']} के साथ है।"
    )

    return jsonify({
        "success": True,
        "count": len(appointments),
        "appointments": appointments,
        "spoken_summary_en": spoken_en,
        "spoken_summary_hi": spoken_hi
    }), 200


# =====================================================
# 7. APPOINTMENT CANCELLATION
# =====================================================

@calling_bp.route("/cancel", methods=["POST"])
def cancel_calling_appointment():
    """
    Cancels an existing appointment after explicit confirmation.
    Security: caller phone must match the appointment's patient_id.
    """
    is_valid, err_resp = check_calling_api_key()
    if not is_valid:
        return err_resp

    data = request.get_json() or {}
    phone = data.get("phone", "").strip()
    appointment_id = data.get("appointment_id", "").strip()
    confirmed = data.get("confirmed", False)

    if not phone or not appointment_id:
        return jsonify({
            "success": False,
            "error": "MISSING_FIELDS",
            "message": "phone and appointment_id are required."
        }), 400

    patient = find_patient_by_phone(phone)
    if not patient:
        return jsonify({
            "success": False,
            "error": "PATIENT_NOT_FOUND",
            "message": "Caller is not a registered patient."
        }), 404

    appointment = db.query_one(
        "SELECT * FROM appointments WHERE id = ? AND patient_id = ?",
        (appointment_id, patient["id"])
    )

    if not appointment:
        return jsonify({
            "success": False,
            "error": "APPOINTMENT_NOT_FOUND",
            "message": "Appointment not found or does not belong to this caller."
        }), 404

    if not confirmed:
        return jsonify({
            "success": False,
            "error": "CONFIRMATION_REQUIRED",
            "message": "Cancellation requires explicit patient confirmation."
        }), 400

    db.execute(
        "UPDATE appointments SET status = 'Cancelled' WHERE id = ?",
        (appointment_id,)
    )

    spoken_en = f"Your appointment with {appointment['doctorName']} on {appointment['date']} has been cancelled."
    spoken_hi = f"{appointment['doctorName']} के साथ आपका {appointment['date']} का appointment रद्द (cancel) कर दिया गया है।"

    return jsonify({
        "success": True,
        "message": "Appointment cancelled successfully",
        "appointment_id": appointment_id,
        "spoken_confirmation_en": spoken_en,
        "spoken_confirmation_hi": spoken_hi
    }), 200
