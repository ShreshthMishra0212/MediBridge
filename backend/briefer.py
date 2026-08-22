import os
import time
import json

from dotenv import load_dotenv

# ============================================================
# LOAD .ENV FROM THIS FILE'S DIRECTORY
# ============================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

load_dotenv(
    os.path.join(BASE_DIR, ".env")
)


# ============================================================
# GEMINI IMPORT
# ============================================================

try:
    from google import genai
    from google.genai import types
except ImportError:
    genai = None
    types = None


# ============================================================
# EMPTY RESULT
#
# IMPORTANT:
# The main six fields remain STRINGS so the existing frontend
# does not break.
#
# English is returned in:
#   summary
#   duration
#   purpose
#   instruction
#   precaution
#   medicines
#
# Both languages are also available in:
#   languages
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


# ============================================================
# GEMINI CLIENT
# ============================================================

def _get_client():

    if genai is None:

        raise RuntimeError(
            "google-genai is not installed in the active virtual environment"
        )

    api_key = os.getenv(
        "GOOGLE_API_KEY",
        ""
    ).strip()

    print("----------------------------------------")
    print("BRIEFER GEMINI CONFIG")
    print(
        "BRIEFER KEY LOADED:",
        bool(api_key)
    )

    print(
        "BRIEFER KEY PREFIX:",
        api_key[:10] if api_key else "MISSING"
    )

    print("----------------------------------------")

    if not api_key:

        raise RuntimeError(
            "GOOGLE_API_KEY is not configured in backend/.env"
        )

    return genai.Client(
        api_key=api_key
    )


# ============================================================
# HEALTH REPORT SUMMARY
# ============================================================

