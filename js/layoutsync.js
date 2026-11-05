// 보드 문서를 기기 간에 맞춘다 (life-hub docs/P7_BOARD.md 6.3·7장, P6 동기화 API).
// 문서: { app: 'board', version: 1, layout: <edit.js 의 snapshot>, memos: [{ key, text, approved_at }] }
// 배치 규칙: 시작·새로고침 때 Hub 의 더 새 버전이 있고 이 브라우저에 올릴 변경이 없으면 Hub 배치를 적용한다.
//   편집이 끝나면(2초 모아서) 올린다. 412(다른 기기가 먼저 씀)면 최신 문서를 받아 메모는 합치고,
//   배치는 이 브라우저의 마지막 편집으로 다시 쓴다(배치는 기록이 아니라 한 사람의 정리라서 방금 한 편집이 이긴다).
// 메모 규칙: 승인된 Claude 메모. 기기 사이에서는 key 로 합집합, 최신 20개만 둔다. 지우는 동작은 없다.
import { syncRequest, isConnected, HubError } from './hub.js';

const VERSION_KEY = 'board.layout.remote-version.v1';   // 이 브라우저가 마지막으로 맞춘 Hub 버전
const DEBOUNCE_MS = 2000;
export const MEMO_KEEP = 20;

const validMemo = (m) => m && typeof m.key === 'string' && m.key.length <= 200 && typeof m.text === 'string' &&
  m.text.length >= 1 && m.text.length <= 160 && typeof m.approved_at === 'string' && !Number.isNaN(Date.parse(m.approved_at));
export function mergeMemos(a, b) {
  const by = new Map();
  for (const m of [...(a || []), ...(b || [])]) if (validMemo(m) && !by.has(m.key)) by.set(m.key, { key: m.key, text: m.text, approved_at: m.approved_at });
  return [...by.values()].sort((x, y) => (x.approved_at < y.approved_at ? 1 : x.approved_at > y.approved_at ? -1 : 0)).slice(0, MEMO_KEEP);
}

export function initLayoutSync({ snapshot, applyRemote, onStatus, onMemos }) {
  let known = (() => { try { return Number(localStorage.getItem(VERSION_KEY)) || 0; } catch { return 0; } })();
  let dirty = false, timer = null, busy = null, memos = [];
  const state = { status: 'off', message: '' };   // off | ok | no_scope | error
  const setKnown = (v) => { known = v; try { localStorage.setItem(VERSION_KEY, String(v)); } catch { /* 없음 */ } };
  const report = (status, message = '') => { state.status = status; state.message = message; onStatus && onStatus(state); };
  const setMemos = (list) => {
    const next = mergeMemos(list, []);
    if (JSON.stringify(next) !== JSON.stringify(memos)) { memos = next; onMemos && onMemos(memos); }
  };
  const fail = (e) => {
    if (e instanceof HubError && e.kind === 'no_sync_scope') report('no_scope', e.message);
    else if (e instanceof HubError && e.kind === 'not_connected') report('off', e.message);
    else report('error', e && e.message ? e.message : '배치를 맞추지 못했어요.');
  };
  const doc = () => JSON.stringify({ app: 'board', version: 1, layout: snapshot(), ...(memos.length ? { memos } : {}) });

  async function push(retry = true) {
    const headers = known ? { 'If-Match': `"${known}"` } : { 'If-None-Match': '*' };
    const r = await syncRequest('PUT', '', { body: doc(), headers });
    if (r.status === 200) { const m = await r.json(); setKnown(m.version); dirty = false; report('ok'); return; }
    if (r.status === 412 && retry) {
      // 다른 기기가 먼저 썼다: 최신 문서의 메모를 합친 뒤, 그 버전 위에 다시 쓴다
      const g = await syncRequest('GET');
      if (g.status === 200) {
        const m = await g.json();
        if (m.doc && m.doc.app === 'board') setMemos(mergeMemos(memos, m.doc.memos));
        setKnown(m.version);
      } else setKnown(0);
      return push(false);
    }
    throw new HubError('server', `배치를 올리지 못했어요 (${r.status})`);
  }

  async function pull() {
    const r = await syncRequest('GET');
    if (r.status === 404) { setKnown(0); await push(); return; }   // Hub 에 아직 없음: 이 브라우저 배치로 시작
    if (r.status !== 200) throw new HubError('server', `배치를 받지 못했어요 (${r.status})`);
    const m = await r.json();
    if (m.doc && m.doc.app === 'board') {
      setMemos(mergeMemos(memos, m.doc.memos));
      if (m.version !== known && !dirty) {
        if (applyRemote(m.doc.layout)) setKnown(m.version);       // 편집 중이면 적용하지 않고 다음에
      }
    }
    if (dirty) await push();
    report('ok');
  }

  const run = (fn) => {
    if (!isConnected()) { report('off'); return Promise.resolve(); }
    const next = (busy || Promise.resolve()).then(fn);
    busy = next.catch(fail);
    return next;
  };
  return {
    state,
    memos: () => memos,
    hasMemo: (key) => memos.some((m) => m.key === key),
    /** 새로고침 때: Hub 쪽 변화 받기 (이 브라우저에 올릴 변경이 있으면 올리기). 실패는 상태로만 알린다. */
    pull: () => run(pull).catch(() => undefined),
    /** 편집 모드에서 배치가 바뀔 때마다 */
    changed() {
      if (!isConnected()) return;
      dirty = true; clearTimeout(timer);
      timer = setTimeout(() => run(push).catch(() => undefined), DEBOUNCE_MS);
    },
    /** 승인된 메모를 문서에 넣고 바로 올린다. 올리기에 실패하면 던진다(그러면 receipt 를 보내지 않는다). */
    addMemos(list) {
      return run(async () => { setMemos(mergeMemos(list, memos)); dirty = true; await push(); });
    },
    /** 연결을 해제했을 때 */
    reset() { clearTimeout(timer); dirty = false; setKnown(0); report('off'); },
  };
}
