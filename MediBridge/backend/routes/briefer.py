import os
import json
import logging
import re
import requests
import base64
from dotenv import load_dotenv
import db

# Load .env from routes directory and backend directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(BASE_DIR)
load_dotenv(os.path.join(BASE_DIR, ".env"))
load_dotenv(os.path.join(BACKEND_DIR, ".env"))

try:
    import pymupdf  # fitz
except ImportError:
    pymupdf = None

try:
    from pypdf import PdfReader
except ImportError:
    PdfReader = None

try:
    import docx
except ImportError:
    docx = None

logger = logging.getLogger("medibridge.briefer")

# ============================================================
# EMPTY RESULT HELPER
# ============================================================

def empty_result():
    return {
        "summary": "",
        "duration": "",
        "purpose": "",
        "instruction": "",
        "precaution": "",
        "medicines": "",
        "languages": {
            "english": {
                "summary": "",
                "duration": "",
                "purpose": "",
                "instruction": "",
                "precaution": "",
                "medicines": ""
            },
            "hindi": {
                "summary": "",
                "duration": "",
                "purpose": "",
                "instruction": "",
                "precaution": "",
                "medicines": ""
            }
        }
    }


def parse_json_from_llm(raw_text):
    """Safely extracts and parses JSON object from LLM response."""
    if not raw_text:
        raise ValueError("Empty LLM output")
    
    cleaned = raw_text.strip()
    
    # Strip markdown code fences if present
    if cleaned.startswith("```"):
        lines = cleaned.split("\n")
        lines = [l for l in lines if not l.strip().startswith("```")]
        cleaned = "\n".join(lines).strip()
    
    # Find JSON bounds
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start != -1 and end != -1 and end > start:
        json_str = cleaned[start:end+1]
        return json.loads(json_str)
    
    return json.loads(cleaned)


# ============================================================
# HEALTH REPORT SUMMARY (GROQ POWERED)
# ============================================================

