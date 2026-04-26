from pydantic import BaseModel, EmailStr, Field


class RegisterIn(BaseModel):
    email: EmailStr
    nome: str = Field(min_length=1, max_length=120)
    senha: str = Field(min_length=6, max_length=200)


class LoginIn(BaseModel):
    email: EmailStr
    senha: str


class UserOut(BaseModel):
    id: str
    email: EmailStr
    nome: str

    model_config = {"from_attributes": True}


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
