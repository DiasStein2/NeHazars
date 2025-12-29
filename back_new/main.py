from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .stats_api import router as stats_router

BASE_DIR = Path(__file__).resolve().parent.parent
STATIC_DIR = BASE_DIR / "frontend"
OUTPUTS_DIR = Path(__file__).resolve().parent / "outputs"

app = FastAPI(title="Telegram Chat Stats", version="1.0.0")
app.include_router(stats_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

if STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=STATIC_DIR, html=False), name="static")
if OUTPUTS_DIR.exists():
    app.mount("/outputs", StaticFiles(directory=OUTPUTS_DIR, html=False), name="outputs")


@app.get("/", include_in_schema=False)
def serve_root():
    index_path = STATIC_DIR / "index.html"
    if not index_path.exists():
        raise HTTPException(status_code=404, detail="Dashboard UI not found")
    return FileResponse(index_path)
