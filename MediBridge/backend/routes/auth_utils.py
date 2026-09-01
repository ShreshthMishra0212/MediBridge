import jwt
from functools import wraps
from flask import request, jsonify
from config_ import SECRET_KEY


def token_required(f):

    @wraps(f)
    def decorated(*args, **kwargs):

        # Get Authorization header
        auth_header = request.headers.get("Authorization")

        if not auth_header:
            return jsonify({
                "error": "Authorization token is required"
            }), 401

        # Expected format:
        # Authorization: Bearer <token>

        try:

            parts = auth_header.split(" ")

            if len(parts) != 2 or parts[0] != "Bearer":
                return jsonify({
                    "error": "Invalid authorization format"
                }), 401

            token = parts[1]

            # Decode JWT
            decoded = jwt.decode(
                token,
                SECRET_KEY,
                algorithms=["HS256"]
            )

            # Pass decoded user information to route
            return f(decoded, *args, **kwargs)

        except jwt.ExpiredSignatureError:

            return jsonify({
                "error": "Token has expired"
            }), 401

        except jwt.InvalidTokenError:

            return jsonify({
                "error": "Invalid token"
            }), 401

    return decorated
def doctor_required(f):

    @wraps(f)
    def decorated(decoded, *args, **kwargs):

        if decoded.get("role") != "doctor":
            return jsonify({
                "error": "Doctor access required"
            }), 403

        return f(decoded, *args, **kwargs)

    return decorated