// 보드 배치를 기기 간에 맞춘다 (life-hub docs/P7_BOARD.md 6.3, P6 동기화 API).
// 문서: { app: 'board', version: 1, layout: <edit.js 의 snapshot> }
// 규칙: 시작·새로고침 때 Hub 의 더 새 버전이 있고 이 브라우저에 올릴 변경이 없으면 Hub 배치를 적용한다.
//       편집이 끝나면(2초 모아서) 올린다. 412(다른 기기가 먼저 씀)면 최신 버전 위에 이 브라우저의 마지막 편집을 다시 쓴다.
//       배치는 기록이 아니라 한 사람의 정리라서, 방금 한 편집이 이긴다.
import { syncRequest, isConnected, HubError } from './hub.js';

const VERSION_KEY = 'board.layout.remote-version.v1';   // 이 브라우저가 마지막으로 맞춘 Hub 버전
const DEBOUNCE_MS = 2000;

export function initLayoutSync({ snapshot, applyRemote, onStatus }) {
  let known = (() => { try { return Number(localStorage.getItem(VERSION_KEY)) || 0; } catch { return 0; } })();
  let dirty = false, timer = null, busy = null;
  const state = { status: 'off', message: '' };   // off | ok | no_scope | error
  const setKnown = (v) => { known = v; try { localStorage.setItem(VERSION_KEY, String(v)); } catch { /* 없음 */ } };
  const report = (status, message = '') => { state.status = status; state.message = message; onStatus && onStatus(state); };
  const fail = (e) => {
    if (e instanceof HubError && e.kind === 'no_sync_scope') report('no_scope', e.message);
    else if (e instanceof HubError && e.kind === 'not_connected') report('off', e.message);
    else report('error', e && e.message ? e.message : '배치를 맞추지 못했어요.');
  };
  const doc = () => JSON.stringify({ app: 'board', version: 1, layout: snapshot() });

  async function push(retry = true) {
    const headers = known ? { 'If-Match': `"${known}"` } : { 'If-None-Match': '*' };
    const r = await syncRequest('PUT', '', { body: doc(), headers });
    if (r.status === 200) { const m = await r.json(); setKnown(m.version); dirty = false; report('ok'); return; }
    if (r.status === 412 && retry) {
      const b = await r.json().catch(() => ({}));
      setKnown(b && b.current && Number.isInteger(b.current.version) ? b.current.version : 0);
      return push(false);
    }
    throw new HubError('server', `배치를 올리지 못했어요 (${r.status})`);
  }

  async function pull() {
    const r = await syncRequest('GET');
    if (r.status === 404) { setKnown(0); await push(); return; }   // Hub 에 아직 없음: 이 브라우저 배치로 시작
    if (r.status !== 200) throw new HubError('server', `배치를 받지 못했어요 (${r.status})`);
    const m = await r.json();
    if (m.version !== known && !dirty && m.doc && m.doc.app === 'board') {
      if (applyRemote(m.doc.layout)) setKnown(m.version);       // 편집 중이면 적용하지 않고 다음에
    }
    if (dirty) await push();
    report('ok');
  }

  const run = (fn) => {
    if (!isConnected()) { report('off'); return Promise.resolve(); }
    busy = (busy || Promise.resolve()).then(fn).catch(fail);
    return busy;
  };
  return {
    state,
    /** 새로고침 때: Hub 쪽 변화 받기 (이 브라우저에 올릴 변경이 있으면 올리기) */
    pull: () => run(pull),
    /** 편집 모드에서 배치가 바뀔 때마다 */
    changed() {
      if (!isConnected()) return;
      dirty = true; clearTimeout(timer);
      timer = setTimeout(() => run(push), DEBOUNCE_MS);
    },
    /** 연결을 해제했을 때 */
    reset() { clearTimeout(timer); dirty = false; setKnown(0); report('off'); },
  };
}