def summarize_health_report(
    report_text="",
    file_paths=None,
    patient_id=None
):
    report_text = report_text or ""
    file_paths = file_paths or []

    # Gather additional files and prescriptions from database if patient_id is provided
    patient_context_parts = []
    
    if patient_id:
        # Check prescriptions in SQLite
        try:
            p_rx = db.query_all("SELECT * FROM prescriptions WHERE patient_id = ? ORDER BY date DESC", (patient_id,))
            if p_rx:
                patient_context_parts.append("--- PATIENT PRESCRIPTIONS ON RECORD ---")
                for idx, rx in enumerate(p_rx, 1):
                    meds_list = db.parse_json(rx.get("medicines"), [])
                    meds_formatted = []
                    for m in meds_list:
                        if isinstance(m, dict):
                            meds_formatted.append(f"{m.get('name')} (Dosage: {m.get('dosage')}, Freq: {m.get('frequency')}, Dur: {m.get('duration')})")
                        else:
                            meds_formatted.append(str(m))
                    patient_context_parts.append(
                        f"Prescription {idx} (Date: {rx.get('date', 'N/A')}, Dr. {rx.get('doctor_name', 'Doctor')}):\n"
                        f"Diagnosis: {rx.get('diagnosis', 'General')}\n"
                        f"Medicines: {', '.join(meds_formatted)}\n"
                        f"Advice: {rx.get('advice', 'N/A')}\n"
                        f"Follow-up: {rx.get('follow_up_date', 'N/A')}\n"
                    )
        except Exception as e:
            logger.warning(f"Error reading prescriptions for patient {patient_id}: {e}")

        # Check patient medical documents in SQLite
        try:
            docs = db.query_all("SELECT path FROM medical_documents WHERE patient_id = ?", (patient_id,))
            for doc in docs:
                doc_rel = doc.get("path")
                if doc_rel:
                    doc_abs = os.path.join(BACKEND_DIR, doc_rel)
                    if os.path.isfile(doc_abs) and doc_abs not in file_paths:
                        file_paths.append(doc_abs)
        except Exception as e:
            logger.warning(f"Error checking patient medical documents: {e}")

    # Extract text from files
    docx_texts = []
    pdf_texts = []

    for file_path in file_paths:
        if not os.path.isfile(file_path):
            continue

        lower_path = file_path.lower()

        # Word Document
        if lower_path.endswith(".docx") and docx is not None:
            try:
                doc = docx.Document(file_path)
                full_text = "\n".join([p.text for p in doc.paragraphs if p.text.strip()])
                if full_text:
                    docx_texts.append(f"--- WORD DOCUMENT ({os.path.basename(file_path)}) ---\n{full_text}")
            except Exception as e:
                logger.warning(f"Error reading docx {file_path}: {e}")
            continue

        # PDF Document
        if lower_path.endswith(".pdf"):
            try:
                full_text = ""
                if pymupdf is not None:
                    doc = pymupdf.open(file_path)
                    for page in doc:
                        t = page.get_text() or ""
                        if t.strip():
                            full_text += "\n" + t
                elif PdfReader is not None:
                    reader = PdfReader(file_path)
                    for page in reader.pages:
                        t = page.extract_text() or ""
                        if t.strip():
                            full_text += "\n" + t

                if full_text.strip():
                    pdf_texts.append(f"--- PDF DOCUMENT ({os.path.basename(file_path)}) ---\n{full_text.strip()}")
            except Exception as e:
                logger.warning(f"Error reading pdf {file_path}: {e}")
            continue

        # Image Files (NVIDIA OCR or base text)
        if lower_path.endswith((".png", ".jpg", ".jpeg")):
            try:
                api_key = os.getenv("NVIDIA_API_KEY")
                if api_key:
                    with open(file_path, "rb") as image_file:
                        encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
                        ext = "jpeg" if lower_path.endswith(".jpg") else lower_path.split(".")[-1]
                        ocr_payload = {
                            "input": [{"type": "image_url", "url": f"data:image/{ext};base64,{encoded_string}"}]
                        }
                        ocr_resp = requests.post(
                            os.getenv("NVIDIA_OCR_URL", "https://ai.api.nvidia.com/v1/cv/nvidia/nemotron-ocr-v2"),
                            headers={"Authorization": f"Bearer {api_key}", "Accept": "application/json"},
                            json=ocr_payload,
                            timeout=25
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
                                pdf_texts.append(f"--- IMAGE OCR ({os.path.basename(file_path)}) ---\n{extracted_text.strip()}")
            except Exception as e:
                logger.warning(f"Error performing OCR on image {file_path}: {e}")

    # Combine all clinical text
    combined_parts = []
    if report_text:
        combined_parts.append(report_text)
    if patient_context_parts:
        combined_parts.extend(patient_context_parts)
    if docx_texts:
        combined_parts.extend(docx_texts)
    if pdf_texts:
        combined_parts.extend(pdf_texts)

    combined_text = "\n\n".join(combined_parts).strip()

    # If no text at all, use default patient description
    if not combined_text:
        combined_text = f"Patient ID {patient_id or 'General'}: Routine medical review and symptom consultation records."

    # Call Groq AI LLM
    try:
        groq_key = os.getenv("GROQ_API_KEY") or "REMOVED_GROQ_KEY"
        if not groq_key:
            raise RuntimeError("GROQ_API_KEY not configured")

        prompt = f"""You are an expert clinical AI assistant for MediBridge Health Portal.
Analyze the following patient clinical documents, diagnostic reports, and prescriptions:

{combined_text}

TASK:
Synthesize a structured medical care briefing in BOTH clear English and natural Hindi (Devanagari script).

OUTPUT STRICT JSON FORMAT ONLY (no surrounding text or explanation):
{{
    "summary": {{
        "english": "<Concise 2-3 sentence overview of patient condition, diagnosis, and care plan>",
        "hindi": "<रोगी की स्थिति, निदान और उपचार योजना का सरल 2-3 वाक्यों में विवरण>"
    }},
    "duration": {{
        "english": "<Prescribed duration e.g. 5 days, 2 weeks, or As directed>",
        "hindi": "<उपचार की अवधि e.g. 5 दिन, 2 सप्ताह, या चिकित्सक के निर्देशानुसार>"
    }},
    "purpose": {{
        "english": "<Medical purpose and recommended specialty>",
        "hindi": "<चिकित्सीय उद्देश्य और अनुशंसित विशेषज्ञता>"
    }},
    "instruction": {{
        "english": "<Specific dosage and timing instructions for prescribed medicines>",
        "hindi": "<दवाइयों की खुराक और लेने का सही समय>"
    }},
    "precaution": {{
        "english": "<Key clinical precautions, dietary guidance, and warnings>",
        "hindi": "<महत्वपूर्ण सावधानियां, खानपान की सलाह और चेतावनियां>"
    }},
    "medicines": {{
        "english": "<List of medicines identified with dosage>",
        "hindi": "<पहचानी गई दवाइयाँ और उनकी मात्रा>"
    }}
}}"""

        invoke_url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {groq_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "model": "qwen/qwen3.8-27b",
            "max_tokens": 2048,
            "temperature": 0.3,
            "stream": False
        }

        response = requests.post(invoke_url, headers=headers, json=payload, timeout=45)
        response.raise_for_status()
        data = response.json()
        raw_text = data["choices"][0]["message"]["content"].strip()
        
        parsed = parse_json_from_llm(raw_text)

        final_result = empty_result()
        for field in ["summary", "duration", "purpose", "instruction", "precaution", "medicines"]:
            val = parsed.get(field, {})
            if isinstance(val, dict):
                eng = str(val.get("english", "") or "")
                hin = str(val.get("hindi", "") or "")
                final_result[field] = eng
                final_result["languages"]["english"][field] = eng
                final_result["languages"]["hindi"][field] = hin
            elif isinstance(val, str):
                final_result[field] = val
                final_result["languages"]["english"][field] = val
                final_result["languages"]["hindi"][field] = val

        if final_result["summary"]:
            return final_result

    except Exception as e:
        logger.error(f"Groq AI brief generation error: {e}")
        print(f"Groq API Error: {e}")

    # Robust local fallback
    return _generate_local_brief(combined_text, file_paths, patient_id)


def _generate_local_brief(report_text, file_paths, patient_id=None):
    """Builds a comprehensive structured clinical summary when external API is unreachable."""
    diagnoses = []
    detected_medicines = []
    instructions = []
    precautions = ["Take prescribed doses on time with water.", "Maintain adequate hydration and rest.", "Contact your doctor if symptoms persist."]

    if patient_id:
        try:
            p_rx = db.query_all("SELECT * FROM prescriptions WHERE patient_id = ? ORDER BY date DESC", (patient_id,))
            for r in p_rx:
                diag = r.get("diagnosis")
                if diag and diag not in diagnoses:
                    diagnoses.append(diag)
                meds_list = db.parse_json(r.get("medicines"), [])
                for m in meds_list:
                    if isinstance(m, dict):
                        name = m.get("name", "Medication")
                        dosage = m.get("dosage", "")
                        freq = m.get("frequency", "")
                        dur = m.get("duration", "")
                        detected_medicines.append(name)
                        instructions.append(f"{name} ({dosage}, {freq}, {dur})")
                    else:
                        detected_medicines.append(str(m))
                        instructions.append(str(m))
                if r.get("advice"):
                    precautions.append(r["advice"])
        except Exception:
            pass

    diag_str = ", ".join(diagnoses) if diagnoses else "Clinical condition evaluation & health monitoring"
    meds_str = ", ".join(list(dict.fromkeys(detected_medicines))) if detected_medicines else "Medications as prescribed in records"
    inst_str = "; ".join(instructions) if instructions else "Follow physician prescribed dosage instructions"
    prec_str = "; ".join(precautions)

    summary_eng = f"Your health records have been reviewed. Record indicates diagnosis of {diag_str}. Follow prescribed treatment guidelines."
    summary_hin = f"आपके स्वास्थ्य रिकॉर्ड की समीक्षा की गई है। दर्ज निदान: {diag_str}। निर्धारित उपचार दिशानिर्देशों का पालन करें।"

    result = empty_result()
    result["summary"] = summary_eng
    result["duration"] = "As advised by consulting physician (typically 5-7 days)"
    result["purpose"] = f"Treatment and medical care for {diag_str}"
    result["instruction"] = inst_str
    result["precaution"] = prec_str
    result["medicines"] = meds_str

    result["languages"]["english"] = {
        "summary": summary_eng,
        "duration": "As advised by consulting physician (typically 5-7 days)",
        "purpose": f"Treatment and medical care for {diag_str}",
        "instruction": inst_str,
        "precaution": prec_str,
        "medicines": meds_str
    }

    result["languages"]["hindi"] = {
        "summary": summary_hin,
        "duration": "चिकित्सक के निर्देशानुसार (आमतौर पर 5-7 दिन)",
        "purpose": f"{diag_str} के लिए उपचार एवं चिकित्सकीय परामर्श",
        "instruction": inst_str if inst_str else "चिकित्सक द्वारा बताए अनुसार दवा लें।",
        "precaution": "समय पर दवाइयाँ लें एवं लक्षण बढ़ने पर तुरंत डॉक्टर से संपर्क करें।",
        "medicines": meds_str
    }

    return result