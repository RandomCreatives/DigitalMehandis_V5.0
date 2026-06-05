from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.db.models import User
from app.schemas.user import UserRegister, UserLogin, UserOut, TokenResponse
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token
from app.core.config import get_settings
from app.dependencies import get_current_user

settings = get_settings()
router = APIRouter(prefix="/auth", tags=["auth"])


def _set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    """Set httponly, samesite=lax cookies for access and refresh tokens."""
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=False,  # Set to True in production (HTTPS only)
        samesite="lax",
        path="/",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,
        samesite="lax",
        path="/api/v1/auth/refresh-token",  # Restrict to refresh endpoint
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
    )


def _clear_auth_cookies(response: Response) -> None:
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/api/v1/auth/refresh-token")


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register(payload: UserRegister, response: Response, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        organization=payload.organization,
        role=payload.role,
        email_verified=True,  # Phase 1: skip email verification flow
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    access_token = create_access_token(str(user.id))
    refresh_token = create_refresh_token(str(user.id))
    _set_auth_cookies(response, access_token, refresh_token)

    return user


@router.post("/login", response_model=TokenResponse)
async def login(payload: UserLogin, response: Response, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token = create_access_token(str(user.id))
    refresh_token = create_refresh_token(str(user.id))
    _set_auth_cookies(response, access_token, refresh_token)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
    )


@router.post("/refresh-token", response_model=TokenResponse)
async def refresh_token(request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    # Read refresh token from httponly cookie (preferred)
    token = request.cookies.get("refresh_token")
    # Fallback to body for backward compatibility during transition
    if not token:
        body = await request.json() or {}
        token = body.get("refresh_token", "")

    if not token:
        raise HTTPException(status_code=401, detail="No refresh token provided")

    payload = decode_token(token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user_id = payload["sub"]
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    new_access = create_access_token(str(user.id))
    new_refresh = create_refresh_token(str(user.id))
    _set_auth_cookies(response, new_access, new_refresh)

    return TokenResponse(
        access_token=new_access,
        refresh_token=new_refresh,
        token_type="bearer",
    )


@router.post("/logout")
async def logout(response: Response):
    _clear_auth_cookies(response)
    return {"message": "Logged out"}


@router.get("/me", response_model=UserOut)
async def get_me(user: User = Depends(get_current_user)):
    """Return the currently authenticated user."""
    return user
