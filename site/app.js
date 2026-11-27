// 아침 AI 편지 — site/data/*.json 을 읽어 보여 준다. 바깥 글은 모두 textContent 로만 넣는다(HTML 로 해석하지 않음).
"use strict";

const CATS = [
  { id: "all", label: "전체" },
  { id: "video", label: "🎬 영상·음성·그림" },
  { id: "coding", label: "💻 코딩 에이전트" },
  { id: "industry", label: "🌍 AI 큰 소식" },
  { id: "trading", label: "📈 투자 AI" },
  { id: "star", label: "⭐ 찜" },
];
const CAT_EMOJI = { video: "🎬", coding: "💻", industry: "🌍", trading: "📈", tools: "🛠" };
const IMP = { 3: "꼭 보기", 2: "관심 있으면", 1: "참고" };
const WD = ["일", "월", "화", "수", "목", "금", "토"];

const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};
const safeUrl = (u) => (typeof u === "string" && /^https?:\/\//i.test(u) ? u : null);

const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* 저장 못 해도 괜찮음 */ } },
};

let index = null, day = null, dayIdx = 0, cat = store.get("cat", "all");
let stars = store.get("stars", {}); // id -> 카드 내용(날짜가 바뀌어도 찜 목록에서 보이게)

async function getJSON(path) {
  const r = await fetch(path + "?t=" + Date.now(), { cache: "no-store" });
  if (!r.ok) throw new Error(path + " " + r.status);
  return r.json();
}

