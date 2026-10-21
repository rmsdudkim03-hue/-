/* =========================================================
   서버 공통 도구 (Vercel 서버 함수에서 사용)
   - 저장소: Vercel Blob (Public). Vercel → Storage에서 만들어 프로젝트에 연결하면 열쇠가 자동으로 들어옴
   - 로컬 테스트: BLOB_LOCAL_DIR=폴더 로 저장소 대신 폴더에 저장
   ========================================================= */
import fs from 'node:fs';
import path from 'node:path';

/* ---------- 요청 처리 도우미 ---------- */
export async function readJSON(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}');
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

export function send(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}

/* ---------- 저장소 (Vercel Blob) ---------- */
let readyPromise = null;
export const store = {
  // 저장소 열쇠: 보통 BLOB_READ_WRITE_TOKEN인데, 연결할 때 이름 앞부분(prefix)을 바꾸면 '이름_READ_WRITE_TOKEN'이 됨
  get token() {
    const env = process.env;
    if (env.BLOB_READ_WRITE_TOKEN) return env.BLOB_READ_WRITE_TOKEN;
    const key = Object.keys(env).find((k) => /_READ_WRITE_TOKEN$/.test(k) && String(env[k]).startsWith('vercel_blob_'));
    return key ? env[key] : '';
  },
  get enabled() {
    return Boolean(store.token || process.env.BLOB_LOCAL_DIR || Object.keys(process.env).some((k) => /^BLOB_/.test(k)));
  },
  // 실제로 저장소를 쓸 수 있는지 (한 번 접속해 보고 되면 씀. 결과는 기억)
  async ready() {
    if (store.enabled) return true;
    readyPromise ??= (async () => {
      try {
        const { list } = await import('@vercel/blob');
        await list({ prefix: 'bucket/', limit: 1 });
        return true;
      } catch { return false; }
    })();
    return readyPromise;
  },
  get auth() { return store.token ? { token: store.token } : {}; },

  // 파일 하나 저장 → 주소 반환
  async put(pathname, body, contentType, overwrite = false) {
    const dir = process.env.BLOB_LOCAL_DIR;
    if (dir) {
      const file = path.join(dir, pathname);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, body);
      return `file://${file}`;
    }
    const { put } = await import('@vercel/blob');
    const r = await put(pathname, body, { access: 'public', contentType, addRandomSuffix: false, allowOverwrite: overwrite, ...store.auth });
    return r.url;
  },

  // 폴더 안 파일 목록 (이름순. 이름 앞에 '거꾸로 시간'을 붙여서 최신이 먼저 나옴)
  async list(prefix, limit) {
    const dir = process.env.BLOB_LOCAL_DIR;
    if (dir) {
      const folder = prefix.slice(0, prefix.lastIndexOf('/') + 1);
      const d = path.join(dir, folder);
      if (!fs.existsSync(d)) return [];
      return fs.readdirSync(d).map((f) => folder + f).filter((p) => p.startsWith(prefix)).sort().slice(0, limit)
        .map((p) => ({ pathname: p, url: `file://${path.join(dir, p)}` }));
    }
    const { list } = await import('@vercel/blob');
    const r = await list({ prefix, limit, ...store.auth });
    return r.blobs.sort((a, b) => a.pathname.localeCompare(b.pathname));
  },

  // 폴더 안 파일 목록을 쪽(page) 단위로 { blobs, cursor } (cursor가 있으면 다음 쪽이 더 있음)
  async page(prefix, limit, cursor) {
    const dir = process.env.BLOB_LOCAL_DIR;
    if (dir) {
      const all = await store.list(prefix, Infinity);
      const from = Number(cursor) || 0;
      return { blobs: all.slice(from, from + limit), cursor: from + limit < all.length ? String(from + limit) : null };
    }
    const { list } = await import('@vercel/blob');
    const r = await list({ prefix, limit, ...(cursor ? { cursor } : {}), ...store.auth });
    return { blobs: r.blobs.sort((a, b) => a.pathname.localeCompare(b.pathname)), cursor: r.hasMore ? r.cursor : null };
  },

  // 파일 지우기 (주소로)
  async del(url) {
    if (url.startsWith('file://')) return fs.rmSync(url.slice(7), { force: true });
    const { del } = await import('@vercel/blob');
    await del(url, store.auth);
  },

  // 저장한 JSON 읽기
  async readJSON(url) {
    if (url.startsWith('file://')) return JSON.parse(fs.readFileSync(url.slice(7), 'utf8'));
    const r = await fetch(url);
    if (!r.ok) throw new Error(`blob ${r.status}`);
    return r.json();
  },
};

// 최신이 먼저 오도록 하는 파일 이름 (거꾸로 시간 + 임의 글자)
export function newKey() {
  const rev = String(9_999_999_999_999 - Date.now()).padStart(13, '0');
  return `${rev}-${Math.random().toString(36).slice(2, 8)}`;
}
