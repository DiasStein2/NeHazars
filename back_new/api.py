from fastapi import FastAPI

from .stats_api import router as stats_router


def register_routes(app: FastAPI):
    app.include_router(stats_router)
