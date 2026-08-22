import os
from briefer import summarize_health_report
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import requests
import base64
import datetime
import io
from meeting_generator import create_google_meet
from med_salts import extract_meds_from_text

app = Flask(__name__)
CORS(app)

NVIDIA_API_KEY = "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"
NVIDIA_OCR_URL = "https://ai.api.nvidia.com/v1/cv/nvidia/nemotron-ocr-v2"
print("Key loaded:", NVIDIA_API_KEY[:10] if NVIDIA_API_KEY else "MISSING")
def compress_image(image_bytes, max_size_kb=100):
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")

    max_dim = 1600
    if max(img.size) > max_dim:
        img.thumbnail((max_dim, max_dim))

    quality = 85
    buf = io.BytesIO()
    while quality > 20:
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=quality)
        if buf.tell() <= max_size_kb * 1024:
            break
        quality -= 10

    return buf.getvalue(), "image/jpeg"

@app.route("/brief_assist", methods=["GET"])
def brief_assist():

    p_id = request.args.get("fname")

    if not p_id:
        return jsonify({
            "error": "fname is required"
        }), 400

    if not os.path.exists("history"):
        return jsonify({
            "error": "No patient history found"
        }), 404

    files = []

    for f in os.listdir("history"):

        if f.startswith(p_id + "_"):

            files.append(
                os.path.join("history", f)
            )

    if not files:

        return jsonify({
            "error": f"No patient history found associated with {p_id}"
        }), 404

    summary = summarize_health_report(
        report_text="",
        file_paths=files
    )

    return jsonify({
        "status": "success",
        "summary": summary
    }), 200

@app.route("/upload",methods=["POST"])
def prescription():
    if not os.path.exists("history"):
        os.makedirs("history")

    name = request.args.get("fname")
    files = request.files.getlist("files")

    for i,file in enumerate(files):
        file.save(f"history/{name}_{file.filename}")

    return jsonify({
        "status":"recieved"
    }), 200



@app.route("/api/extract", methods=["POST"])
def extract_text():
    if "image" not in request.files:
        return jsonify({"error": "No image file provided. Use form field 'image'."}), 400

    file = request.files["image"]
    image_bytes = file.read()

    image_bytes, mime = compress_image(image_bytes)
    image_b64 = base64.b64encode(image_bytes).decode()

    if len(image_b64) >= 180_000:
        return jsonify({"error": "Image still too large after compression."}), 413

    headers = {
        "Authorization": f"Bearer {NVIDIA_API_KEY}",
        "Accept": "application/json"
    }
    payload = {
        "input": [
            {
                "type": "image_url",
                "url": f"data:{mime};base64,{image_b64}"
            }
        ]
    }

    try:
        resp = requests.post(NVIDIA_OCR_URL, headers=headers, json=payload, timeout=30)
        resp.raise_for_status()
        result = resp.json()
    except Exception as e:
        print("NVIDIA OCR ERROR:", repr(e))
        if hasattr(e, "response") and e.response is not None:
            print("Response body:", e.response.text)
        return jsonify({"error": f"OCR failed: {str(e)}"}), 502

    text = extract_text_from_nvidia_response(result)

    matches = extract_meds_from_text(text)

    if not matches:
        return jsonify({"error": "No known medicine detected in image.", "raw_ocr": text}), 404

    salts = [{"medicine": name, "salt": salt} for name, salt in matches]

    return jsonify({"salts": salts[0]})


def extract_text_from_nvidia_response(result):
    try:
        if "output" in result:
            output = result["output"]
            if isinstance(output, list) and len(output) > 0:
                return output[0].get("text", "") or str(output[0])
            return str(output)
        if "text" in result:
            return result["text"]
        return str(result)
    except Exception:
        return str(result)

@app.route("/api/create-meet", methods=["POST"])
def create_meet():
    data = request.get_json(silent=True) or {}
    start_time_str = data.get("start_time")

    if not start_time_str:
        return jsonify({"error": "start_time is required (ISO 8601 format, e.g. 2026-08-22T15:00:00)"}), 400

    try:
        start_time = datetime.datetime.fromisoformat(start_time_str)
    except ValueError:
        return jsonify({"error": "Invalid start_time format. Use ISO 8601, e.g. 2026-08-22T15:00:00"}), 400

    title = data.get("title", "Quick Meeting")
    duration_minutes = data.get("duration_minutes", 60)

    try:
        result = create_google_meet(start_time, title=title, duration_minutes=duration_minutes)
    except Exception as e:
        return jsonify({"error": f"Failed to create meeting: {str(e)}"}), 502

    return jsonify({
        "join_url": result["join_url"],
        "event_id": result["event_id"],
        "start_time": result["start_time"].isoformat(),
        "expires_at": result["expires_at"].isoformat()
    })

@app.route("/api/check-status", methods=["GET"])
def check_status():
    expires_at_str = request.args.get("expires_at")

    if not expires_at_str:
        return jsonify({"error": "expires_at query param is required"}), 400

    try:
        expires_at = datetime.datetime.fromisoformat(expires_at_str)
    except ValueError:
        return jsonify({"error": "Invalid expires_at format"}), 400

    is_expired = datetime.datetime.utcnow() >= expires_at

    return jsonify({"expired": is_expired})

@app.route("/", methods=["GET"])
def health():
    return jsonify({"status": "ok"})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
