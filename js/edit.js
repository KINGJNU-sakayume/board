// 편집 모드 (iOS 위젯 방식). v3/v4 시안의 동작을 옮겨 오고, 크기 조절을 '끄는 동안 타일이 실제로 바뀌는' 방식으로 바꿨다.
// 진입: 타일 길게 누르기(450ms) / E 키 / 우클릭 메뉴의 '보드 편집'. 나가기: 완료, Esc, 빈 곳 누르기.
import { metrics, PHONE } from './layout.js';

const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

export function parse(s) { const a = s.split('x'); return { c: +a[0], r: +a[1] }; }
export function label(s) { const p = parse(s); return p.c + '×' + p.r; }
export function sizesOf(t) {
  return (t.getAttribute('data-sizes') || t.getAttribute('data-size')).split(/\s+/).sort((a, b) => {
    const A = parse(a), B = parse(b); return A.c * A.r - B.c * B.r || A.c - B.c;
  });
}

export function initEdit(o) {
  const { page, sc, tray, live, groups, key, menuExtra, onChange } = o;
  const toastEl = $('#toast'), addDlg = $('#addDlg');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  let editing = false, swallow = false, eatClick = false, lastType = 'mouse';

  function say(t) { live.textContent = ''; setTimeout(() => { live.textContent = t; }, 30); }
  const anyDialog = () => !!document.querySelector('dialog[open]');
  const vis = (c) => (PHONE.matches ? Math.min(c, 2) : c);        // 휴대폰에서는 4칸 폭이 2칸으로 접힌다

  function applySize(t, size) {
    t.setAttribute('data-size', size);
    const rz = $('.rz', t); if (rz) rz.setAttribute('aria-label', t.dataset.name + ' 크기 바꾸기, 현재 ' + label(size));
  }

  /* ---------- 저장 / 불러오기 ---------- */
  function snapshot() {
    const g = {};
    $$('.grid').forEach((grid) => { g[grid.dataset.group] = $$(':scope > .w', grid).map((t) => [t.dataset.id, t.dataset.size]); });
    return { v: 1, g, tray: $$(':scope > .w', tray).map((t) => t.dataset.id) };
  }
  function refreshEmpty() { $$('.grid').forEach((g) => g.classList.toggle('empty', !g.querySelector(':scope > .w, :scope > .ph'))); }
  function save() { refreshEmpty(); try { localStorage.setItem(key, JSON.stringify(snapshot())); } catch (e) { /* 저장 못 해도 보드는 돈다 */ } onChange && onChange(); }
  function applyLayout(L) {
    const by = {}; $$('.w').forEach((t) => { by[t.dataset.id] = t; });
    Object.keys(L.g || {}).forEach((gid) => {
      const grid = $('.grid[data-group="' + gid + '"]'); if (!grid || !Array.isArray(L.g[gid])) return;
      L.g[gid].forEach((it) => {
        const t = by[it[0]]; if (!t) return;
        if (sizesOf(t).indexOf(it[1]) >= 0) applySize(t, it[1]);
        grid.appendChild(t);
      });
    });
    (L.tray || []).forEach((id) => { if (by[id]) tray.appendChild(by[id]); });
    refreshEmpty();
  }
  function loadSaved() { try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : null; } catch (e) { return null; } }

  /* ---------- 타일에 편집용 손잡이 달기 (새로 들어온 타일에도 다시 부를 수 있다) ---------- */
  function attach(t) {
    if (t.__edit) return; t.__edit = true;
    const rm = el('button', 'rm', '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 6h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>');
    rm.type = 'button'; rm.setAttribute('aria-label', t.dataset.name + ' 제거');
    rm.addEventListener('click', (e) => { e.stopPropagation(); removeTile(t); });
    t.appendChild(rm);
    if (sizesOf(t).length > 1) {
      const rz = el('button', 'rz'); rz.type = 'button'; t.appendChild(rz);
      applySize(t, t.dataset.size);
      rz.addEventListener('keydown', (e) => {
        const k = e.key, list = sizesOf(t), i = list.indexOf(t.dataset.size); let n = i;
        if (k === 'ArrowRight' || k === 'ArrowDown') n = Math.min(list.length - 1, i + 1);
        else if (k === 'ArrowLeft' || k === 'ArrowUp') n = Math.max(0, i - 1); else return;
        e.preventDefault();
        if (n !== i) { resizeTile(t, list[n]); say(t.dataset.name + ' ' + label(list[n])); }
      });
    }
    if (editing) t.setAttribute('tabindex', '0');
  }
  // 손잡이(.rm, .rz)는 내용이 다시 그려져도 남아야 하므로, 내용 교체는 main.js 가 손잡이를 빼고 한다.

  /* ---------- 배치가 바뀔 때 부드럽게 (FLIP). skip 은 지금 손으로 잡고 있는 타일 ---------- */
  function flip(fn, skip) {
    const els = $$('.grid > .w, .grid > .ph'), first = els.map((e) => e.getBoundingClientRect());
    fn();
    if (reduce.matches) return;
    els.forEach((e, i) => {
      if (e === skip || !e.isConnected || !first[i].width) return;
      const l = e.getBoundingClientRect(), dx = first[i].left - l.left, dy = first[i].top - l.top;
      if (!dx && !dy) return;
      e.animate([{ transform: `translate(${dx}px,${dy}px)` }, { transform: 'none' }], { duration: 220, easing: 'cubic-bezier(.2,.8,.2,1)' });
    });
  }
  function resizeTile(t, size) { flip(() => applySize(t, size)); save(); }

  /* ---------- 편집 모드 ---------- */
  function setEditing(on) {
    if (on === editing) return;
    editing = on; page.classList.toggle('editing', on);
    $$('.grid > .w').forEach((t) => { if (on) t.setAttribute('tabindex', '0'); else t.removeAttribute('tabindex'); });
    if (!on) { closeMenu(); cancelDrag(); cancelResize(); }
    say(on ? '편집 모드 켜짐. 타일을 끌어 옮기고, 오른쪽 아래 모서리를 끌어 크기를 바꿀 수 있어요. Esc로 끝내요.' : '편집 모드 꺼짐.');
    if (on) { try { if (navigator.vibrate) navigator.vibrate(12); } catch (e) { /* 없음 */ } }
  }
  $('#doneBtn').addEventListener('click', () => setEditing(false));

  const HOLD = 450, MOVE = 10; let timer = null, sx = 0, sy = 0;
  function cancelHold() { if (timer) { clearTimeout(timer); timer = null; } }
  document.addEventListener('pointerdown', (e) => {          // 메뉴 밖을 누르면 메뉴만 닫는다
    eatClick = false;
    if (menu && !menu.contains(e.target)) { closeMenu(); if (!e.target.closest('.w')) eatClick = true; }
  }, true);
  page.addEventListener('pointerdown', (e) => {
    swallow = false; lastType = e.pointerType || 'mouse';
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (editing) {
      const rz = e.target.closest('.rz');
      if (rz) { startResize(e, rz.closest('.w')); return; }
      if (e.target.closest('.rm')) return;
      const t = e.target.closest('.grid > .w'); if (t) startDrag(e, t);
      return;
    }
    if (!e.target.closest('.w') || e.target.closest('.roulette button')) return;
    sx = e.clientX; sy = e.clientY; cancelHold();
    timer = setTimeout(() => { timer = null; swallow = true; setEditing(true); }, HOLD);
  });
  page.addEventListener('pointermove', (e) => {
    if (timer && Math.hypot(e.clientX - sx, e.clientY - sy) > MOVE) cancelHold();
    if (drag && e.pointerId === drag.pid) moveDrag(e);
    else if (rsz && e.pointerId === rsz.pid) moveResize(e);
  });
  page.addEventListener('pointerup', (e) => {
    cancelHold();
    if (drag && e.pointerId === drag.pid) endDrag(e);
    else if (rsz && e.pointerId === rsz.pid) endResize();
  });
  page.addEventListener('pointercancel', () => { cancelHold(); cancelDrag(); cancelResize(true); });
  page.addEventListener('click', (e) => {
    if (swallow || eatClick) { e.preventDefault(); e.stopImmediatePropagation(); swallow = eatClick = false; }
  }, true);
  page.addEventListener('click', (e) => {
    if (editing && !e.target.closest('.w,.editbar')) setEditing(false);
  });
  page.addEventListener('contextmenu', (e) => {
    const t = e.target.closest('.grid > .w'); if (!t) return;
    const fromKey = e.clientX === 0 && e.clientY === 0;
    if (lastType !== 'mouse' && !fromKey) { e.preventDefault(); if (!editing) { swallow = true; setEditing(true); } return; }
    e.preventDefault();
    if (fromKey) { const r = t.getBoundingClientRect(); openMenu(t, r.left + 20, r.top + 20); } else openMenu(t, e.clientX, e.clientY);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (menu) { const t0 = menuTile; closeMenu(); if (t0 && t0.isConnected && editing) t0.focus(); return; }
      // 누른 채 Esc 로 취소하면, 손을 뗄 때 오는 click(캡처 때문에 페이지로 감)이 편집 모드를 끄지 않게 삼킨다
      if (drag && drag.active) { cancelDrag(); swallow = true; return; }
      if (rsz) { cancelResize(true); swallow = true; return; }
      if (editing && !anyDialog()) setEditing(false);
      return;
    }
    const tg = e.target, tag = tg && tg.tagName;
    if (editing && (e.key === 'Enter' || e.key === ' ') && tg && tg.classList && tg.classList.contains('w')) {
      e.preventDefault(); const r2 = tg.getBoundingClientRect(); openMenu(tg, r2.left + 20, r2.bottom - 10); return;
    }
    if (e.code === 'KeyE' && !e.ctrlKey && !e.metaKey && !e.altKey && !anyDialog() && !menu) {
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (tg && tg.isContentEditable)) return;
      setEditing(!editing);
    }
  });

  /* ---------- 우클릭 메뉴 ---------- */
  let menu = null, menuTile = null;
  function closeMenu() { if (menu) { menu.remove(); menu = null; menuTile = null; } }
  const SIZE_NAME = { '1x1': '작게', '2x1': '가로로 넓게', '2x2': '보통', '4x1': '아주 넓게', '4x2': '크게' };
  function openMenu(t, x, y) {
    closeMenu(); menuTile = t;
    const m = el('div', 'menu'); m.setAttribute('role', 'menu'); m.setAttribute('aria-label', t.dataset.name + ' 메뉴');
    const list = sizesOf(t);
    if (list.length > 1) {
      const row = el('div', 'sizes'); row.setAttribute('role', 'group'); row.setAttribute('aria-label', '크기');
      list.forEach((s) => {
        const p = parse(s), b = el('button', 'sz', '<span class="ic"><i></i></span>');
        const ic = b.querySelector('i'); ic.style.width = p.c * 8 + 'px'; ic.style.height = p.r * 8 + 'px';   // CSP: 인라인 style 속성 대신 CSSOM
        b.type = 'button'; b.setAttribute('role', 'menuitemradio'); b.setAttribute('aria-checked', String(s === t.dataset.size));
        b.setAttribute('aria-label', label(s) + ' ' + (SIZE_NAME[s] || '')); b.title = label(s) + ' ' + (SIZE_NAME[s] || '');
        b.addEventListener('click', () => { const tt = t; closeMenu(); resizeTile(tt, s); say(tt.dataset.name + ' ' + label(s)); });
        row.appendChild(b);
      });
      m.appendChild(row);
    }
    const item = (text, icon, cls, run) => {
      const b = el('button', 'mi' + (cls ? ' ' + cls : '')); b.type = 'button'; b.setAttribute('role', 'menuitem');
      const a = el('span'); a.textContent = text; const i = el('span'); i.setAttribute('aria-hidden', 'true'); i.textContent = icon;
      b.append(a, i); b.addEventListener('click', () => { closeMenu(); run(); }); m.appendChild(b);
    };
    (menuExtra ? menuExtra(t) : []).forEach((x) => item(x.label, x.icon || '', '', x.run));
    item(editing ? '편집 끝내기' : '보드 편집', '▦', '', () => setEditing(!editing));
    item('위젯 제거', '⊖', 'danger', () => removeTile(t));
    m.addEventListener('keydown', (e) => {
      const items = $$('button', m), i = items.indexOf(document.activeElement), k = e.key, sz = $$('.sz', m);
      if (k === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
      else if (k === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
      else if ((k === 'ArrowRight' || k === 'ArrowLeft') && sz.indexOf(document.activeElement) >= 0) {
        e.preventDefault(); const j = sz.indexOf(document.activeElement); sz[(j + (k === 'ArrowRight' ? 1 : sz.length - 1)) % sz.length].focus();
      }
    });
    document.body.appendChild(m); menu = m;
    const r = m.getBoundingClientRect();
    m.style.left = Math.max(8, Math.min(x, innerWidth - r.width - 8)) + 'px';
    m.style.top = Math.max(8, Math.min(y, innerHeight - r.height - 8)) + 'px';
    const first = $('.sz[aria-checked="true"]', m) || $('button', m); if (first) first.focus();
  }

  /* ---------- 옮기기 ---------- */
  let drag = null;
  function startDrag(e, tile) {
    // 포인터 캡처는 실제로 끌기 시작할 때만 한다. 탭에서 캡처하면 뒤따르는 click 이 페이지로 가서 편집이 꺼진다.
    drag = { tile, pid: e.pointerId, sx: e.clientX, sy: e.clientY, active: false, last: 0, x: e.clientX, y: e.clientY };
  }
  function beginDrag() {
    const t = drag.tile, r = t.getBoundingClientRect(); closeMenu();
    drag.ox = drag.sx - r.left; drag.oy = drag.sy - r.top;
    const ph = el('div', 'ph'); ph.setAttribute('data-size', t.dataset.size); t.parentNode.insertBefore(ph, t);
    const c = t.cloneNode(true);
    $$('[id]', c).forEach((n) => n.removeAttribute('id')); $$('.rm,.rz', c).forEach((n) => n.remove());
    c.removeAttribute('tabindex'); c.classList.add('drag-clone');
    Object.assign(c.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
    document.body.appendChild(c);
    t.classList.add('dragging-src'); drag.ph = ph; drag.clone = c; drag.active = true;
    try { page.setPointerCapture(drag.pid); } catch (_) { /* 없음 */ }
    autoScroll();
  }
  function moveDrag(e) {
    if (!drag.active) { if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 6) return; beginDrag(); }
    drag.x = e.clientX; drag.y = e.clientY;
    drag.clone.style.left = (e.clientX - drag.ox) + 'px'; drag.clone.style.top = (e.clientY - drag.oy) + 'px';
    over(e.clientX, e.clientY);
  }
  function over(x, y) {
    const now = performance.now(); if (now - drag.last < 140) return;
    const hit = document.elementFromPoint(x, y); if (!hit) return;
    const t = hit.closest('.grid > .w'); let grid = hit.closest('.grid'), ref;
    if (t && t !== drag.tile) {
      const r = t.getBoundingClientRect();
      const before = PHONE.matches ? y < r.top + r.height / 2 : (x < r.left + r.width / 2);
      ref = before ? t : t.nextElementSibling; grid = t.parentNode;
    } else if (grid && !t && !hit.closest('.ph')) {
      ref = null;
    } else return;
    if (ref === drag.ph || (ref && ref.previousElementSibling === drag.ph && drag.ph.parentNode === grid)) return;
    if (!ref && grid.lastElementChild === drag.ph) return;
    drag.last = now; flip(() => { grid.insertBefore(drag.ph, ref); refreshEmpty(); });
  }
  function autoScroll() {
    if (!drag || !drag.active) return;
    if (PHONE.matches) {
      const v = drag.y < 70 ? -8 : drag.y > innerHeight - 70 ? 8 : 0; if (v) window.scrollBy(0, v);
    } else {
      const r = sc.getBoundingClientRect(); let v = 0;
      if (drag.x < r.left + 70) v = -Math.ceil((70 - (drag.x - r.left)) / 5); else if (drag.x > r.right - 70) v = Math.ceil((70 - (r.right - drag.x)) / 5);
      if (v) sc.scrollLeft += v;
    }
    drag.raf = requestAnimationFrame(autoScroll);
  }
  function endDrag(e) {
    const d = drag; drag = null;
    try { page.releasePointerCapture(e.pointerId); } catch (_) { /* 없음 */ }
    if (!d.active) { const r = d.tile.getBoundingClientRect(); openMenu(d.tile, e.clientX, r.bottom + 8); return; }
    cancelAnimationFrame(d.raf); swallow = true;
    flip(() => { d.ph.replaceWith(d.tile); d.tile.classList.remove('dragging-src'); });
    d.clone.remove(); save(); say(d.tile.dataset.name + ' 옮김');
  }
  function cancelDrag() {
    if (!drag) return; const d = drag; drag = null;
    try { page.releasePointerCapture(d.pid); } catch (_) { /* 없음 */ }
    if (d.active) { cancelAnimationFrame(d.raf); d.ph.remove(); d.clone.remove(); d.tile.classList.remove('dragging-src'); refreshEmpty(); }
  }

  /* ---------- 크기 조절: 핸들을 끄는 동안 타일이 가능한 크기로 바로 바뀐다 ----------
     손가락(포인터)과 타일 오른쪽 아래 모서리 사이 거리를 처음 그대로 유지한다고 보고,
     '지금 타일 왼쪽 위'에서 포인터까지의 폭·높이를 칸 수로 반올림해 가장 가까운 허용 크기를 고른다. */
  let rsz = null;
  function startResize(e, tile) {
    e.preventDefault(); closeMenu();
    const r = tile.getBoundingClientRect();
    const chip = el('div', 'gchip'); document.body.appendChild(chip);
    rsz = { tile, pid: e.pointerId, from: tile.dataset.size, cand: tile.dataset.size, dx: r.right - e.clientX, dy: r.bottom - e.clientY, chip };
    tile.classList.add('resizing');
    try { page.setPointerCapture(e.pointerId); } catch (_) { /* 없음 */ }
    drawChip();
  }
  function drawChip() {
    const r = rsz.tile.getBoundingClientRect();
    rsz.chip.innerHTML = sizesOf(rsz.tile).map((s) => (s === rsz.cand ? '<b>' + label(s) + '</b>' : '<span>' + label(s) + '</span>')).join('');
    const cw = rsz.chip.offsetWidth;
    rsz.chip.style.left = Math.max(8, Math.min(r.left, innerWidth - cw - 8)) + 'px';
    rsz.chip.style.top = (r.top > 52 ? r.top - 40 : r.top + 8) + 'px';
  }
  function moveResize(e) {
    const { unit, gap } = metrics();
    const r = rsz.tile.getBoundingClientRect();
    const tw = e.clientX + rsz.dx - r.left, th = e.clientY + rsz.dy - r.top;
    const cols = Math.max(1, Math.round((tw + gap) / (unit + gap))), rows = Math.max(1, Math.round((th + gap) / (unit + gap)));
    let best = rsz.cand, bd = 1e9;
    sizesOf(rsz.tile).forEach((s) => {
      const p = parse(s), d = Math.pow(vis(p.c) - cols, 2) + Math.pow(p.r - rows, 2) + (s === rsz.cand ? -0.01 : 0);
      if (d < bd) { bd = d; best = s; }
    });
    if (best !== rsz.cand) {
      rsz.cand = best;
      flip(() => applySize(rsz.tile, best), rsz.tile);
      say(rsz.tile.dataset.name + ' ' + label(best));
    }
    drawChip();
  }
  function endResize() {
    if (!rsz) return; const d = rsz; rsz = null; d.chip.remove(); d.tile.classList.remove('resizing');
    try { page.releasePointerCapture(d.pid); } catch (_) { /* 없음 */ }
    swallow = true;
    if (d.cand !== d.from) save();
  }
  function cancelResize(revert) {
    if (!rsz) return; const d = rsz; rsz = null; d.chip.remove(); d.tile.classList.remove('resizing');
    try { page.releasePointerCapture(d.pid); } catch (_) { /* 없음 */ }
    if (revert && d.cand !== d.from) flip(() => applySize(d.tile, d.from));
  }

  /* ---------- 제거 · 되돌리기 · 추가 ---------- */
  let lastRemoved = null, toastTimer = null;
  function toast(msg, withUndo) {
    $('#toastMsg').textContent = msg; $('#toastBtn').hidden = !withUndo; toastEl.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { toastEl.hidden = true; }, 6000);
  }
  function removeTile(t) {
    lastRemoved = { t, parent: t.parentNode, next: t.nextElementSibling };
    flip(() => tray.appendChild(t));
    save(); toast(t.dataset.name + ' 제거됨', true); say(t.dataset.name + ' 제거됨');
  }
  $('#toastBtn').addEventListener('click', () => {
    const L = lastRemoved; if (!L) return;
    flip(() => { if (L.parent.isConnected && (!L.next || L.next.parentNode === L.parent)) L.parent.insertBefore(L.t, L.next); else L.parent.appendChild(L.t); });
    lastRemoved = null; toastEl.hidden = true; save();
  });
  const groupName = (id) => (groups.find((g) => g.id === id) || {}).name || '';
  function renderAdd() {
    const box = $('#addList'), items = $$(':scope > .w', tray); box.innerHTML = '';
    if (!items.length) { const p = el('p', 'sub'); p.textContent = '추가할 위젯이 없어요. 보드에 다 올라가 있어요.'; box.appendChild(p); return; }
    items.forEach((t) => {
      const row = el('div', 'addrow'), info = el('div'), b = el('b', 'block'), s = el('span', 'sub');
      b.textContent = t.dataset.name; s.textContent = groupName(t.dataset.home) + ' · ' + label(t.dataset.size); info.append(b, s);
      const add = el('button', 'act soft'); add.type = 'button'; add.textContent = '추가'; add.setAttribute('aria-label', t.dataset.name + ' 추가');
      add.addEventListener('click', () => { $('.grid[data-group="' + t.dataset.home + '"]').appendChild(t); if (editing) t.setAttribute('tabindex', '0'); save(); renderAdd(); say(t.dataset.name + ' 추가됨'); });
      row.append(info, add); box.appendChild(row);
    });
  }
  $('#addBtn').addEventListener('click', () => { renderAdd(); addDlg.showModal(); });
  $('#closeAdd').addEventListener('click', () => addDlg.close());
  let DEFAULT = null;
  $('#resetLayout').addEventListener('click', () => { if (DEFAULT) { applyLayout(DEFAULT); save(); renderAdd(); say('기본 배치로 되돌렸어요.'); } });

  return {
    attach, applySize, save, flip,
    isEditing: () => editing,
    /** 처음 그린 직후 한 번: 지금 배치를 기본값으로 기억하고, 저장된 배치가 있으면 덮어쓴다. */
    start() { DEFAULT = snapshot(); const s = loadSaved(); if (s) applyLayout(s); refreshEmpty(); },
    refreshEmpty,
  };
}
