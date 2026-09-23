from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.core.config import settings
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models import User
from app.schemas.user import UserRegister, UserLogin, UserOut, TokenOut
from app.core.auth import DUMMY_PASSWORD_HASH, create_access_token, get_password_hash, rate_limit, verify_user_password
from app.api.deps import get_current_user

router = APIRouter()

@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register_user(payload: UserRegister, db: AsyncSession = Depends(get_db), _: None = Depends(rate_limit("register", 5))):
    email = payload.email.lower()  # one account per address, whatever the capitalisation
    stmt = select(User).where(User.email == email)
    result = await db.execute(stmt)
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Account with this email already exists.")

    user = User(
        email=email,
        hashed_password=get_password_hash(payload.password)
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user

@router.post("/login", response_model=TokenOut)
async def login_user(payload: UserLogin, response: Response, db: AsyncSession = Depends(get_db), _: None = Depends(rate_limit("login", 10))):
    stmt = select(User).where(User.email == payload.email.lower())
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    # Always run bcrypt, so response time doesn't reveal whether the email has an account.
    valid = verify_user_password(payload.password, user.hashed_password if user else DUMMY_PASSWORD_HASH)
    if not user or not valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    access_token = create_access_token(data={"sub": str(user.id), "email": user.email})
    response.set_cookie(settings.SESSION_COOKIE_NAME, access_token, max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
                        httponly=True, secure=settings.COOKIE_SECURE, samesite="lax", path="/")
    return TokenOut(access_token=access_token, user=UserOut.model_validate(user))


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout_user(response: Response) -> Response:
    response.delete_cookie(settings.SESSION_COOKIE_NAME, path="/")
    response.status_code = status.HTTP_204_NO_CONTENT
    return response

@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user
