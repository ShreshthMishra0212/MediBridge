import jwt
from datetime import datetime, timedelta
from config_ import SECRET_KEY
from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
import uuid
import json
import db

auth_bp = Blueprint("auth", __name__)


# =====================================================
# REGISTER
# =====================================================

@auth_bp.route("/register", methods=["POST"])
def register():

    data = request.get_json() or {}

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

    # Check if email already exists
    existing_user = db.query_one("SELECT id FROM users WHERE LOWER(email) = LOWER(?)", (email,))
    if existing_user:
        return jsonify({
            "error": "Email already registered"
        }), 409

    new_user_id = str(uuid.uuid4())
    hashed_password = generate_password_hash(password)

    # Insert user and corresponding role profile inside one atomic transaction
    with db.get_db_context() as conn:
        conn.execute(
            """
            INSERT INTO users (id, name, email, password, role)
            VALUES (?, ?, ?, ?, ?)
            """,
            (new_user_id, name, email, hashed_password, role)
        )

        if role == "patient":
            age = data.get("age")
            gender = data.get("gender")
            phone = data.get("phone")
            address = data.get("address")
            conn.execute(
                """
                INSERT INTO patients (id, name, email, age, gender, phone, address, medical_history)
                VALUES (?, ?, ?, ?, ?, ?, ?, '[]')
                """,
                (new_user_id, name, email, age, gender, phone, address)
            )
        elif role == "doctor":
            specialization = data.get("specialization")
            description = data.get("description")
            location = data.get("location")
            experience = data.get("experience")
            rating = data.get("rating", 0)
            slots = json.dumps(data.get("available_slots", []))
            conn.execute(
                """
                INSERT INTO doctors (id, name, email, specialization, description, location, experience, rating, available_slots)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (new_user_id, name, email, specialization, description, location, experience, rating, slots)
            )

    # Registration response
    return jsonify({
        "message": "Registration successful",
        "user": {
            "id": new_user_id,
            "name": name,
            "email": email,
            "role": role
        }
    }), 201


# =====================================================
# LOGIN
# =====================================================

@auth_bp.route("/login", methods=["POST"])
def login():

    data = request.get_json() or {}

    email = data.get("email")
    password = data.get("password")

    # Check required fields
    if not email or not password:
        return jsonify({
            "error": "Email and password are required"
        }), 400

    # Find user in SQLite
    user = db.query_one(
        "SELECT id, name, email, password, role FROM users WHERE LOWER(email) = LOWER(?)",
        (email,)
    )

    if not user:
        return jsonify({
            "error": "User not found"
        }), 404

    # Verify password (hash or legacy fallback)
    password_valid = False
    try:
        password_valid = check_password_hash(user["password"], password)
    except Exception:
        password_valid = False

    if not password_valid and user["password"] == password:
        password_valid = True

    if password_valid:
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