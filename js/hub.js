// Life Board ↔ Life Hub 연결 (life-hub docs/P7_BOARD.md 6장).
// OAuth 2.1 인가 코드 + PKCE(S256). 보드는 공개 클라이언트이고 lifehub-client.json 이 신원이다.
// 권한은 board:read 하나: 앱들이 올린 타일 목록과 승인 대기 제안 개수를 읽기만 한다.
// 토큰만 localStorage 에 둔다. 타일 내용은 메모리에만 두고 저장하지 않는다.
import { CONFIG } from './config.js';

const HUB = CONFIG.hub.origin;
const APP_URL = CONFIG.hub.appUrl;
export const CALLBACK_URL = APP_URL + 'lifehub/';
export const CLIENT_ID = APP_URL + 'lifehub-client.json';
const RESOURCE = HUB + '/board';
const TOKENS_KEY = 'board.lifehub.tokens.v1';
const PENDING_KEY = 'board.lifehub.pending-auth.v1';
export const CALLBACK_KEY = 'board.lifehub.callback.v1';   // lifehub/index.html 이 쓴다
const AUTH_MAX_AGE_MS = 10 * 60 * 1000;
const TIMEOUT_MS = 20000;

export class HubError extends Error {
  /** kind: not_connected | denied | state | network | server */
  constructor(kind, message) { super(message); this.kind = kind; }
}

const readJson = (store, key) => { try { const raw = store.getItem(key); return raw ? JSON.parse(raw) : null; } catch { return null; } };
const b64url = (bytes) => { let s = ''; for (const b of bytes) s += String.fromCharCode(b); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const signal = () => (typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal ? AbortSignal.timeout(TIMEOUT_MS) : undefined);

/** 보드가 실제 주소(GitHub Pages)에서 열렸을 때만 연결할 수 있다. 로컬 개발은 예시 모드. */
export function connectAvailable(loc = location) {
  const app = new URL(APP_URL);
  return loc.origin === app.origin && loc.pathname.startsWith(app.pathname);
}
export function isConnected() { return typeof readJson(localStorage, TOKENS_KEY)?.refresh_token === 'string'; }

export async function beginConnect() {
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(32)));
  const state = b64url(crypto.getRandomValues(new Uint8Array(16)));
  const challenge = b64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))));
  sessionStorage.setItem(PENDING_KEY, JSON.stringify({ state, verifier, created_at: Date.now() }));
  const q = new URLSearchParams({
    response_type: 'code', client_id: CLIENT_ID, redirect_uri: CALLBACK_URL, scope: CONFIG.hub.scope, state,
    code_challenge: challenge, code_challenge_method: 'S256', resource: RESOURCE,
  });
  return HUB + '/authorize?' + q.toString();
}

async function tokenRequest(params) {
  let r;
  try {
    r = await fetch(HUB + '/oauth/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: CLIENT_ID, ...params }).toString(), signal: signal(),
    });
  } catch { throw new HubError('network', 'Life Hub에 연결할 수 없어요.'); }
  const body = await r.json().catch(() => ({}));
  if (!r.ok) {
    if (body.error === 'invalid_grant') { localStorage.removeItem(TOKENS_KEY); throw new HubError('not_connected', 'Life Hub 연결이 끝났어요. 다시 연결해 주세요.'); }
    throw new HubError('server', `Life Hub 인증 서버 오류 (${r.status})`);
  }
  if (typeof body.access_token !== 'string' || typeof body.refresh_token !== 'string' || String(body.token_type).toLowerCase() !== 'bearer')
    throw new HubError('server', 'Life Hub 응답 형식이 올바르지 않아요.');
  const tokens = {
    access_token: body.access_token, refresh_token: body.refresh_token,
    access_expires_at: Date.now() + (typeof body.expires_in === 'number' ? body.expires_in : 300) * 1000,
  };
  try { localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens)); } catch { throw new HubError('server', '이 브라우저에 연결 정보를 저장하지 못했어요.'); }
  return tokens;
}

