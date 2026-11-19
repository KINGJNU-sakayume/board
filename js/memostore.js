// 승인된 Claude 메모를 이 브라우저에 보관한다 (life-hub docs/P7_BOARD.md 7장).
// 배치는 Hub 에 올리지 않는다(배치 동기화 없음). 메모만 key 로 중복을 없애 최신 20개를 localStorage 에 둔다.
// 지우는 동작은 없고, Hub 연결을 해제하면 이 브라우저의 메모도 비운다.
const KEY = 'board.memos.v1';
export const MEMO_KEEP = 20;

const validMemo = (m) => m && typeof m.key === 'string' && m.key.length <= 200 && typeof m.text === 'string' &&
  m.text.length >= 1 && m.text.length <= 160 && typeof m.approved_at === 'string' && !Number.isNaN(Date.parse(m.approved_at));
export function mergeMemos(a, b) {
  const by = new Map();
  for (const m of [...(a || []), ...(b || [])]) if (validMemo(m) && !by.has(m.key)) by.set(m.key, { key: m.key, text: m.text, approved_at: m.approved_at });
  return [...by.values()].sort((x, y) => (x.approved_at < y.approved_at ? 1 : x.approved_at > y.approved_at ? -1 : 0)).slice(0, MEMO_KEEP);
}

export function initMemoStore({ onMemos } = {}) {
  let memos = [];
  try { memos = mergeMemos(JSON.parse(localStorage.getItem(KEY) || '[]'), []); } catch { memos = []; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(memos)); return true; } catch { return false; } };
  return {
    memos: () => memos,
    hasMemo: (key) => memos.some((m) => m.key === key),
    /** 메모를 합쳐 저장한다. 저장하지 못하면 던진다(그러면 receipt 를 보내지 않는다). */
    addMemos(list) {
      const next = mergeMemos(list, memos);
      const before = memos; memos = next;
      if (!save()) { memos = before; throw new Error('이 브라우저에 메모를 저장하지 못했어요.'); }
      onMemos && onMemos(memos);
      return Promise.resolve();
    },
    /** 연결을 해제했을 때 */
    reset() { memos = []; try { localStorage.removeItem(KEY); } catch { /* 없음 */ } onMemos && onMemos(memos); },
  };
}
