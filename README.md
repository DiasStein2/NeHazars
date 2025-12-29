# Telegram Chat Insights

A full-stack app that turns Telegram HTML exports into analytics. Upload one or more
`messages*.html` files, then explore message volume over time, activity by hour and
weekday, top users, content types, top words, and emoji usage.

## Features
- Upload one or multiple Telegram HTML export files.
- Aggregated dashboard with KPIs, charts, and per-user breakdown.
- Top words and emojis extracted from message content.

## Tech Stack
- Backend: FastAPI + pandas + BeautifulSoup
- Frontend: React + Vite + Tailwind + Recharts

## Project Structure
- `back_new/`: FastAPI API and stats pipeline
- `frontend/`: React UI
- `data/`: Local data/uploads (runtime)
- `outputs/`: Generated stats cache (runtime)

## Requirements
- Python 3.11+
- Node.js 18+

## Local Development

### 1) Start the backend
```powershell
cd C:\Users\diasm\Documents\insightful-files
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m uvicorn back_new.main:app --reload --host 0.0.0.0 --port 8000
```

### 2) Start the frontend
```powershell
cd C:\Users\diasm\Documents\insightful-files\frontend
$env:VITE_API_BASE_URL="http://localhost:8000"
npm install
npm run dev
```

Open the UI at `http://localhost:8080`.

### .env alternative
Create `frontend/.env`:
```
VITE_API_BASE_URL=http://localhost:8000
```

## How to Use
1. Export a Telegram chat to HTML (Desktop app: Settings > Advanced > Export chat history).
2. In the UI, upload one or multiple `messages*.html` files.
3. View the analytics dashboard.

## API Endpoints (summary)
- `POST /upload` (multipart `files[]`): upload one or more HTML exports
- `GET /stats/summary`: KPI summary
- `GET /stats/activity`: timeline, hourly, and weekday activity
- `GET /stats/users`: per-user stats
- `GET /stats/content`: content types, top words, emojis, and inactive days

## Notes
- Each upload replaces the previous dataset (the latest upload is cached on disk).
- The backend expects Telegram HTML export format.

## License
MIT
