from pydantic import BaseModel, EmailStr, Field, field_validator
import datetime

class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=72)

    @field_validator("password")
    @classmethod
    def fits_bcrypt(cls, v: str) -> str:
        if len(v.encode("utf-8")) > 72:
            raise ValueError("Password must be at most 72 bytes.")
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(..., max_length=256)

class UserOut(BaseModel):
    id: int
    email: str
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
