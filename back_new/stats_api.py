from __future__ import annotations

import json
import shutil
from pathlib import Path
from typing import Any, Dict, List

from fastapi import APIRouter, File, HTTPException, UploadFile

from .stats import OUTPUT_DIR, UPLOAD_DIR, compute_stats

router = APIRouter(tags=["Stats"])

STATS_JSON = OUTPUT_DIR / "stats.json"


def _persist_stats(stats) -> Dict[str, Any]:
    payload = stats.jsonable()
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    STATS_JSON.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return payload


def _compute_and_cache() -> Dict[str, Any]:
    try:
        stats = compute_stats()
    except SystemExit as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return _persist_stats(stats)


def _ensure_stats() -> Dict[str, Any]:
    if STATS_JSON.exists():
        try:
            return json.loads(STATS_JSON.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            # Corrupted cache; recompute
            STATS_JSON.unlink(missing_ok=True)
    return _compute_and_cache()


def _build_summary(stats: Dict[str, Any]) -> Dict[str, Any]:
    meta = stats.get("meta", {})
    messages_per_day = stats.get("messages_per_day", [])

    peak_day = ""
    peak_count = 0
    for entry in messages_per_day:
        count = int(entry.get("value", 0))
        if count > peak_count:
            peak_count = count
            peak_day = entry.get("day", "")

    return {
        "totalMessages": int(meta.get("user_messages", 0)),
        "totalUsers": len(meta.get("users", [])),
        "activeDays": sum(1 for entry in messages_per_day if int(entry.get("value", 0)) > 0),
        "peakActivityDate": peak_day,
        "peakMessageCount": peak_count,
    }


@router.post("/upload")
async def upload_chat_export(files: List[UploadFile] = File(...)) -> Dict[str, Any]:
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded.")

    invalid = []
    for file in files:
        extension = Path(file.filename).suffix.lower()
        if extension not in {".html", ".htm"}:
            invalid.append(file.filename)

    if invalid:
        raise HTTPException(
            status_code=400,
            detail="Only Telegram HTML exports (.html) are supported.",
        )

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    # Avoid mixing multiple exports when re-uploading.
    for existing in UPLOAD_DIR.glob("*.htm*"):
        try:
            existing.unlink()
        except OSError:
            pass

    saved_files: List[str] = []
    for idx, file in enumerate(files):
        extension = Path(file.filename).suffix.lower()
        sanitized = Path(file.filename).name
        if not sanitized:
            sanitized = f"messages{'' if idx == 0 else idx + 1}{extension}"

        destination = UPLOAD_DIR / sanitized
        if destination.exists():
            destination = UPLOAD_DIR / f"{destination.stem}_{idx + 1}{destination.suffix}"

        with destination.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        saved_files.append(destination.name)

    stats_payload = _compute_and_cache()
    return {
        "status": "ok",
        "filename": saved_files[0] if saved_files else "",
        "filenames": saved_files,
        "fileCount": len(saved_files),
        "message": "File processed" if len(saved_files) == 1 else "Files processed",
        "summary": _build_summary(stats_payload),
    }


@router.get("/stats/summary")
def get_summary() -> Dict[str, Any]:
    stats = _ensure_stats()
    return _build_summary(stats)


@router.get("/stats/activity")
def get_activity() -> Dict[str, List[Dict[str, Any]]]:
    stats = _ensure_stats()

    timeline = sorted(
        [
            {"date": entry.get("day"), "messages": int(entry.get("value", 0))}
            for entry in stats.get("messages_per_day", [])
        ],
        key=lambda item: item.get("date") or "",
    )

    hourly_map = {entry.get("hour"): int(entry.get("value", 0)) for entry in stats.get("messages_per_hour", [])}
    hourly = [{"hour": hour, "label": f"{hour}:00", "count": int(hourly_map.get(hour, 0))} for hour in range(24)]

    weekday = [
        {"day": entry.get("day", "")[:3], "count": int(entry.get("count", 0))}
        for entry in stats.get("weekday_counts", [])
    ]

    return {"timeline": timeline, "hourly": hourly, "weekday": weekday}


@router.get("/stats/users")
def get_user_stats() -> List[Dict[str, Any]]:
    stats = _ensure_stats()

    messages = stats.get("messages_per_user", [])
    replies_map = {entry.get("user"): int(entry.get("reply_count", 0)) for entry in stats.get("replies_per_user", [])}
    total_messages = sum(int(entry.get("value", 0)) for entry in messages) or 1

    users: List[Dict[str, Any]] = []
    for idx, entry in enumerate(messages, start=1):
        name = entry.get("user", "Unknown")
        message_count = int(entry.get("value", 0))
        replies = replies_map.get(name, 0)
        contribution = round((message_count / total_messages) * 100, 2)

        users.append(
            {
                "id": idx,
                "name": name,
                "messages": message_count,
                "replies": replies,
                "contribution": contribution,
            }
        )

    return users


@router.get("/stats/content")
def get_content_stats() -> Dict[str, Any]:
    stats = _ensure_stats()
    return {
        "types": stats.get("content_types", []),
        "lengthDist": stats.get("length_distribution", []),
        "emojis": stats.get("top_emojis", []),
        "topWords": stats.get("top_words", []),
        "inactiveDays": stats.get("inactive_days", []),
    }
