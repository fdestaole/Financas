from pydantic import BaseModel, EmailStr, Field, field_validator


def _normalize_email(value: str) -> str:
    return value.strip().lower()


class RegisterIn(BaseModel):
    email: EmailStr
    nome: str = Field(min_length=1, max_length=120)
    senha: str = Field(min_length=6, max_length=200)

    @field_validator("email", mode="after")
    @classmethod
    def _lower_email(cls, v: str) -> str:
        return _normalize_email(v)


class LoginIn(BaseModel):
    email: EmailStr
    senha: str

    @field_validator("email", mode="after")
    @classmethod
    def _lower_email(cls, v: str) -> str:
        return _normalize_email(v)


class UserOut(BaseModel):
    id: str
    email: EmailStr
    nome: str

    model_config = {"from_attributes": True}


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
