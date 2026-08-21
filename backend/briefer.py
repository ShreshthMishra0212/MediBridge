import time
import json
from google import genai


# Initialize Gemini client
client = genai.Client(
    api_key="google api key"
)


def summarize_health_report(report_text="", file_paths=None):

    report_text = report_text or ""
    file_paths = file_paths or []

    if not report_text.strip() and not file_paths:
        return {
            "summary": "",
            "duration": "",
            "purpose": "",
            "instruction": "",
            "precaution": "",
            "medicines": ""
        }

    contents = []

    # Upload all files
    for file_path in file_paths:

        try:
            uploaded_file = client.files.upload(
                file=file_path
            )

            contents.append(uploaded_file)

        except Exception as e:
            return {
                "summary": f"File processing error: {str(e)}",
                "duration": "",
                "purpose": "",
                "instruction": "",
                "precaution": "",
                "medicines": ""
            }

    prompt = f"""
You are an expert medical report simplifier.

Analyze ALL provided medical documents/images together with the
patient-provided text.

TEXT INPUT:
{report_text}

Your task is to summarize the provided medical information
in simple plain English.

IMPORTANT RULES:

1. Do not invent information.
2. Do not invent symptoms, diagnoses, medicines, durations,
   dosages, precautions, or medical history.
3. If information is not present, use an empty string.
4. Do not provide a definitive diagnosis.
5. Only recommend a medical specialist when the patient's
   stated problem clearly indicates the relevant specialty.
6. Medicines must only contain medicines explicitly present
   in the provided prescription/report.
7. Preserve medicine names and dosage information when clearly
   available.
8. Do not add medical information that is not present.
9. Do not use markdown.
10. Do not use special formatting.
11. Return ONLY valid JSON.
12. The JSON must contain EXACTLY these six keys:
    summary
    duration
    purpose
    instruction
    precaution
    medicines

OUTPUT FORMAT:

{{
    "summary": "Brief summary of the patient's report or problem.",
    "duration": "Duration mentioned in the report, or empty string.",
    "purpose": "Purpose of medicines/tests/treatment if explicitly available.",
    "instruction": "Instructions explicitly provided by the doctor/report.",
    "precaution": "Precautions explicitly provided by the doctor/report.",
    "medicines": "Medicines prescribed by the doctor, including dosage if available."
}}

If multiple medicines exist, put them in the medicines field
as a simple comma-separated string.

Return ONLY the JSON object.
"""

    contents.append(prompt)

    max_retries = 3

    for attempt in range(max_retries):

        try:

            response = client.models.generate_content(
                model="gemini-3.6-flash",
                contents=contents
            )

            text = response.text.strip()

            # Remove accidental markdown code fences
            if text.startswith("```json"):
                text = text[7:]

            if text.startswith("```"):
                text = text[3:]

            if text.endswith("```"):
                text = text[:-3]

            text = text.strip()

            result = json.loads(text)

            # Make sure exactly the fields we want are returned
            return {
                "summary": result.get("summary", ""),
                "duration": result.get("duration", ""),
                "purpose": result.get("purpose", ""),
                "instruction": result.get("instruction", ""),
                "precaution": result.get("precaution", ""),
                "medicines": result.get("medicines", "")
            }

        except json.JSONDecodeError:

            return {
                "summary": "Unable to parse AI summary.",
                "duration": "",
                "purpose": "",
                "instruction": "",
                "precaution": "",
                "medicines": ""
            }

        except Exception as e:

            error_message = str(e)

            if "503" in error_message or "UNAVAILABLE" in error_message:

                if attempt < max_retries - 1:

                    wait_time = 2 ** attempt

                    print(
                        f"Gemini temporarily unavailable. "
                        f"Retrying in {wait_time} seconds..."
                    )

                    time.sleep(wait_time)

                else:

                    return {
                        "summary": "Gemini is temporarily unavailable.",
                        "duration": "",
                        "purpose": "",
                        "instruction": "",
                        "precaution": "",
                        "medicines": ""
                    }

            else:

                return {
                    "summary": f"API Error: {error_message}",
                    "duration": "",
                    "purpose": "",
                    "instruction": "",
                    "precaution": "",
                    "medicines": ""
                }