function fmtDay(s) {
  const [y, m, d] = s.split("-").map(Number);
  const wd = WD[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${m}월 ${d}일 (${wd})`;
}
function ago(iso) {
  if (!iso) return "";
  const t = Date.parse(iso);
  if (isNaN(t)) return "";
  const h = Math.round((Date.now() - t) / 3600e3);
  if (h < 1) return "방금";
  if (h < 24) return `${h}시간 전`;
  return `${Math.round(h / 24)}일 전`;
}
function hm(iso) { // "2026-11-27T06:31+09:00" → "오전 6:31"
  const m = /T(\d\d):(\d\d)/.exec(iso || "");
  if (!m) return "";
  let h = +m[1];
  const ap = h < 12 ? "오전" : "오후";
  h = h % 12 || 12;
  return `${ap} ${h}:${m[2]}`;
}

function card(it) {
  const node = $("cardTpl").content.firstElementChild.cloneNode(true);
  node.id = "it-" + it.id;
  const imp = node.querySelector(".imp");
  imp.textContent = IMP[it.importance] || "참고";
  imp.classList.add("i" + (it.importance || 1));
  node.querySelector(".cat").textContent = CAT_EMOJI[it.category] || "";
  node.querySelector(".src").textContent = it.source_name || "";
  node.querySelector(".when").textContent = ago(it.published);
  const title = node.querySelector(".title");
  title.textContent = it.title_ko || it.title;
  if (it.raw) title.append(el("span", "tag", "요약 전"));
  else if (it.thin) title.append(el("span", "tag", "제목만 보고 쓴 요약"));
  node.querySelector(".sum").textContent = it.summary_ko || "";
  const why = node.querySelector(".why");
  if (it.why) why.textContent = it.why; else why.remove();
  const idea = node.querySelector(".idea");
  if (it.idea) idea.textContent = it.idea; else idea.remove();
  const also = node.querySelector(".also");
  const al = (it.also || []).filter((a) => safeUrl(a.link));
  if (al.length) {
    also.textContent = "같은 소식: ";
    al.forEach((a, i) => {
      const link = el("a", null, a.source_name);
      link.href = a.link; link.target = "_blank"; link.rel = "noopener noreferrer";
      also.append(link, i < al.length - 1 ? ", " : "");
    });
  } else also.remove();
  const open = node.querySelector(".open");
  const url = safeUrl(it.link);
  if (url) open.href = url; else open.remove();
  const star = node.querySelector(".star");
  const paint = () => {
    const on = !!stars[it.id];
    star.setAttribute("aria-pressed", on);
    star.textContent = on ? "★ 찜함" : "☆ 찜";
  };
  star.addEventListener("click", () => {
    if (stars[it.id]) delete stars[it.id];
    else stars[it.id] = { ...it, _day: day?.date };
    store.set("stars", stars);
    paint();
    if (cat === "star") renderList();
  });
  paint();
  if (typeof GPT !== "undefined") GPT.attach(node, it);
  return node;
}

function emptyBox(kind, text, sub) {
  const box = el("div", "empty");
  const img = el("img");
  img.src = kind === "error" ? "img/empty-error.webp" : "img/empty-none.webp";
  img.alt = "";
  img.width = 150; img.height = 150;
  box.append(img, el("p", null, text));
  if (sub) box.append(el("p", null, sub));
  return box;
}

function newsItems() {
  return (day?.items || []).filter((x) => x.category !== "tools");
}

function renderCats() {
  const nav = $("cats");
  nav.textContent = "";
  const items = newsItems();
  for (const c of CATS) {
    const b = el("button", null, c.label);
    b.type = "button";
    const n = c.id === "all" ? items.length : c.id === "star" ? Object.keys(stars).length
      : items.filter((x) => x.category === c.id).length;
    b.append(el("span", "n", String(n)));
    b.setAttribute("aria-pressed", String(cat === c.id));
    b.addEventListener("click", () => { cat = c.id; store.set("cat", cat); renderCats(); renderList(); });
    nav.append(b);
  }
}

function renderList() {
  const box = $("list");
  box.textContent = "";
  if (cat === "star") {
    const s = Object.values(stars).sort((a, b) => (b._day || "").localeCompare(a._day || ""));
    if (!s.length) box.append(emptyBox("none", "아직 찜한 소식이 없어요.", "카드의 ☆ 찜을 누르면 여기 모여요. (이 폰·이 브라우저에만 저장돼요)"));
    s.forEach((it) => box.append(card(it)));
    return;
  }
  const items = newsItems().filter((x) => cat === "all" || x.category === cat);
  if (!items.length) {
    const failed = index?.status?.sources?.every((s) => !s.ok);
    if (failed) box.append(emptyBox("error", "소식을 가져오지 못했어요.", "맨 아래 수집 상태를 확인해 주세요."));
    else box.append(emptyBox("none", cat === "all" ? "이날은 새 소식이 없어요." : "이 분류에는 소식이 없어요."));
    return;
  }
  items.forEach((it) => box.append(card(it)));
}

function renderBrief() {
  const sec = $("brief"), ol = $("briefList");
  ol.textContent = "";
  const br = day?.brief || [];
  sec.hidden = !br.length;
  for (const b of br) {
    const li = el("li");
    const target = b.ids?.[0];
    if (target) {
      const a = el("a", null, b.text);
      a.href = "#it-" + target;
      a.addEventListener("click", (e) => {
        e.preventDefault();
        if (cat !== "all" && cat !== "star") { cat = "all"; store.set("cat", cat); renderCats(); renderList(); }
        if (cat === "star") { cat = "all"; renderCats(); renderList(); }
        const c = document.getElementById("it-" + target);
        if (c) { c.scrollIntoView({ block: "start" }); c.classList.add("flash"); setTimeout(() => c.classList.remove("flash"), 1600); }
      });
      li.append(a);
    } else li.textContent = b.text;
    ol.append(li);
  }
}

async function renderTools() {
  let tools = {};
  try { tools = await getJSON("data/tools.json"); } catch { /* 없으면 숨김 */ }
  const list = $("toolList");
  list.textContent = "";
  const rows = Object.values(tools).sort((a, b) => (b.found || "").localeCompare(a.found || ""));
  $("tools").hidden = !rows.length;
  const today = index?.days?.[0];
  for (const t of rows) {
    const box = el("div", "tool");
    const head = el("div");
    head.append(el("b", null, t.name), el("span", "ver", t.version));
    if (t.found === today) head.append(el("span", "new", "새 버전"));
    box.append(head);
    if (t.summary_ko) box.append(el("p", null, t.summary_ko));
    const url = safeUrl(t.link);
    if (url) {
      const a = el("a", null, `바뀐 내용 전체 보기 ↗ · ${t.found ? fmtDay(t.found) + " 발견" : ""}`);
      a.href = url; a.target = "_blank"; a.rel = "noopener noreferrer";
      box.append(a);
    }
    list.append(box);
  }
}

function renderStatus() {
  const f = $("status");
  f.textContent = "";
  const st = index?.status;
  if (!st) return;
  const okN = st.sources.filter((s) => s.ok).length;
  const p = el("p");
  p.append(`마지막 수집: ${fmtDay(st.run_at.slice(0, 10))} ${hm(st.run_at)} · 출처 `);
  p.append(el("span", okN === st.sources.length ? "ok" : "bad", `${okN}/${st.sources.length} 성공`));
  const who = String(st.llm?.summary || "").split(":")[0];
  p.append(` · 요약: ${who === "gemini" ? "Gemini(무료)" : who === "openai" ? "GPT" : "없음"}`);
  f.append(p);
  const det = el("details");
  det.append(el("summary", null, "자세히"));
  const ul = el("ul");
  for (const s of st.sources) {
    const li = el("li");
    li.append(el("span", s.ok ? "ok" : "bad", s.ok ? "✓ " : "✗ "), `${s.name} — ${s.ok ? `새 글 ${s.new}개` : "실패: " + (s.error || "")}`);
    ul.append(li);
  }
  det.append(ul);
  if (st.errors?.length) {
    det.append(el("p", null, "AI 기록:"));
    const ul2 = el("ul");
    st.errors.forEach((e) => ul2.append(el("li", null, e)));
    det.append(ul2);
  }
  f.append(det);
}

async function loadDay(i) {
  dayIdx = i;
  const date = index.days[i];
  $("dayLabel").textContent = date ? fmtDay(date) : "";
  $("prevDay").disabled = i >= index.days.length - 1;
  $("nextDay").disabled = i <= 0;
  try { day = date ? await getJSON(`data/days/${date}.json`) : null; }
  catch { day = null; }
  renderBrief(); renderCats(); renderList();
}

async function main() {
  $("prevDay").addEventListener("click", () => loadDay(dayIdx + 1));
  $("nextDay").addEventListener("click", () => loadDay(dayIdx - 1));
  try {
    index = await getJSON("data/index.json");
  } catch {
    $("heroDate").textContent = "아직 모은 소식이 없어요";
    $("list").append(emptyBox("error", "소식 파일을 읽지 못했어요.", "첫 수집이 끝나면 여기에 나타나요."));
    return;
  }
  $("heroDate").textContent = index.status ? `${fmtDay(index.status.run_at.slice(0, 10))} ${hm(index.status.run_at)} 배달` : "";
  await loadDay(0);
  renderTools();
  renderStatus();
}
main();
