from __future__ import annotations

from dataclasses import dataclass
from datetime import timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import re
from collections import Counter
import json

try:
    import matplotlib.pyplot as plt
except ImportError:
    plt = None

import pandas as pd

try:
    import seaborn as sns
except ImportError:
    sns = None

try:
    from bs4 import BeautifulSoup
except ImportError as exc:
    raise SystemExit(
        "Install beautifulsoup4 to parse Telegram exports (pip install beautifulsoup4)."
    ) from exc

SOUP_PARSER = "lxml"
try:
    BeautifulSoup("<html></html>", SOUP_PARSER)
except Exception:
    SOUP_PARSER = "html.parser"

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR.parent / "data"
OUTPUT_DIR = BASE_DIR / "outputs"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
UPLOAD_DIR = DATA_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
WEEKDAY_ORDER = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
]

MEDIA_TYPE_MAP = {
    "media_audio_file": "audio",
    "media_file": "document",
    "media_game": "game",
    "media_live_location": "live_location",
    "media_location": "location",
    "media_photo": "photo",
    "media_poll": "poll",
    "media_video": "video",
    "media_voice_message": "voice",
}

WORD_REGEX = re.compile(r"[A-Za-zگ?-گôگّ-‘?گ?‘']+")
EMOJI_PATTERN = re.compile(
    "["
    "\U0001F600-\U0001F64F"
    "\U0001F300-\U0001F5FF"
    "\U0001F680-\U0001F6FF"
    "\U0001F1E0-\U0001F1FF"
    "]",
    flags=re.UNICODE,
)

STOPWORDS = set(
    [
        "the",
        "a",
        "to",
        "is",
        "it",
        "of",
        "for",
        "in",
        "that",
        "and",
        "you",
        "me",
        "i",
        "my",
        "we",
        "our",
        "ya",
        "گ?گّ",
        "گ?گç‘'",
        "گ?گ?",
        "گ?گ?گّ",
        "گ?گ?گٌ",
        "گ?‘<",
        "گ?‘<",
        "‘?‘'گ?",
        "گَگّگَ",
        "‘'گّگَ",
        "گ?گ?",
        "گّ",
        "‘'گ?",
        "گُگ?",
        "گَ",
        "گٌگْ",
        "‘?",
        "گْگّ",
        "گ?گ?",
        "گ?گç",
        "‘ط‘'گ?",
        "گ?",
        "گ?گّ",
    ]
)

# Only keep these users (based on first-name match)
USER_MAP: Dict[str, str] = {
    "dias": "Dias",
    "asanali": "Asanali",
    "arseniy": "Arseniy",
    "maxat": "Maxat",
    "maksat": "Maxat",
}


@dataclass
class StatsResult:
    df: pd.DataFrame
    user_df: pd.DataFrame
    messages_per_user: pd.Series
    messages_per_day: pd.Series
    messages_per_hour: pd.Series
    avg_length: pd.Series
    replies_per_user: pd.Series
    starters_per_user: pd.Series
    top_words: List[Tuple[str, int]]
    top_emojis: List[Tuple[str, int]]
    inactive_days: List
    meta: Dict[str, Any]
    content_types: Dict[str, int]
    length_distribution: List[Tuple[str, int]]
    weekday_counts: Dict[str, int]

    def jsonable(self) -> Dict[str, Any]:
        def series_to_list(
            series,
            key_name="key",
            value_name="value",
            key_fmt=lambda x: x,
            value_fmt=lambda v: int(v),
        ):
            return [
                {key_name: key_fmt(k), value_name: value_fmt(v)}
                for k, v in series.items()
            ]

        return {
            "meta": self.meta,
            "messages_per_user": series_to_list(
                self.messages_per_user, key_name="user"
            ),
            "messages_per_day": series_to_list(
                self.messages_per_day, key_name="day", key_fmt=lambda d: str(d)
            ),
            "messages_per_hour": series_to_list(
                self.messages_per_hour, key_name="hour"
            ),
            "avg_length": series_to_list(
                self.avg_length.round(2),
                key_name="user",
                value_name="avg_words",
                value_fmt=lambda v: float(v),
            ),
            "replies_per_user": series_to_list(
                self.replies_per_user, key_name="user", value_name="reply_count"
            ),
            "conversation_starters": series_to_list(
                self.starters_per_user, key_name="user", value_name="count"
            ),
            "top_words": [{"word": w, "count": c} for w, c in self.top_words],
            "top_emojis": [{"emoji": e, "count": c} for e, c in self.top_emojis],
            "inactive_days": [str(d) for d in self.inactive_days],
            "content_types": [
                {"name": "Text", "value": int(self.content_types.get("text", 0))},
                {
                    "name": "Media/Other",
                    "value": int(self.content_types.get("other", 0)),
                },
            ],
            "length_distribution": [
                {"range": label, "count": int(count)}
                for label, count in self.length_distribution
            ],
            "weekday_counts": [
                {"day": day, "count": int(self.weekday_counts.get(day, 0))}
                for day in WEEKDAY_ORDER
            ],
        }


