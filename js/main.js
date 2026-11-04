// 보드 시작점: 그룹을 만들고, 보드 자체 위젯과 앱 타일을 불러와 그리고, 편집 모드를 붙인다.
import { CONFIG, groupOfApp } from './config.js';
import { validateManifest, validateTile } from './schema.js';
import { renderBody, renderDetail, h } from './render.js';
import { watch, PHONE } from './layout.js';
import { initEdit } from './edit.js';
import { WIDGETS, widgetDef, settingsOf, saveSettings } from './widgets.js';
import { applyAccent } from './accent.js';
import { setupFaces } from './faces.js';

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

/* ---------- 앱 타일 ---------- */
async function loadApps(first) {
  if (CONFIG.hubUrl) {
    // Hub 보드 API 는 아직 없다(life-hub docs/P7_BOARD.md). 있는 척하지 않고 앱 타일을 비워 둔다.
    problems.push('Hub 보드 API가 아직 없어 앱 타일을 불러오지 않았어요');
    return 'hub';
  }
  let pack;
  try {
    const r = await fetch('data/sample-tiles.json', { cache: 'no-store' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    pack = await r.json();
  } catch (e) { problems.push('예시 데이터를 읽지 못했어요 (' + e.message + ')'); return 'sample'; }
  for (const m of pack.manifests || []) {
    const v = validateManifest(m, policy);
    v.errors.forEach((er) => problems.push(`${m && m.app}: ${er.id ? er.id + ' — ' : ''}${er.message}`));
    if (v.ok) sync(v.app, v.tiles, first);
  }
  return 'sample';
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
let source = 'sample', lastAt = null;
function showStatus() {
  const t = lastAt ? `${pad2(lastAt.getHours())}:${pad2(lastAt.getMinutes())} 갱신` : '';
  const src = source === 'sample' ? '예시 데이터' : 'Life Hub';
  statusEl.textContent = [src, t, problems.length ? `확인할 것 ${problems.length}개` : null, PHONE.matches ? '길게 누르면 편집' : '길게 누르거나 우클릭하면 편집'].filter(Boolean).join(' · ');
  statusEl.title = problems.join('\n');
}
async function refresh(first) {
  problems = [];
  await loadWidgets(first);
  source = await loadApps(first);
  if (problems.length) console.warn('[board]', problems);
  lastAt = new Date(); showStatus();
  if (edit) edit.refreshEmpty();
}

/* ---------- 시작 ---------- */
(async function start() {
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
