"""요약용 AI 부르기: Gemini(무료 키)와 OpenAI(GPT 키). 순서대로 시도하고 실패하면 다음으로 넘어간다."""
from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request


class LLMError(Exception):
    pass


def _post(url: str, headers: dict, body: dict, timeout: int = 120) -> dict:
    req = urllib.request.Request(url, data=json.dumps(body).encode("utf-8"),
                                 headers={"Content-Type": "application/json", **headers}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "replace")[:300]
        raise LLMError(f"HTTP {e.code}: {detail}") from None
    except (urllib.error.URLError, TimeoutError) as e:
        raise LLMError(f"연결 실패: {e}") from None


def _gemini(model: str, system: str, user: str) -> str:
    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        raise LLMError("GEMINI_API_KEY 없음")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    body = {
        "systemInstruction": {"parts": [{"text": system}]},
        "contents": [{"role": "user", "parts": [{"text": user}]}],
        "generationConfig": {"responseMimeType": "application/json", "temperature": 0.2},
    }
    data = _post(url, {"x-goog-api-key": key}, body)
    try:
        return "".join(p.get("text", "") for p in data["candidates"][0]["content"]["parts"])
    except (KeyError, IndexError):
        raise LLMError(f"빈 답: {str(data)[:200]}") from None


def _openai(model: str, system: str, user: str) -> str:
    key = os.environ.get("OPENAI_API_KEY")
    if not key:
        raise LLMError("OPENAI_API_KEY 없음")
    body = {
        "model": model,
        "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
        "response_format": {"type": "json_object"},
    }
    data = _post("https://api.openai.com/v1/chat/completions", {"Authorization": f"Bearer {key}"}, body)
    try:
        return data["choices"][0]["message"]["content"]
    except (KeyError, IndexError):
        raise LLMError(f"빈 답: {str(data)[:200]}") from None


CALLERS = {"gemini": _gemini, "openai": _openai}


def ask_json(order: list[str], models: dict[str, list[str]], system: str, user: str,
             log: list[str]) -> tuple[dict, str]:
    """order 순서로 AI 를 불러 JSON 답을 받는다. (답, '누가:모델') 을 돌려준다. 모두 실패하면 LLMError."""
    for provider in order:
        no_key = False
        for model in models.get(provider, []):
            if no_key:
                break
            for attempt in range(2):
                try:
                    text = CALLERS[provider](model, system, user)
                    text = text.strip().removeprefix("```json").removeprefix("```").removesuffix("```")
                    return json.loads(text), f"{provider}:{model}"
                except LLMError as e:
                    msg = str(e)
                    log.append(f"{provider}:{model} 실패 — {msg[:160]}")
                    if msg.endswith("KEY 없음"):  # 키가 없으면 이 AI 는 통째로 건너뜀
                        no_key = True
                    elif attempt == 0 and ("HTTP 429" in msg or "HTTP 5" in msg or "연결 실패" in msg):
                        time.sleep(8)
                        continue
                    break  # 404(모델 없음)·400 등은 다음 모델로
                except json.JSONDecodeError:
                    log.append(f"{provider}:{model} 답이 JSON 이 아님")
                    break
    raise LLMError("모든 AI 실패")