def canonical_sender(name: str) -> Optional[str]:
    """
    Normalize sender names using the first word (case-insensitive).
    Maps known aliases (e.g. "Dias Myssyr" -> "Dias", "Maksat" -> "Maxat")
    and falls back to a capitalized first token so unknown users are still counted.
    """
    if not name:
        return None
    cleaned = re.sub(r"[^A-Za-zگ?-گôگّ-‘?گ?‘']", " ", name).strip()
    parts = cleaned.split()
    if not parts:
        return None
    key = parts[0].casefold()
    return USER_MAP.get(key, parts[0].title())


def message_sort_key(path: Path) -> int:
    match = re.match(r"messages(\d+)?", path.stem)
    if match:
        suffix = match.group(1)
        return int(suffix) if suffix else 0
    return 0


def extract_reply_to(reply_div) -> Optional[int]:
    if not reply_div:
        return None

    link = reply_div.find("a")
    if not link:
        return None

    candidate = " ".join(
        [
            link.get("href", ""),
            link.get("onclick", ""),
        ]
    )
    match = re.search(r"(-?\d+)", candidate)
    if match:
        try:
            return abs(int(match.group(1)))
        except ValueError:
            return None
    return None


def detect_media_type(media_wrap) -> Optional[str]:
    if not media_wrap:
        return None

    media_node = media_wrap.find(["div", "a"], class_=re.compile(r"media_"))
    if not media_node:
        return None

    for cls in media_node.get("class", []):
        if cls.startswith("media_") and cls != "media_wrap":
            return MEDIA_TYPE_MAP.get(cls, "media")
    return None


def parse_message(
    msg,
    last_sender: Optional[str],
    last_sender_canonical: Optional[str],
):
    is_service = "service" in msg.get("class", [])

    msg_id = None
    msg_id_raw = msg.get("id")
    if msg_id_raw:
        msg_id_match = re.search(r"(\d+)", msg_id_raw)
        if msg_id_match:
            msg_id = int(msg_id_match.group(1))

    date_div = msg.select_one("div.pull_right.date.details")
    date_text = date_div["title"].strip() if date_div and date_div.has_attr("title") else None
    if not date_text:
        return None, last_sender, last_sender_canonical

    sender_div = msg.select_one("div.from_name")
    sender = sender_div.get_text(" ", strip=True) if sender_div else last_sender
    sender_canonical = canonical_sender(sender) if sender else last_sender_canonical
    sender = sender or "Unknown"

    reply_to = extract_reply_to(msg.select_one("div.reply_to"))
    text_div = msg.select_one("div.text")
    text = text_div.get_text(" ", strip=True) if text_div else ""

    media_type = detect_media_type(msg.select_one("div.media_wrap"))

    if is_service:
        content_type = "service"
        if not text:
            text = msg.get_text(" ", strip=True)
    elif media_type:
        content_type = media_type
    elif text:
        content_type = "text"
    else:
        content_type = "unknown"

    next_sender = last_sender
    next_sender_canonical = last_sender_canonical
    if not is_service:
        next_sender = sender
        next_sender_canonical = sender_canonical

    return (
        {
            "message_id": msg_id,
            "date": date_text,
            "sender": sender,
            "sender_canonical": sender_canonical,
            "text": text,
            "content_type": content_type,
            "reply_to": reply_to,
        },
        next_sender,
        next_sender_canonical,
    )


