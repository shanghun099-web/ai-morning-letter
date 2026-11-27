# 아침 AI 편지

매일 아침·저녁 AI 소식을 모아 한국어로 요약해 보여 주는 나만 보는 웹앱.

## 어떻게 돌아가나
1. **GitHub Actions** 가 매일 06:17·18:17(한국 시간)에 `collector/collect.py` 를 실행 (PC 꺼 둬도 됨)
2. `config/sources.json` 의 공식 피드(RSS/Atom)를 읽음 → 새 글만 → AI 관련만
3. **Gemini(무료 키)** 로 한국어 요약·분류·중요도. 실패하면 **GPT(OpenAI 키)** 로 넘어감 (`config/settings.json` 에서 순서 바꿈)
4. 같은 소식 묶기 + '오늘의 3줄' → `site/data/` 에 저장하고 커밋
5. 같은 작업이 이어서 `site/` 를 **GitHub Pages** 로 배포 → https://shanghun099-web.github.io/ai-morning-letter/

원문 본문은 저장하지 않음 (제목·짧은 요약·원문 링크만).

## 자주 하는 일
| 하고 싶은 것 | 방법 |
|---|---|
| 지금 바로 모으기 | GitHub 저장소 → Actions → '아침 AI 편지 — 소식 모으기' → Run workflow |
| 출처 끄기/더하기 | `config/sources.json` 에서 `enabled` 바꾸기 / 줄 추가 |
| GPT 를 먼저 쓰기 | `config/settings.json` 의 `summary_order` 를 `["openai", "gemini"]` 로 |
| 내 PC 에서 시험 | `.venv\Scripts\python.exe collector\collect.py --dry` (AI 안 부르고 목록만) |
| 그림 다시 만들기 | `design/raw/` 의 원본을 바꾸고 `python design/build_images.py` |

## 키 (GitHub 저장소 → Settings → Secrets and variables → Actions)
- `GEMINI_API_KEY` — 무료 Gemini 키
- `OPENAI_API_KEY` — GPT 키 (없어도 됨)
