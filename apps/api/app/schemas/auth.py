from pydantic import BaseModel, EmailStr


class LoginInput(BaseModel):
    email: EmailStr
    password: str


class SignupInput(BaseModel):
    name: str
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    createdAt: str


class AuthResponse(BaseModel):
    user: UserResponse
    token: str
