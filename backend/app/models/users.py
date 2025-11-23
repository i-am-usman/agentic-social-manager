from datetime import datetime

def user_document(username: str, email: str, hashed_password: str, role: str = "user"):
    return {
        "username": username,
        "email": email,
        "password": hashed_password,
        "role": role,
        "created_at": datetime.utcnow()
    }