/** 콜백 페이지가 이 탭에 남긴 결과로 연결을 마무리한다. 남긴 게 없으면 false. */
export async function completeStoredCallback() {
  let search = null;
  try { search = sessionStorage.getItem(CALLBACK_KEY); } catch { return false; }
  if (search === null) return false;
  sessionStorage.removeItem(CALLBACK_KEY);
  const q = new URLSearchParams(search);
  const pending = readJson(sessionStorage, PENDING_KEY);
  sessionStorage.removeItem(PENDING_KEY);
  if (!pending || q.get('state') !== pending.state || Date.now() - pending.created_at > AUTH_MAX_AGE_MS)
    throw new HubError('state', '연결 요청이 만료됐거나 이 브라우저에서 시작되지 않았어요. 다시 연결해 주세요.');
  if (q.has('iss') && q.get('iss') !== HUB) throw new HubError('state', '다른 서버의 응답이라 연결하지 않았어요.');
  if (q.has('error')) throw new HubError('denied', q.get('error') === 'access_denied' ? 'Life Hub 연결을 거절했어요.' : 'Life Hub 연결에 실패했어요.');
  const code = q.get('code');
  if (!code) throw new HubError('state', '인증 코드가 없어요.');
  await tokenRequest({ grant_type: 'authorization_code', code, redirect_uri: CALLBACK_URL, code_verifier: pending.verifier, resource: RESOURCE });
  return true;
}

async function accessToken(force = false) {
  const t = readJson(localStorage, TOKENS_KEY);
  if (!t?.refresh_token) throw new HubError('not_connected', 'Life Hub에 연결되어 있지 않아요.');
  if (!force && t.access_expires_at - 60000 > Date.now()) return t.access_token;
  return (await tokenRequest({ grant_type: 'refresh_token', refresh_token: t.refresh_token })).access_token;
}

/** GET /board/v1/tiles → { generated_at, manifests: [...] }. 401·403 이 남으면 연결을 버리고 not_connected. */
export async function fetchTiles() {
  const send = async (token) => {
    try { return await fetch(HUB + '/board/v1/tiles', { headers: { Authorization: 'Bearer ' + token }, cache: 'no-store', signal: signal() }); }
    catch { throw new HubError('network', 'Life Hub에 연결할 수 없어요.'); }
  };
  let r = await send(await accessToken());
  if (r.status === 401) r = await send(await accessToken(true));
  if (r.status === 401 || r.status === 403) { localStorage.removeItem(TOKENS_KEY); throw new HubError('not_connected', 'Life Hub 연결이 더 이상 유효하지 않아요. 다시 연결해 주세요.'); }
  if (!r.ok) throw new HubError('server', `Life Hub 오류 (${r.status})`);
  const body = await r.json().catch(() => null);
  if (!body || !Array.isArray(body.manifests)) throw new HubError('server', 'Life Hub 응답 형식이 올바르지 않아요.');
  return body;
}

/**
 * 배치 동기화 요청 (Life Hub /board/v1/sync, P6 동기화 API). fetchTiles 와 403 처리만 다르다:
 * 403 + insufficient_scope 는 B1 때 받은 연결이라 board:sync 가 없다는 뜻이므로 토큰을 지키고 no_sync_scope 를 던진다.
 */
export async function syncRequest(method, path = '', { body, headers = {} } = {}) {
  const send = async (token) => {
    try {
      return await fetch(HUB + '/board/v1/sync' + path, {
        method, cache: 'no-store', signal: signal(),
        headers: { Authorization: 'Bearer ' + token, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...headers },
        ...(body === undefined ? {} : { body }),
      });
    } catch { throw new HubError('network', 'Life Hub에 연결할 수 없어요.'); }
  };
  let r = await send(await accessToken());
  if (r.status === 401) r = await send(await accessToken(true));
  if (r.status === 403 && /error="?insufficient_scope"?/i.test(r.headers.get('WWW-Authenticate') ?? ''))
    throw new HubError('no_sync_scope', '이 연결에는 배치 동기화 권한이 없어요. 다시 연결해 주세요.');
  if (r.status === 401 || r.status === 403) { localStorage.removeItem(TOKENS_KEY); throw new HubError('not_connected', 'Life Hub 연결이 더 이상 유효하지 않아요. 다시 연결해 주세요.'); }
  return r;
}

/** 연결 해제: 이 브라우저의 토큰을 지우고 Life Hub 에 폐기를 알린다(실패해도 상관없음). */
export function disconnect() {
  const t = readJson(localStorage, TOKENS_KEY);
  localStorage.removeItem(TOKENS_KEY);
  if (t?.refresh_token) fetch(HUB + '/oauth/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ token: t.refresh_token, token_type_hint: 'refresh_token', client_id: CLIENT_ID }).toString(),
  }).catch(() => undefined);
}