def load_chat_records() -> List[Dict]:
    def find_exports(directory: Path) -> List[Path]:
        candidates = sorted(directory.glob("messages*.htm*"), key=message_sort_key)
        if not candidates:
            candidates = sorted(directory.glob("*.htm*"), key=message_sort_key)
        return candidates

    upload_files = find_exports(UPLOAD_DIR)
    source_dir = UPLOAD_DIR if upload_files else DATA_DIR
    files = upload_files if upload_files else find_exports(DATA_DIR)
    if not files:
        raise SystemExit(f"No Telegram exports found under {source_dir}")

    records: List[Dict] = []
    last_sender: Optional[str] = None
    last_sender_canonical: Optional[str] = None

    for path in files:
        with path.open(encoding="utf-8") as f:
            soup = BeautifulSoup(f, SOUP_PARSER)

        for msg in soup.select("div.message"):
            parsed, last_sender, last_sender_canonical = parse_message(
                msg, last_sender, last_sender_canonical
            )
            if parsed:
                records.append(parsed)

    if not records:
        raise SystemExit("Parsed 0 messages. Check the export format.")

    return records


def compute_stats() -> StatsResult:
    records = load_chat_records()
    df = pd.DataFrame(records)
    df["date"] = pd.to_datetime(df["date"], errors="coerce", dayfirst=True)
    df = df.dropna(subset=["date"]).copy()

    df["text"] = df["text"].fillna("")
    df["word_count"] = df["text"].str.split().str.len()
    df["char_count"] = df["text"].str.len()
    df["day"] = df["date"].dt.date
    df["hour"] = df["date"].dt.hour
    df["is_reply"] = df["reply_to"].notna()
    df["sender_canonical"] = df["sender"].apply(canonical_sender)
    df["sender_canonical"] = df["sender_canonical"].fillna(
        df["sender"].fillna("Unknown")
    )

    user_df = df[df["content_type"] != "service"].copy()
    user_df = user_df[user_df["sender_canonical"].astype(bool)]
    if user_df.empty:
        raise SystemExit("No user messages found in the export.")

    messages_per_user = (
        user_df.groupby("sender_canonical").size().sort_values(ascending=False)
    )
    messages_per_day = user_df.groupby("day").size()
    messages_per_hour = user_df.groupby("hour").size()
    avg_length = user_df.groupby("sender_canonical")["word_count"].mean()
    replies_per_user = user_df.groupby("sender_canonical")["is_reply"].sum()

    df_sorted = user_df.sort_values("date")
    df_sorted["time_diff"] = df_sorted["date"].diff()
    conversation_starters = df_sorted[df_sorted["time_diff"] > timedelta(hours=6)]
    starters_per_user = conversation_starters["sender_canonical"].value_counts()

    def extract_words(text: str) -> List[str]:
        return WORD_REGEX.findall(text.lower())

    all_words: List[str] = []
    for t in user_df["text"]:
        all_words.extend(extract_words(t))

    filtered_words = [w for w in all_words if w not in STOPWORDS and len(w) > 2]
    top_words = Counter(filtered_words).most_common(20)

    emojis: List[str] = []
    for t in user_df["text"]:
        emojis.extend(EMOJI_PATTERN.findall(t))

    top_emojis = Counter(emojis).most_common(10)

    type_counts = user_df["content_type"].value_counts()
    text_count = int(type_counts.get("text", 0))
    other_count = int(type_counts.sum() - text_count)
    content_types = {"text": text_count, "other": other_count}

    length_distribution = [
        ("0-10", int((user_df["word_count"] <= 10).sum())),
        ("11-50", int(((user_df["word_count"] > 10) & (user_df["word_count"] <= 50)).sum())),
        ("51-100", int(((user_df["word_count"] > 50) & (user_df["word_count"] <= 100)).sum())),
        ("100-500", int(((user_df["word_count"] > 100) & (user_df["word_count"] <= 500)).sum())),
        ("500+", int((user_df["word_count"] > 500).sum())),
    ]

    weekday_counts_series = (
        user_df.groupby(user_df["date"].dt.day_name()).size().reindex(WEEKDAY_ORDER, fill_value=0)
    )
    weekday_counts = {day: int(count) for day, count in weekday_counts_series.items()}

    all_days = pd.date_range(user_df["day"].min(), user_df["day"].max())
    inactive_days = sorted(set(all_days.date) - set(user_df["day"]))

    meta = {
        "total_messages": int(len(df)),
        "user_messages": int(len(user_df)),
        "users": sorted(user_df["sender_canonical"].unique()),
    }

    return StatsResult(
        df=df,
        user_df=user_df,
        messages_per_user=messages_per_user,
        messages_per_day=messages_per_day,
        messages_per_hour=messages_per_hour,
        avg_length=avg_length,
        replies_per_user=replies_per_user,
        starters_per_user=starters_per_user,
        top_words=top_words,
        top_emojis=top_emojis,
        inactive_days=inactive_days,
        meta=meta,
        content_types=content_types,
        length_distribution=length_distribution,
        weekday_counts=weekday_counts,
    )


