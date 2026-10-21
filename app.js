/* 버킷리스트 방명록 — 화면 동작
   - 글 하나 = 격자 판 위의 도형 하나 (관람객이 고른 색 + 모양)
   - 도형 자리는 글 순서와 글id로 정해져서 누가 열어도 같은 모양으로 보임
     (첫 글은 위쪽 가운데, 다음 글부터는 이미 놓인 도형 옆(대각선 포함) 빈칸 중 위쪽에 가까운 곳에 조금 무작위로)
   - 도형을 누르면 글이 보임. 30초마다 새 글 확인
   - 내가 쓴 글은 이 휴대폰에 기억해 두고 천천히 숨쉬듯 움직임 */
const API = '/api/bucket';
const MAX = 80;
const COLS = 8;                 // 격자 가로 칸 수
const TOP = 1;                  // 판 위쪽 빈 줄 수
const SHAPES = ['square', 'triangle', 'circle'];
const COLOR_NAMES = ['보라', '하늘', '주황', '분홍', '초록', '연두'];
const col = (i) => `var(--c${i})`;
const $ = (id) => document.getElementById(id);

const board = $('board'), shadowsEl = $('shadows'), piecesEl = $('pieces');
let items = [];                 // 오래된 글 → 최신 글
const seen = new Set();         // 이미 그린 글 (새 글만 떨어지는 효과)
let drawn = false;              // 처음 그릴 땐 떨어지는 효과 없이

// 내가 쓴 글 id (이 휴대폰에만 저장. 못 쓰는 환경이면 그냥 넘어감)
const MINE_KEY = 'bucket-mine';
let mine = [];
try { mine = JSON.parse(localStorage.getItem(MINE_KEY) || '[]'); } catch { /* 없음 */ }
function rememberMine(id) {
  mine = [id, ...mine].slice(0, 20);
  try { localStorage.setItem(MINE_KEY, JSON.stringify(mine)); } catch { /* 없음 */ }
}

/* ---------- 자리 정하기 ---------- */
// 글id로 늘 같은 무작위 수를 만듦
function rng(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function layout(list) {
  const taken = new Set();
  const key = (r, c) => r * COLS + c;
  const out = [];
  for (const it of list) {
    const rand = rng(it.id);
    // 색·모양이 없는 예전 글은 글id로 정해 둠
    if (!SHAPES.includes(it.shape)) it.shape = SHAPES[Math.floor(rng(it.id + 's')() * 3)];
    if (!(it.color >= 0 && it.color < 6)) it.color = Math.floor(rng(it.id + 'c')() * 6);
    let best = null;
    if (!taken.size) {
      best = { r: 0, c: 3 + Math.floor(rand() * 2) };
    } else {
      // 이미 놓인 도형 둘레(대각선 포함)의 빈칸이 후보
      const cand = new Map();
      for (const k of taken) {
        const r0 = Math.floor(k / COLS), c0 = k % COLS;
        for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
          const r = r0 + dr, c = c0 + dc;
          if (r < 0 || c < 0 || c >= COLS || taken.has(key(r, c))) continue;
          cand.set(key(r, c), { r, c });
        }
      }
      // 점수가 낮은 곳에 놓음: 위쪽일수록, 가운데에 가까울수록, 옆에 붙은 도형이 적을수록(구멍이 듬성듬성 생기게) + 무작위
      for (const p of [...cand.values()].sort((a, b) => key(a.r, a.c) - key(b.r, b.c))) {
        let touch = 0;
        for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) if (taken.has(key(p.r + dr, p.c + dc))) touch++;
        const score = p.r * 0.45 + Math.abs(p.c - 3.5) * 0.6 + touch * 0.8 + rand() * 3;
        if (!best || score < best.score) best = { ...p, score };
      }
    }
    taken.add(key(best.r, best.c));
    out.push({ it, r: best.r + TOP, c: best.c, turn: Math.floor(rng(it.id + 't')() * 4) });
  }
  return out;
}

/* ---------- 그리기 ---------- */
function pieceEl(p, tag) {
  const el = document.createElement(tag);
  el.className = `pc ${p.it.shape}` + (p.it.shape === 'triangle' ? ` t${p.turn}` : '');
  el.style.left = `calc(var(--cell) * ${p.c})`;
  el.style.top = `calc(var(--cell) * ${p.r})`;
  el.style.setProperty('--col', col(p.it.color));
  el.append(document.createElement('i'));
  return el;
}

function render() {
  const placed = layout(items);
  const rows = placed.reduce((m, p) => Math.max(m, p.r + 1), 0);
  board.style.height = `calc(var(--cell) * ${Math.max(10, rows + 2)})`;
  shadowsEl.replaceChildren(...placed.map((p) => pieceEl(p, 'div')));
  piecesEl.replaceChildren(...placed.map((p) => {
    const b = pieceEl(p, 'button');
    b.setAttribute('aria-label', p.it.text);
    if (mine.includes(p.it.id)) b.classList.add('mine');
    if (drawn && !seen.has(p.it.id)) b.classList.add('drop');
    b.onclick = () => showCard(p);
    b.dataset.id = p.it.id;
    return b;
  }));
  placed.forEach((p) => seen.add(p.it.id));
  drawn = true;
  $('count').textContent = items.length ? `${items.length}개의 버킷리스트 · 도형을 눌러 보세요` : '';
  $('empty').hidden = items.length > 0;
}

