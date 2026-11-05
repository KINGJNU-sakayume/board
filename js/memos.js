// 승인된 Claude 메모를 받아 보드 문서에 저장하고 receipt 를 보낸다 (life-hub docs/P7_BOARD.md 7장).
// 메모는 Claude 대화 카드에서만 승인된다. 보드는 승인 버튼이 없고, 대기 중이거나 거절된 메모는 받지 않는다.
// 순서: 승인된 메모 받기 → 문서에 넣어 Hub 에 저장(실패하면 여기서 멈춤) → receipt. receipt 가 실패해도
// 다음 새로고침에 그 메모가 다시 '승인됨'으로 오고, 이미 저장돼 있으니 receipt 만 다시 보낸다.
import { inboxRequest, HubError } from './hub.js';

const entityId = (key) => ('memo-' + key.replace(/[^A-Za-z0-9_-]/g, '_')).slice(0, 128);

export async function syncMemos(doc) {
  const r = await inboxRequest('GET', '/candidates?status=approved&limit=20');
  if (!r.ok) throw new HubError('server', `메모를 받지 못했어요 (${r.status})`);
  const body = await r.json().catch(() => null);
  const list = body && Array.isArray(body.candidates) ? body.candidates : [];
  const fresh = [];
  for (const c of list) {
    const cand = (c && (c.final_candidate || c.candidate)) || null;
    const text = cand && cand.candidate_type === 'memo' && cand.payload ? cand.payload.text : null;
    if (typeof c.key !== 'string' || typeof text !== 'string' || !text.trim() || text.length > 160) continue;
    if (!doc.hasMemo(c.key)) fresh.push({ key: c.key, text, approved_at: typeof c.approved_at === 'string' ? c.approved_at : new Date().toISOString() });
  }
  if (fresh.length) await doc.addMemos(fresh);          // 저장이 끝나야 receipt
  let sent = 0;
  for (const c of list) {
    if (typeof c.key !== 'string' || !doc.hasMemo(c.key)) continue;
    const rr = await inboxRequest('POST', '/receipts', { key: c.key, entity_type: 'memo', entity_id: entityId(c.key) });
    if (rr.ok) sent++;
  }
  return { fresh: fresh.length, sent };
}
