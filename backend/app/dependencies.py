# # from fastapi import Depends, HTTPException, status
# # from fastapi.security import OAuth2PasswordBearer
# # from jose import JWTError, jwt
# # from datetime import datetime
# # # --- THIS IS THE FIX ---
# # # Import JWT_SECRET and rename it to SECRET_KEY, and JWT_ALGORITHM to ALGORITHM
# # from app.auth import JWT_SECRET as SECRET_KEY, JWT_ALGORITHM as ALGORITHM
# # # -----------------------

# # oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

# # # Dependency to verify current user
# # async def get_current_user(token: str = Depends(oauth2_scheme)):
# #     try:
# #         payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
# #         email: str = payload.get("sub")
# #         if email is None:
# #             raise HTTPException(
# #                 status_code=status.HTTP_401_UNAUTHORIZED,
# #                 detail="User token invalid.",
# #             )
# #         # --- MODIFICATION ---
# #         # Instead of just email, let's fetch the user from the DB
# #         # This makes the dependency much more useful
# #         from app.database import users_collection
# #         user = users_collection.find_one({"email": email})
# #         if user is None:
# #             raise HTTPException(
# #                 status_code=status.HTTP_401_UNAUTHORIZED,
# #                 detail="User not found.",
# #             )
# #         # Convert ObjectId to string
# #         user["_id"] = str(user["_id"])
# #         return user
# #         # --------------------
# #     except JWTError:
# #         raise HTTPException(
# #             status_code=status.HTTP_401_UNAUTHORIZED,
# #             detail="Token expired or invalid.",
# #         ) 
# # old code above
    

# # 

# from fastapi import Depends, HTTPException, status
# from fastapi.security import OAuth2PasswordBearer
# from jose import jwt, JWTError
# from bson import ObjectId
# from app.core.config import SECRET_KEY, ALGORITHM
# from app.database import users_collection

# oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# def get_current_user(token: str = Depends(oauth2_scheme)):
#     try:
#         payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
#         sub = payload.get("sub")
#         if sub is None:
#             raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

#         # ✅ Query by ObjectId
#         user = users_collection.find_one({"_id": ObjectId(sub)})
#         if not user:
#             raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

#         user["_id"] = str(user["_id"])  # convert ObjectId to string
#         return user
#     except JWTError:
#         raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired or invalid")



from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from bson import ObjectId
from app.core.config import SECRET_KEY, ALGORITHM
from app.database import users_collection

security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        sub = payload.get("sub")
        if sub is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

        # ✅ Try ObjectId first, fallback to email
        user = None
        try:
            user = users_collection.find_one({"_id": ObjectId(sub)})
        except Exception:
            user = users_collection.find_one({"email": sub})

        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

        user["_id"] = str(user["_id"])
        return user

    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired or invalid")