def write_reports(stats: StatsResult) -> None:
    print("\n--- TOP USERS ---")
    print(stats.messages_per_user.head())

    print("\n--- AVG MESSAGE LENGTH ---")
    print(stats.avg_length.round(2))

    print("\n--- MOST ACTIVE HOURS ---")
    print(stats.messages_per_hour.sort_values(ascending=False).head())

    print("\n--- CONVERSATION STARTERS ---")
    print(stats.starters_per_user.head())

    print("\n--- TOP WORDS ---")
    for w, c in stats.top_words:
        print(w, c)

    print("\n--- TOP EMOJIS ---")
    for e, c in stats.top_emojis:
        print(e, c)

    print("\nInactive days:", len(stats.inactive_days))

    if sns:
        sns.set_style("whitegrid")

    if plt:
        plt.figure(figsize=(10, 5))
        stats.messages_per_user.plot(kind="bar")
        plt.title("Messages per user")
        plt.tight_layout()
        plt.savefig(OUTPUT_DIR / "messages_per_user.png")

        plt.figure(figsize=(10, 5))
        stats.messages_per_day.plot()
        plt.title("Messages per day")
        plt.tight_layout()
        plt.savefig(OUTPUT_DIR / "messages_per_day.png")

        plt.figure(figsize=(10, 5))
        stats.messages_per_hour.plot(kind="bar")
        plt.title("Messages by hour")
        plt.tight_layout()
        plt.savefig(OUTPUT_DIR / "messages_by_hour.png")

        plt.figure(figsize=(10, 5))
        stats.avg_length.plot(kind="bar")
        plt.title("Average message length per user")
        plt.tight_layout()
        plt.savefig(OUTPUT_DIR / "avg_message_length.png")

        print("\nCharts saved:")
        print("- messages_per_user.png")
        print("- messages_per_day.png")
        print("- messages_by_hour.png")
        print("- avg_message_length.png")
    else:
        print("\nmatplotlib is not installed; skipping chart rendering.")

    stats.messages_per_user.to_csv(OUTPUT_DIR / "messages_per_user.csv", header=["count"])
    stats.messages_per_day.to_csv(OUTPUT_DIR / "messages_per_day.csv", header=["count"])
    stats.messages_per_hour.to_csv(OUTPUT_DIR / "messages_per_hour.csv", header=["count"])
    stats.avg_length.to_csv(OUTPUT_DIR / "avg_message_length.csv", header=["avg_words"])
    stats.replies_per_user.to_csv(OUTPUT_DIR / "replies_per_user.csv", header=["reply_count"])
    stats.starters_per_user.to_csv(
        OUTPUT_DIR / "conversation_starters.csv", header=["count"]
    )

    pd.DataFrame(stats.top_words, columns=["word", "count"]).to_csv(
        OUTPUT_DIR / "top_words.csv", index=False
    )
    pd.DataFrame(stats.top_emojis, columns=["emoji", "count"]).to_csv(
        OUTPUT_DIR / "top_emojis.csv", index=False
    )
    pd.DataFrame(stats.inactive_days, columns=["inactive_day"]).to_csv(
        OUTPUT_DIR / "inactive_days.csv", index=False
    )

    (OUTPUT_DIR / "stats.json").write_text(
        json.dumps(stats.jsonable(), indent=2), encoding="utf-8"
    )
    print("\nStats JSON saved to outputs/stats.json")


if __name__ == "__main__":
    write_reports(compute_stats())
