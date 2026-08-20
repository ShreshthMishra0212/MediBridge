# app.py
from flask import Flask, request, jsonify
from huggingface_hub import InferenceClient
from flask_cors import CORS
import base64
import os

from med_salts import extract_meds_from_text

app = Flask(__name__)
CORS(app)

HF_TOKEN = os.environ.get("HF_TOKEN")
client = InferenceClient(token="HF_tk", provider="novita")

@app.route("/api/extract", methods=["POST"])
def extract_text():
    if "image" not in request.files:
        return jsonify({"error": "No image file provided. Use form field 'image'."}), 400

    file = request.files["image"]
    image_bytes = file.read()

    try:
        image_b64 = base64.b64encode(image_bytes).decode("utf-8")
        mime = file.mimetype or "image/png"

        response = client.chat.completions.create(
            model="deepseek-ai/DeepSeek-OCR",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Extract all text from this image. Return only the english extracted text, nothing else."},
                        {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{image_b64}"}}
                    ]
                }
            ]
        )
        text = response.choices[0].message.content
    except Exception as e:
        return jsonify({"error": f"OCR failed: {str(e)}"}), 502

    matches = extract_meds_from_text(text)

    salts = [
        {"medicine": name, "salt": salt}
        for name, salt in matches
    ]

    return jsonify({
        "salts": salts[0],
    })

@app.route("/", methods=["GET"])
def health():
    return jsonify({"status": "ok"})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
