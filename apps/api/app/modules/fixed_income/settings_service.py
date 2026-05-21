from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import UserSettings


def get_settings(db: Session, user_id: str) -> UserSettings:
    s = db.scalar(select(UserSettings).where(UserSettings.user_id == user_id))
    if s is None:
        s = UserSettings(user_id=user_id, cdi_mensal=Decimal("0"))
        db.add(s)
        db.commit()
        db.refresh(s)
    return s


def update_settings(db: Session, user_id: str, cdi_mensal: Decimal) -> UserSettings:
    s = get_settings(db, user_id)
    s.cdi_mensal = cdi_mensal
    db.commit()
    db.refresh(s)
    return s