/* ---------- 글 보기 카드 ---------- */
function when(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${p(d.getHours())}:${p(d.getMinutes())}`;
}
function showCard(p) {
  const s = $('cardShape');
  s.className = `card-shape ${p.it.shape}` + (p.it.shape === 'triangle' ? ` t${p.turn}` : '');
  s.style.setProperty('--col', col(p.it.color));
  $('cardText').textContent = p.it.text; // 글자로만 넣음 (태그가 섞여 있어도 실행되지 않게)
  $('cardMeta').textContent = [p.it.name, when(p.it.at)].filter(Boolean).join(' · ');
  $('card').hidden = false;
}
$('card').onclick = () => { $('card').hidden = true; };

/* ---------- 불러오기 ---------- */
async function load() {
  const r = await fetch(API);
  if (!r.ok) throw new Error(r.status);
  return r.json();
}
async function refresh(first = false) {
  try {
    const d = await load();
    if (!d.enabled) { $('note').textContent = '지금은 글을 저장할 수 없어요. 잠시 후 다시 열어 주세요.'; return; }
    // 방금 내가 쓴 글이 아직 목록에 안 나왔으면 (몇 초 늦을 수 있음) 그대로 둠
    const got = new Set(d.items.map((x) => x.id));
    const pending = items.filter((x) => !got.has(x.id) && mine.includes(x.id));
    items = [...d.items].reverse().concat(pending);
    render();
  } catch {
    if (first) $('note').textContent = '글을 불러오지 못했어요. 새로고침해 주세요.';
  }
}
// 새 글 확인 (화면을 보고 있을 때만)
setInterval(() => { if (!document.hidden && $('sheet').hidden) refresh(); }, 30_000);

/* ---------- 쓰기 화면 ---------- */
const form = $('write'), text = $('text'), name = $('name'), sendBtn = $('send'), msg = $('msg');
let pick = { color: null, shape: null };

// 색 6개, 모양 3개 버튼 만들기
COLOR_NAMES.forEach((label, i) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.setAttribute('role', 'radio');
  b.setAttribute('aria-checked', 'false');
  b.setAttribute('aria-label', label);
  b.style.setProperty('--col', col(i));
  b.onclick = () => { pick.color = i; update(); };
  $('colors').append(b);
});
const SHAPE_NAMES = { square: '네모', triangle: '세모', circle: '동그라미' };
SHAPES.forEach((s) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = s;
  b.setAttribute('role', 'radio');
  b.setAttribute('aria-checked', 'false');
  b.setAttribute('aria-label', SHAPE_NAMES[s]);
  b.append(document.createElement('i'));
  b.onclick = () => { pick.shape = s; update(); };
  $('shapes').append(b);
});

function update() {
  if (text.value.includes('\n')) text.value = text.value.replace(/\n+/g, ' '); // 한 줄짜리 글
  $('len').textContent = `${text.value.length}/${MAX}`;
  [...$('colors').children].forEach((b, i) => b.setAttribute('aria-checked', String(pick.color === i)));
  [...$('shapes').children].forEach((b, i) => {
    b.setAttribute('aria-checked', String(pick.shape === SHAPES[i]));
    // 색을 먼저 고르면 모양들이 그 색으로 보임
    if (pick.color !== null) b.style.setProperty('--col', col(pick.color)); else b.style.removeProperty('--col');
  });
  const ready = pick.color !== null && pick.shape && text.value.trim();
  sendBtn.disabled = !ready;
  sendBtn.textContent = pick.color === null || !pick.shape ? '색과 모양을 골라 주세요' : '남기기';
}
text.addEventListener('input', update);
text.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); form.requestSubmit(); }
});

function say(t, bad = false) {
  msg.textContent = t;
  msg.classList.toggle('bad', bad);
}
$('open').onclick = () => { $('sheet').hidden = false; say(''); update(); };
$('close').onclick = () => { $('sheet').hidden = true; };

const ERRORS = {
  bad_word: '고운 말로 다시 써 주세요 🙂',
  too_fast: '조금 뒤에 다시 남겨 주세요.',
  empty: '버킷리스트를 적어 주세요.',
  input: '색과 모양을 골라 주세요.',
  no_store: '지금은 글을 저장할 수 없어요.',
};

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (sendBtn.disabled) return;
  sendBtn.disabled = true;
  say('남기는 중…');
  try {
    const r = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text.value, name: name.value, shape: pick.shape, color: pick.color }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) {
      say(ERRORS[d.error] || '남기지 못했어요. 다시 시도해 주세요.', true);
      sendBtn.disabled = false;
      return;
    }
    rememberMine(d.item.id);
    items.push(d.item);
    text.value = '';
    pick = { color: null, shape: null };
    update();
    $('sheet').hidden = true;
    render();
    // 내 도형이 있는 곳으로 내려가서 보여 줌
    const el = piecesEl.querySelector(`[data-id="${d.item.id}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch {
    say('인터넷 연결을 확인해 주세요.', true);
    sendBtn.disabled = false;
  }
});

update();
refresh(true);
