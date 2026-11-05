// 보드 시작점: 그룹을 만들고, 보드 자체 위젯과 앱 타일을 불러와 그리고, 편집 모드를 붙인다.
import { CONFIG, groupOfApp } from './config.js';
import { validateManifest, validateTile } from './schema.js';
import { renderBody, renderDetail, h } from './render.js';
import { watch, PHONE } from './layout.js';
import { initEdit } from './edit.js';
import { WIDGETS, widgetDef, settingsOf, saveSettings } from './widgets.js';
import { applyAccent } from './accent.js';
import { setupFaces } from './faces.js';
import { connectAvailable, isConnected, beginConnect, completeStoredCallback, fetchTiles, disconnect, HubError } from './hub.js';

const $ = (s, r) => (r || document).querySelector(s);
const policy = { imageOrigins: CONFIG.imageOrigins, linkOrigins: CONFIG.linkOrigins };
const page = $('#page'), sc = $('#scroller'), track = $('#track'), tray = $('#tray'), live = $('#live'), statusEl = $('#status');
const detailDlg = $('#detailDlg'), setDlg = $('#setDlg');
const pad2 = (n) => String(n).padStart(2, '0');
const tiles = new Map();          // 'app:id' → 타일 요소
let edit = null, problems = [];

/* ---------- 그룹 ---------- */
for (const g of CONFIG.groups) {
  track.append(h('section', { class: 'grp', id: 'g-' + g.id, 'aria-labelledby': 'gh-' + g.id },
    h('h2', { id: 'gh-' + g.id, text: g.name }),
    h('div', { class: 'grid', 'data-group': g.id })));
}

/* ---------- 타일 그리기 ---------- */
const appName = (def) => CONFIG.appNames[def.__app] || def.__app;
const ctx = {
  canPropose: false,                  // Hub 보드 API(제안 보내기)가 생기기 전까지는 닫혀 있다
  appName,
  action(def) {
    if (def.__widget) return { kind: 'button', run: () => openSettings(def.__widget) };
    if (def.detail) return { kind: 'button', run: () => openDetail(def) };
    if (def.href) return { kind: 'link', href: def.href };
    return null;
  },
};

function fill(t, def) {
  [...t.children].forEach((c) => { if (!c.classList.contains('rm') && !c.classList.contains('rz')) c.remove(); });
  const nodes = renderBody(def, ctx);
  t.prepend(...nodes.filter(Boolean));
  t.__def = def;
  applyAccent(t, def);
  if (def.tone === 'sleeve' && def.data.list) setupFaces(t, () => edit && edit.isEditing());
  else t.removeAttribute('data-faces');
  // Hub 가 받은 지 오래된 앱 목록: 실제 나이를 붙여 '오래됨'으로 표시한다(값을 지우거나 꾸미지 않는다)
  if (def.__staleDays) t.prepend(h('span', { class: 'staleb', text: `오래됨 · ${def.__staleDays}일 전` }));
  t.toggleAttribute('data-stale', !!def.__staleDays);
}

function makeTile(def) {
  const key = def.__app + ':' + def.id;
  const t = h('article', {
    class: 'w', 'data-id': key, 'data-app': def.__app, 'data-name': def.name, 'data-tone': def.tone, 'data-form': def.form,
    'data-size': def.size, 'data-sizes': def.sizes.join(' '), 'data-home': groupOfApp(def.__app),
  });
  fill(t, def);
  tiles.set(key, t);
  return t;
}

/** 새로 그리거나(처음) 내용만 바꾼다(새로고침). 사라진 타일은 지운다. */
function sync(app, defs, first) {
  const keep = new Set();
  for (const def of defs) {
    def.__app = app; const key = app + ':' + def.id; keep.add(key);
    const old = tiles.get(key);
    if (old) {
      if (old.dataset.sizes !== def.sizes.join(' ')) { old.dataset.sizes = def.sizes.join(' '); if (!def.sizes.includes(old.dataset.size)) edit.applySize(old, def.size); }
      fill(old, def); continue;
    }
    const t = makeTile(def);
    (def.show ? $('.grid[data-group="' + t.dataset.home + '"]') : tray).appendChild(t);
    if (!first && edit) edit.attach(t);
  }
  for (const [key, t] of tiles) if (key.startsWith(app + ':') && !keep.has(key)) { t.remove(); tiles.delete(key); }
}

/* ---------- 보드 자체 위젯 ---------- */
async function loadWidgets(first) {
  const defs = [];
  for (const w of WIDGETS) {
    const raw = await widgetDef(w);
    try {
      const v = validateTile(raw, 'board.' + w.id, policy);
      v.__widget = raw.__needsSetup ? w : null;
      if (!raw.__needsSetup) v.__widgetSettings = w;
      defs.push(v);
    } catch (e) { problems.push('보드 위젯 ' + w.id + ': ' + e.message); }
  }
  sync('board', defs, first);
}

