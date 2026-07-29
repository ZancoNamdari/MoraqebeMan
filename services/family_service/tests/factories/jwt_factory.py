import time

import jwt


def make_token(user_id: int, role: str = "family", phone_number: str = "09120000000") -> str:
    """
    Builds a JWT the exact same shape identity_service issues (see
    identity_service/apps/authentication/services.py::SimpleJWTTokenIssuer),
    signed with the same test key family_service's settings default to.
    Lets these tests exercise the real StatelessJWTAuthentication path
    without needing identity_service running.
    """
    payload = {
        "token_type": "access",
        "user_id": user_id,
        "role": role,
        "phone_number": phone_number,
        "exp": int(time.time()) + 3600,
        "iat": int(time.time()),
    }
    return jwt.encode(payload, "testkey", algorithm="HS256")
