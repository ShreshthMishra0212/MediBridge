import os
import time
import json
from google import genai


# Initialize Gemini client
client = genai.Client(
    api_key="api_key"
)


def empty_result():
    return {
        "summary": {
            "english": "",
            "hindi": ""
        },
        "duration": {
            "english": "",
            "hindi": ""
        },
        "purpose": {
            "english": "",
            "hindi": ""
        },
        "instruction": {
            "english": "",
            "hindi": ""
        },
        "precaution": {
            "english": "",
            "hindi": ""
        },
        "medicines": {
            "english": "",
            "hindi": ""
        }
    }


def summarize_health_report(report_text="", file_paths=None):

    report_text = report_text or ""
    file_paths = file_paths or []

    if not report_text.strip() and not file_paths:
        return empty_result()

    contents = []

    # --------------------------------------------------
    # Upload all medical documents
    # --------------------------------------------------

    for file_path in file_paths:

        try:

            uploaded_file = client.files.upload(
                file=file_path
            )

            contents.append(uploaded_file)

        except Exception as e:

            result = empty_result()

            result["summary"]["english"] = (
                f"File processing error: {str(e)}"
            )

            result["summary"]["hindi"] = (
                f"फाइल प्रोसेस करने में त्रुटि: {str(e)}"
            )

            return result

    # --------------------------------------------------
    # Prompt
    # --------------------------------------------------

    prompt = f"""
You are an expert medical report simplifier.

Analyze ALL provided medical documents/images together with
the patient-provided text.

TEXT INPUT:
{report_text}

Your task is to summarize the provided medical information
in simple plain English and Hindi.

IMPORTANT RULES:

1. Do not invent information.

2. Do not invent symptoms, diagnoses, medicines, durations,
   dosages, precautions, or medical history.

3. If information is not present, use an empty string.

4. Do not provide a definitive medical diagnosis.

5. If the patient only describes a health problem and no
   medical report is provided, recommend the appropriate
   medical specialist when clearly indicated.

   Examples:
   eye problem -> ophthalmologist
   stomach/digestive problem -> gastroenterologist
   skin problem -> dermatologist
   heart-related problem -> cardiologist

6. Medicines must ONLY contain medicines explicitly present
   in the provided prescription or medical document.

7. Preserve medicine names and dosage information when
   clearly available.

8. Do not add medical information that is not present.

9. Keep the English text simple and easy to understand.

10. Hindi should be a natural and easy-to-understand Hindi
    translation of the English information.

11. Do not use markdown.

12. Do not use special formatting inside the values.

13. Return ONLY valid JSON.

14. The JSON must contain EXACTLY these six keys:

    summary
    duration
    purpose
    instruction
    precaution
    medicines

15. Every key must contain exactly two keys:

    english
    hindi

16. If multiple medicines exist, put them in the medicines
    field as a comma-separated string.

OUTPUT FORMAT:

{{
    "summary": {{
        "english": "...",
        "hindi": "..."
    }},
    "duration": {{
        "english": "...",
        "hindi": "..."
    }},
    "purpose": {{
        "english": "...",
        "hindi": "..."
    }},
    "instruction": {{
        "english": "...",
        "hindi": "..."
    }},
    "precaution": {{
        "english": "...",
        "hindi": "..."
    }},
    "medicines": {{
        "english": "...",
        "hindi": "..."
    }}
}}

Return ONLY the JSON object.
"""

    contents.append(prompt)

    # --------------------------------------------------
    # Gemini request
    # --------------------------------------------------

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

            elif text.startswith("```"):
                text = text[3:]

            if text.endswith("```"):
                text = text[:-3]

            text = text.strip()

            result = json.loads(text)

            # --------------------------------------------------
            # Force the exact structure we want
            # --------------------------------------------------

            final_result = empty_result()

            for field in [
                "summary",
                "duration",
                "purpose",
                "instruction",
                "precaution",
                "medicines"
            ]:

                if isinstance(result.get(field), dict):

                    final_result[field]["english"] = result[field].get(
                        "english", ""
                    )

                    final_result[field]["hindi"] = result[field].get(
                        "hindi", ""
                    )

            return final_result

        except json.JSONDecodeError:

            result = empty_result()

            result["summary"]["english"] = (
                "Unable to parse AI summary."
            )

            result["summary"]["hindi"] = (
                "AI सारांश को पढ़ने में असमर्थ।"
            )

            return result

        except Exception as e:

            error_message = str(e)

            if (
                "503" in error_message
                or "UNAVAILABLE" in error_message
            ):

                if attempt < max_retries - 1:

                    wait_time = 2 ** attempt

                    print(
                        f"Gemini temporarily unavailable. "
                        f"Retrying in {wait_time} seconds..."
                    )

                    time.sleep(wait_time)

                else:

                    result = empty_result()

                    result["summary"]["english"] = (
                        "Gemini is temporarily unavailable. "
                        "Please try again later."
                    )

                    result["summary"]["hindi"] = (
                        "Gemini फिलहाल उपलब्ध नहीं है। "
                        "कृपया बाद में पुनः प्रयास करें।"
                    )

                    return result

            else:

                result = empty_result()

                result["summary"]["english"] = (
                    f"API Error: {error_message}"
                )

                result["summary"]["hindi"] = (
                    f"API त्रुटि: {error_message}"
                )

                return result
