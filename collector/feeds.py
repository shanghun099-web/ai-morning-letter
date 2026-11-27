"""출처(RSS/Atom/허깅페이스 논문 API)를 읽어 글 목록으로 바꾼다."""
from __future__ import annotations

import gzip
import html
import json
import re
import urllib.request
from datetime import datetime, timezone
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

import feedparser

UA = "Mozilla/5.0 (compatible; ai-news-daily/1.0; personal RSS reader)"
TRACKING = ("utm_", "ref", "ref_src", "fbclid", "gclid", "mc_cid", "mc_eid")


def fetch(url: str, timeout: int = 25) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "*/*"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        data = r.read()
    if data[:2] == b"\x1f\x8b":  # 압축(gzip)해서 보내는 곳
        data = gzip.decompress(data)
    return data


def clean_text(s: str, limit: int) -> str:
    s = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", s or "", flags=re.S | re.I)
    s = re.sub(r"<[^>]+>", " ", s)
    s = html.unescape(s)
    s = re.sub(r"\s+", " ", s).strip()
    return s[:limit]


def norm_url(url: str) -> str:
    """같은 글을 같은 주소로 보이게: 추적용 꼬리표·#뒤·끝 / 를 뗀다."""
    try:
        p = urlsplit(url.strip())
    except ValueError:
        return url
    q = [(k, v) for k, v in parse_qsl(p.query, keep_blank_values=True)
         if not k.lower().startswith(TRACKING)]
    host = p.netloc.lower().removeprefix("www.")
    path = p.path.rstrip("/") or "/"
    return urlunsplit(("https", host, path, urlencode(q), ""))


def safe_link(url: str) -> str | None:
    return url if isinstance(url, str) and re.match(r"^https?://", url) else None


def _time(entry) -> datetime | None:
    for k in ("published_parsed", "updated_parsed"):
        t = entry.get(k)
        if t:
            return datetime(*t[:6], tzinfo=timezone.utc)
    return None


PRERELEASE = re.compile(r"(alpha|beta|\brc\d*|preview|nightly|canary)", re.I)


def read_source(src: dict) -> list[dict]:
    if src.get("kind") == "hf_papers":
        return _hf_papers(src)
    raw = fetch(src["url"])
    feed = feedparser.parse(raw)
    if feed.bozo and not feed.entries:
        raise ValueError(f"피드를 읽지 못함: {feed.bozo_exception}")
    out = []
    snip_len = 1200 if src.get("tools") else 500
    for e in feed.entries:
        link = safe_link(e.get("link", ""))
        title = clean_text(e.get("title", ""), 300)
        if not link or not title:
            continue
        if src.get("skip_prerelease") and PRERELEASE.search(title):
            continue
        body = e.get("summary", "")
        if e.get("content"):
            body = e["content"][0].get("value", body)
        t = _time(e)
        out.append({
            "source": src["id"], "source_name": src["name"], "lang": src.get("lang", "en"),
            "title": title, "link": link, "key": norm_url(link),
            "snippet": clean_text(body, snip_len),
            "published": t.isoformat() if t else None,
            "tools": bool(src.get("tools")),
        })
    return out


def _hf_papers(src: dict) -> list[dict]:
    data = json.loads(fetch(src["url"]))
    out = []
    for d in data:
        p = d.get("paper") or {}
        pid = p.get("id")
        if not pid:
            continue
        link = f"https://huggingface.co/papers/{pid}"
        out.append({
            "source": src["id"], "source_name": src["name"], "lang": "en",
            "title": clean_text(p.get("title") or d.get("title", ""), 300),
            "link": link, "key": norm_url(link),
            "snippet": clean_text(p.get("summary", ""), 500),
            "published": d.get("publishedAt") or p.get("publishedAt"),
            "tools": False, "upvotes": p.get("upvotes", 0),
        })
    out.sort(key=lambda x: -x.get("upvotes", 0))
    return out