/* ---------- 앱 타일 ----------
   연결 전: 예시 데이터. 연결 후: Life Hub 의 /board/v1/tiles.
   연결이 끊기면(토큰 거부) 앱 타일을 비운다. 실제 연결을 쓰던 화면에 지어낸 예시를 다시 보여주지 않기 위해서다.
   네트워크가 안 되면 이번 세션에 마지막으로 받은 타일을 그대로 두고 '오프라인'으로 표시한다. */
const hub = { mode: 'sample', message: '', lastOkAt: null, lost: false };
const appTiles = new Set();   // 지금 그려진 앱(보드 위젯 제외)

function applyManifests(manifests, first, real) {
  const present = new Set();
  for (const m of manifests) {
    const v = validateManifest(m, policy);
    v.errors.forEach((er) => problems.push(`${m && m.app}: ${er.id ? er.id + ' — ' : ''}${er.message}`));
    if (!v.ok || v.app === 'board') continue;
    let staleDays = 0;
    if (real && typeof m.received_at === 'string') {
      const age = (Date.now() - Date.parse(m.received_at)) / 864e5;
      if (age > CONFIG.staleDays) staleDays = Math.floor(age);
    }
    v.tiles.forEach((t) => { t.__staleDays = staleDays; });
    sync(v.app, v.tiles, first);
    present.add(v.app);
  }
  for (const app of appTiles) if (!present.has(app)) sync(app, [], first);
  appTiles.clear(); present.forEach((a) => appTiles.add(a));
}

async function loadApps(first) {
  if (isConnected()) {
    try {
      const body = await fetchTiles();
      applyManifests(body.manifests, first, true);
      Object.assign(hub, { mode: 'hub', message: '', lastOkAt: new Date(), lost: false });
    } catch (e) {
      if (e instanceof HubError && e.kind === 'not_connected') { Object.assign(hub, { mode: 'lost', message: e.message, lost: true }); applyManifests([], first, true); }
      else Object.assign(hub, { mode: 'offline', message: e.message });
    }
    return;
  }
  if (hub.lost) { applyManifests([], first, true); return; }
  hub.mode = 'sample';
  let pack;
  try {
    const r = await fetch('data/sample-tiles.json', { cache: 'no-store' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    pack = await r.json();
  } catch (e) { problems.push('예시 데이터를 읽지 못했어요 (' + e.message + ')'); return; }
  applyManifests(pack.manifests || [], first, false);
}

async function connectHub() {
  try { location.assign(await beginConnect()); } catch (e) { hub.message = '연결을 시작하지 못했어요.'; showStatus(); }
}

/* ---------- 상세 · 설정 대화상자 ---------- */
function openDetail(def) {
  detailDlg.replaceChildren(...renderDetail(def, ctx).filter(Boolean));
  if (def.accent) { detailDlg.style.setProperty('--h', def.accent.h); detailDlg.style.setProperty('--s', def.accent.s); }
  detailDlg.querySelector('[data-close]').addEventListener('click', () => detailDlg.close());
  detailDlg.showModal();
}

function openSettings(w) {
  const s = { ...settingsOf(w.id) };
  const form = h('form', { method: 'dialog', class: 'setform' });
  const inputs = {};
  for (const f of w.fields) {
    const id = 'f-' + w.id + '-' + f.key;
    const input = f.type === 'textarea'
      ? h('textarea', { id, rows: 6, placeholder: f.hint || '' })
      : h('input', { id, type: f.type, step: f.step, inputmode: f.type === 'number' ? 'decimal' : null, placeholder: f.type === 'text' ? (f.hint || '') : null });
    input.value = s[f.key] ?? '';
    inputs[f.key] = input;
    form.append(h('label', { for: id, text: f.label }), input, f.hint && f.type !== 'text' && f.type !== 'textarea' ? h('span', { class: 'sub', text: f.hint }) : null);
  }
  const msg = h('p', { class: 'sub', role: 'status' });
  const locate = w.locate && navigator.geolocation ? h('button', { class: 'act soft', type: 'button', text: '현재 위치로 채우기' }) : null;
  if (locate) locate.addEventListener('click', () => {
    msg.textContent = '위치를 확인하는 중…';
    navigator.geolocation.getCurrentPosition((p) => {
      inputs.lat.value = p.coords.latitude.toFixed(3); inputs.lon.value = p.coords.longitude.toFixed(3);
      if (!inputs.place.value) inputs.place.value = '현재 위치';
      msg.textContent = '';
    }, () => { msg.textContent = '위치를 가져오지 못했어요. 지역 이름이나 좌표를 직접 넣어 주세요.'; }, { timeout: 10000, maximumAge: 600000 });
  });
  const save = h('button', { class: 'act', type: 'submit', text: '저장' });
  const close = h('button', { class: 'act soft', type: 'button', text: '닫기' });
  close.addEventListener('click', () => setDlg.close());
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const next = {};
    for (const f of w.fields) next[f.key] = inputs[f.key].value.trim();
    try { if (w.prepare) await w.prepare(next); } catch (er) { msg.textContent = er.message; return; }
    if (!saveSettings(w.id, next)) { msg.textContent = '이 브라우저에 저장하지 못했어요.'; return; }
    setDlg.close(); await refresh(false);
  });
  form.append(msg, h('div', { class: 'flex ac mt8' }, save, locate, close));
  setDlg.replaceChildren(h('div', { class: 'hd' }, h('h2', { text: w.name + ' 설정' })), h('p', { class: 'sub mt6', text: '이 브라우저에만 저장돼요.' }), form);
  setDlg.showModal();
}

