from fastapi import APIRouter
from app.api.v1.endpoints import shares, users, security_spec

api_router = APIRouter()

api_router.include_router(shares.router, prefix="/shares", tags=["shares"])
api_router.include_router(users.router, prefix="/auth", tags=["auth"])
api_router.include_router(security_spec.router, prefix="/security", tags=["security"])