def summarize_health_report(
    report_text="",
    file_paths=None
):

    report_text = report_text or ""
    file_paths = file_paths or []

    # --------------------------------------------------------
    # NOTHING TO PROCESS
    # --------------------------------------------------------

    if (
        not report_text.strip()
        and not file_paths
    ):

        return empty_result()


    # --------------------------------------------------------
    # CREATE GEMINI CLIENT
    # --------------------------------------------------------

    try:

        client = _get_client()

    except Exception as e:

        result = empty_result()

        result["summary"] = (
            f"AI service unavailable: {str(e)}"
        )

        result["languages"]["english"]["summary"] = (
            f"AI service unavailable: {str(e)}"
        )

        result["languages"]["hindi"]["summary"] = (
            f"AI सेवा उपलब्ध नहीं है: {str(e)}"
        )

        return result


    # --------------------------------------------------------
    # CONTENTS
    # --------------------------------------------------------

    contents = []


    # --------------------------------------------------------
    # UPLOAD ALL MEDICAL FILES
    # --------------------------------------------------------

    for file_path in file_paths:

        try:

            if not os.path.isfile(file_path):

                print(
                    "Skipping missing file:",
                    file_path
                )

                continue


            print(
                "Uploading medical file:",
                file_path
            )

            uploaded_file = client.files.upload(
                file=file_path
            )

            contents.append(
                uploaded_file
            )

            print(
                "Medical file uploaded successfully:",
                os.path.basename(file_path)
            )

        except Exception as e:

            print(
                "GEMINI FILE UPLOAD ERROR:",
                repr(e)
            )

            result = empty_result()

            result["summary"] = (
                f"File processing error: {str(e)}"
            )

            result["languages"]["english"]["summary"] = (
                f"File processing error: {str(e)}"
            )

            result["languages"]["hindi"]["summary"] = (
                f"फाइल प्रोसेस करने में त्रुटि: {str(e)}"
            )

            return result


    # --------------------------------------------------------
    # NO VALID CONTENT
    # --------------------------------------------------------

    if (
        not contents
        and not report_text.strip()
    ):

        return empty_result()


    # --------------------------------------------------------
    # PROMPT
    # --------------------------------------------------------

    prompt = f"""
You are an expert medical report simplifier.

Analyze ALL provided medical documents/images together with
the patient-provided text.

TEXT INPUT:

{report_text}


TASK:

Summarize the provided medical information in simple,
easy-to-understand English and Hindi.


IMPORTANT RULES:

1. Do not invent information.

2. Do not invent symptoms, diagnoses, medicines, durations,
   dosages, precautions, instructions, or medical history.

3. If information is not present, return an empty string.

4. Do not provide a definitive medical diagnosis.

5. If the patient only describes a health problem and no
   medical report is provided, recommend an appropriate
   medical specialist only when clearly indicated.

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

9. Keep English simple and easy to understand.

10. Hindi must be natural and easy to understand.

11. Do not use markdown.

12. Do not use special formatting inside values.

13. Return ONLY valid JSON.

14. The JSON must contain EXACTLY these six fields:

summary
duration
purpose
instruction
precaution
medicines

15. Each field must contain:

english
hindi

16. If multiple medicines exist, put them in the medicines
field as a comma-separated string.

17. If information is not available, use an empty string.

18. The Hindi version should translate the English information
naturally. Do not invent additional medical information.


OUTPUT FORMAT:

{{
    "summary": {{
        "english": "",
        "hindi": ""
    }},

    "duration": {{
        "english": "",
        "hindi": ""
    }},

    "purpose": {{
        "english": "",
        "hindi": ""
    }},

    "instruction": {{
        "english": "",
        "hindi": ""
    }},

    "precaution": {{
        "english": "",
        "hindi": ""
    }},

    "medicines": {{
        "english": "",
        "hindi": ""
    }}
}}

Return ONLY the JSON object.
"""


    contents.append(
        prompt
    )


    # --------------------------------------------------------
    # GEMINI REQUEST
    # --------------------------------------------------------

    max_retries = 3

    for attempt in range(max_retries):

        try:

            print(
                f"Sending report to Gemini "
                f"(attempt {attempt + 1}/{max_retries})"
            )


            # ------------------------------------------------
            # Force Gemini to return JSON
            # ------------------------------------------------

            if types is not None:

                response = client.models.generate_content(

                    model="gemini-3.6-flash",

                    contents=contents,

                    config=types.GenerateContentConfig(
                        response_mime_type="application/json"
                    )
                )

            else:

                response = client.models.generate_content(

                    model="gemini-3.7-flash",

                    contents=contents
                )


            text = (
                response.text or ""
            ).strip()


            print(
                "Gemini response received."
            )


            # ------------------------------------------------
            # REMOVE CODE FENCES IF PRESENT
            # ------------------------------------------------

            if text.startswith(
                "```json"
            ):

                text = text[
                    len("```json"):
                ]


            elif text.startswith(
                "```"
            ):

                text = text[
                    len("```"):
                ]


            if text.endswith(
                "```"
            ):

                text = text[
                    :-len("```")
                ]


            text = text.strip()


            # ------------------------------------------------
            # PARSE JSON
            # ------------------------------------------------

            result = json.loads(
                text
            )


            # ------------------------------------------------
            # BUILD SAFE FRONTEND RESULT
            # ------------------------------------------------

            final_result = empty_result()


            fields = [
                "summary",
                "duration",
                "purpose",
                "instruction",
                "precaution",
                "medicines"
            ]


            for field in fields:

                value = result.get(
                    field
                )


                # Gemini correctly returned:
                #
                # {
                #   "english": "...",
                #   "hindi": "..."
                # }

                if isinstance(
                    value,
                    dict
                ):

                    english = value.get(
                        "english",
                        ""
                    )

                    hindi = value.get(
                        "hindi",
                        ""
                    )


                    if english is None:
                        english = ""


                    if hindi is None:
                        hindi = ""


                    english = str(
                        english
                    )

                    hindi = str(
                        hindi
                    )


                    # Main fields remain strings.
                    # This preserves your old frontend contract.

                    final_result[field] = (
                        english
                    )


                    # Both languages available here.

                    final_result[
                        "languages"
                    ][
                        "english"
                    ][
                        field
                    ] = english


                    final_result[
                        "languages"
                    ][
                        "hindi"
                    ][
                        field
                    ] = hindi


                # ------------------------------------------------
                # Fallback if Gemini accidentally returns a string
                # ------------------------------------------------

                elif isinstance(
                    value,
                    str
                ):

                    final_result[field] = (
                        value
                    )

                    final_result[
                        "languages"
                    ][
                        "english"
                    ][
                        field
                    ] = value


            print(
                "Gemini summary successfully processed."
            )


            return final_result


        # --------------------------------------------------------
        # INVALID JSON
        # --------------------------------------------------------

        except json.JSONDecodeError as e:

            print(
                "GEMINI JSON PARSE ERROR:",
                repr(e)
            )

            print(
                "RAW GEMINI RESPONSE:",
                text if "text" in locals() else "NO RESPONSE"
            )


            result = empty_result()


            result["summary"] = (
                "Unable to parse AI summary."
            )


            result[
                "languages"
            ][
                "english"
            ][
                "summary"
            ] = (
                "Unable to parse AI summary."
            )


            result[
                "languages"
            ][
                "hindi"
            ][
                "summary"
            ] = (
                "AI सारांश को पढ़ने में असमर्थ।"
            )


            return result


        # --------------------------------------------------------
        # OTHER GEMINI ERRORS
        # --------------------------------------------------------

        except Exception as e:

            error_message = str(e)


            print(
                "GEMINI ERROR:",
                repr(e)
            )


            # ------------------------------------------------
            # RETRY TEMPORARY ERRORS
            # ------------------------------------------------

            temporary_error = (
                "503" in error_message
                or "UNAVAILABLE" in error_message
                or "429" in error_message
                or "RESOURCE_EXHAUSTED" in error_message
                or "DEADLINE_EXCEEDED" in error_message
            )


            if temporary_error:

                if attempt < max_retries - 1:

                    wait_time = (
                        2 ** attempt
                    )


                    print(
                        f"Gemini temporarily unavailable. "
                        f"Retrying in {wait_time} seconds..."
                    )


                    time.sleep(
                        wait_time
                    )

                    continue


                result = empty_result()


                result["summary"] = (
                    "Gemini is temporarily unavailable. "
                    "Please try again later."
                )


                result[
                    "languages"
                ][
                    "english"
                ][
                    "summary"
                ] = (
                    "Gemini is temporarily unavailable. "
                    "Please try again later."
                )


                result[
                    "languages"
                ][
                    "hindi"
                ][
                    "summary"
                ] = (
                    "Gemini फिलहाल उपलब्ध नहीं है। "
                    "कृपया बाद में पुनः प्रयास करें।"
                )


                return result


            # ------------------------------------------------
            # ALL OTHER ERRORS
            # ------------------------------------------------

            result = empty_result()


            result["summary"] = (
                f"API Error: {error_message}"
            )


            result[
                "languages"
            ][
                "english"
            ][
                "summary"
            ] = (
                f"API Error: {error_message}"
            )


            result[
                "languages"
            ][
                "hindi"
            ][
                "summary"
            ] = (
                f"API त्रुटि: {error_message}"
            )


            return result