/* ---------- 상태 줄 · 새로고침 ---------- */
let lastAt = null;
const hm = (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
function showStatus() {
  const src = { sample: '예시 데이터', hub: 'Life Hub', offline: '오프라인', lost: 'Life Hub 연결 끊김' }[hub.mode];
  const when = hub.mode === 'offline' ? (hub.lastOkAt ? `마지막 ${hm(hub.lastOkAt)}` : '') : lastAt ? `${hm(lastAt)} 갱신` : '';
  const parts = [src, when, problems.length ? `확인할 것 ${problems.length}개` : null, PHONE.matches ? '길게 누르면 편집' : '길게 누르거나 우클릭하면 편집'].filter(Boolean);
  const kids = [document.createTextNode(parts.join(' · '))];
  // 연결 동작은 상태 줄의 글자 단추 하나뿐이다(상시 버튼을 늘리지 않음). 실제 주소에서 열렸을 때만.
  if (connectAvailable() && (hub.mode === 'sample' || hub.mode === 'lost')) {
    kids.push(document.createTextNode(' · '), h('button', { class: 'slink', type: 'button', text: hub.mode === 'lost' ? '다시 연결' : 'Life Hub에 연결', onclick: connectHub }));
  }
  statusEl.replaceChildren(...kids);
  statusEl.title = [hub.message, ...problems].filter(Boolean).join('\n');
  $('#disconnectBtn').hidden = !isConnected();
}
async function refresh(first) {
  problems = [];
  await loadWidgets(first);
  await loadApps(first);
  if (problems.length) console.warn('[board]', problems);
  lastAt = new Date(); showStatus();
  if (edit) edit.refreshEmpty();
}
$('#disconnectBtn').addEventListener('click', async () => {
  disconnect(); hub.lost = false; hub.message = 'Life Hub 연결을 해제했어요.';
  $('#addDlg').close(); await refresh(false);
});

/* ---------- 시작 ---------- */
(async function start() {
  try { if (await completeStoredCallback()) hub.message = 'Life Hub에 연결했어요.'; }
  catch (e) { hub.message = e.message; }
  await refresh(true);
  edit = initEdit({
    page, sc, tray, live, groups: CONFIG.groups, key: 'board.layout.v1',
    menuExtra: (t) => {
      const def = t.__def; const w = def && (def.__widget || def.__widgetSettings);
      return w ? [{ label: '위젯 설정', icon: '⚙', run: () => openSettings(w) }] : [];
    },
  });
  document.querySelectorAll('.w').forEach((t) => edit.attach(t));
  edit.start();
  watch(sc, edge);
  setInterval(() => { if (!document.hidden && !edit.isEditing()) refresh(false); }, CONFIG.refreshMs);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && lastAt && Date.now() - lastAt > CONFIG.refreshMs) refresh(false); });
})();

/* ---------- 가로 스크롤 (PC): 세로 휠을 가로로, 끝에 닿으면 오른쪽 흐림을 없앤다 ---------- */
function edge() { if (sc.scrollLeft + sc.clientWidth >= sc.scrollWidth - 4) sc.setAttribute('data-end', ''); else sc.removeAttribute('data-end'); }
sc.addEventListener('scroll', edge, { passive: true });
sc.addEventListener('wheel', (e) => {
  if (PHONE.matches || e.ctrlKey) return;
  if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { sc.scrollLeft += e.deltaY; e.preventDefault(); }
}, { passive: false });
