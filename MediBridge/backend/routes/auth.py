import jwt
from datetime import datetime, timedelta
from config_ import SECRET_KEY
from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from storage import read_data, write_data
import uuid

auth_bp = Blueprint("auth", __name__)


# =====================================================
# REGISTER
# =====================================================

@auth_bp.route("/register", methods=["POST"])
def register():

    data = request.get_json()

    name = data.get("name")
    email = data.get("email")
    password = data.get("password")
    role = data.get("role")

    # Check required fields
    if not name or not email or not password or not role:
        return jsonify({
            "error": "All fields are required"
        }), 400

    # Check valid role
    if role not in ["patient", "doctor"]:
        return jsonify({
            "error": "Invalid role"
        }), 400

    # Read existing users
    users = read_data("users.json")

    # Check if email already exists
    for user in users:

        if user["email"] == email:
            return jsonify({
                "error": "Email already registered"
            }), 409

    # Create new user
    new_user = {
        "id": str(uuid.uuid4()),
        "name": name,
        "email": email,
        "password": generate_password_hash(password),
        "role": role
    }

    # Save user
    users.append(new_user)
    write_data("users.json", users)

    # =================================================
    # CREATE PATIENT PROFILE
    # =================================================

    if role == "patient":

        patients = read_data("patients.json")

        new_patient = {
            "id": new_user["id"],
            "name": name,
            "email": email,
            "age": None,
            "gender": None,
            "phone": None,
            "address": None,
            "medical_history": [],
            "prescriptions": []
        }

        patients.append(new_patient)

        write_data("patients.json", patients)
    if role  ==  "doctor":
        doctors= read_data("doctors.json")
        new_doctor={
            "id": new_user["id"],
            "name" :    name,
            "email" : email,
            "specialization" :None,
            "description": None,
            "location" : None,
            "experience": None,
            "rating": 0,
            "available_slots": []
        }
        doctors.append(new_doctor)
        write_data("doctors.json",doctors)

    # =================================================
    # REGISTRATION RESPONSE
    # =================================================

    return jsonify({
        "message": "Registration successful",
        "user": {
            "id": new_user["id"],
            "name": new_user["name"],
            "email": new_user["email"],
            "role": new_user["role"]
        }
    }), 201


# =====================================================
# LOGIN
# =====================================================

@auth_bp.route("/login", methods=["POST"])
def login():

    data = request.get_json()

    email = data.get("email")
    password = data.get("password")

    # Check required fields
    if not email or not password:
        return jsonify({
            "error": "Email and password are required"
        }), 400

    # Read users
    users = read_data("users.json")

    # Find user
    for user in users:

        if user["email"] == email:

            # Verify password
            if check_password_hash(user["password"], password):

                # Create JWT token
                token = jwt.encode(
                    {
                        "user_id": user["id"],
                        "role": user["role"],
                        "exp": datetime.utcnow() + timedelta(hours=24)
                    },
                    SECRET_KEY,
                    algorithm="HS256"
                )

                # Login successful
                return jsonify({
                    "message": "Login successful",
                    "token": token,
                    "user": {
                        "id": user["id"],
                        "name": user["name"],
                        "email": user["email"],
                        "role": user["role"]
                    }
                }), 200

            # Password doesn't match
            return jsonify({
                "error": "Invalid password"
            }), 401

    # Email doesn't exist
    return jsonify({
        "error": "User not found"
    }), 404