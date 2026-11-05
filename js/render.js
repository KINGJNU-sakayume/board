// 톤별 렌더러. 앱이 보낸 글자는 항상 textContent 로만 넣는다(innerHTML 금지).
// 입력은 schema.js 가 정리한 타일 정의(def). 출력은 타일(.w) 안에 들어갈 노드들.

export function h(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'text') e.textContent = v;
    else if (k === 'style') e.style.cssText = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat(Infinity)) if (k !== undefined && k !== null && k !== false) e.append(k);
  return e;
}

const pct = (p) => Math.max(0, Math.min(100, (p.value / p.max) * 100)).toFixed(1) + '%';
function bar(p, cls = 'bar') {
  if (!p) return null;
  return h('div', { class: cls, role: 'img', 'aria-label': p.text || `${p.max} 중 ${p.value}` }, h('i', { style: `width:${pct(p)}` }));
}

/** 표지: 허용된 src 가 있으면 img, 없으면 글자 한 칸(mono). */
export function coverEl(img, cls, title) {
  const mono = (img && img.mono) || (title ? Array.from(title.trim())[0] : '') || '·';
  if (img && img.src) {
    const i = h('img', { alt: img.alt || '', loading: 'lazy', decoding: 'async', referrerpolicy: 'no-referrer' });
    i.addEventListener('error', () => { i.replaceWith(h('span', { class: 'mono-fill', text: mono })); }, { once: true });
    i.src = img.src;
    return h('span', { class: cls }, i);
  }
  return h('span', { class: cls + ' mono', text: mono, 'aria-hidden': 'true' });
}

/** 타일 전체를 덮는 누르기 영역. 상세가 있으면 상세, 아니면 앱 열기. */
function stretch(def, ctx, text, label) {
  const act = ctx.action(def);
  if (act && act.kind === 'button') return h('button', { class: 'stretch', type: 'button', text, 'aria-label': label, onclick: act.run });
  if (act && act.kind === 'link') return h('a', { class: 'stretch', href: act.href, text, 'aria-label': label });
  return document.createTextNode(text);
}

const TREND = { up: '▲', down: '▼', same: '–' };
export function rowEl(r, { thumb = 32, wide = false } = {}) {
  const end = [r.trend ? TREND[r.trend] + (r.value ? ' ' + r.value : '') : r.value].filter(Boolean)[0];
  const main = wide
    ? h('div', { class: 'grow' }, h('b', { class: 'block', text: r.title }), r.sub && h('span', { class: 'sub', text: r.sub }), bar(r.progress, 'bar mt6'))
    : h('b', { text: r.title, class: r.muted ? 'muted' : null });
  return h('div', { class: 'row' + (r.now ? ' now' : '') },
    r.rank !== undefined && h('span', { class: 'rank', text: String(r.rank) }),
    r.time && h('span', { class: 'sub time', text: r.time }),
    (r.cover || wide) && coverEl(r.cover, 'thumb', r.title),
    main,
    r.now ? h('span', { class: 'pill inv end', text: end || '지금' }) : end && h('span', { class: 'sub end', text: end }),
  );
}
const thumbSize = (el, w, hgt) => { el.style.width = w + 'px'; el.style.height = hgt + 'px'; return el; };

/* ---------------- 톤 ---------------- */

function sleeve(def, ctx) {
  const d = def.data, kids = [];
  kids.push(h('div', { class: 'face f1' },
    h('div', { class: 'cover' }, coverEl(d.cover, 'fill', d.title), bar(d.progress, 'cbar bar')),
    h('div', { class: 'lab' },
      h('p', { class: 'meta', text: d.label }),
      h('h3', { class: 'ttl' }, stretch(def, ctx, d.title)),
      d.sub && h('p', { class: 'sub', text: d.sub }),
      d.pill && h('span', { class: 'pill', text: d.pill }),
      d.progress && h('div', { class: 'col push g5' }, bar(d.progress), d.progress.text && h('span', { class: 'sub keep', text: d.progress.text })),
    )));
  if (d.list) {
    kids.push(h('div', { class: 'face f2 list', 'aria-hidden': 'true' },
      h('p', { class: 'meta mb4', text: d.listLabel || '최근' }),
      d.list.map((r) => { const e = rowEl(r); const t = e.querySelector('.thumb'); if (t) thumbSize(t, 30, 44); return e; })));
  }
  return kids;
}

function hero(def, ctx) {
  const d = def.data;
  return [
    d.cover && d.cover.src ? (() => { const i = h('img', { class: 'bg', alt: '', referrerpolicy: 'no-referrer' }); i.addEventListener('error', () => i.remove(), { once: true }); i.src = d.cover.src; return i; })() : null,
    h('div', { class: 'in' },
      h('div', { class: 'col hcol' },
        h('p', { class: 'meta hmeta', text: d.label }),
        h('h3', { class: 'ttl' }, stretch(def, ctx, d.title)),
        d.sub && h('p', { class: 'sub', text: d.sub }),
        d.progress && h('div', { class: 'col hbar g5' }, bar(d.progress), d.progress.text && h('span', { class: 'sub', text: d.progress.text }))),
      d.list && h('div', { class: 'panel' }, h('p', { class: 'meta mb2', text: d.listLabel || '' }), d.list.map((r) => rowEl(r)))),
  ];
}

function strip(def, ctx) {
  const d = def.data;
  return [
    h('p', { class: 'meta' }, stretch(def, ctx, d.label)),
    h('div', { class: 'strip', 'data-ar': d.square ? '1' : null, role: 'list' },
      d.items.map((it) => { const c = coverEl(it.cover, 'cover', it.title); c.setAttribute('role', 'listitem'); c.setAttribute('title', it.title); c.setAttribute('aria-label', it.title); return c; })),
  ];
}

function plate(def, ctx) {
  const d = def.data;
  const kids = [
    h('h3', { class: 'meta' }, stretch(def, ctx, d.label)),
    h('div', { class: 'pbody' },
      h('div', { class: 'col pcol' },
        h('div', { class: 'plate' }, h('b', { text: d.name }), d.roman && h('span', { class: 'sub', text: d.roman })),
        d.sub && h('span', { class: 'sub psub', text: d.sub })),
      d.roulette && roulette(d.roulette, ctx)),
  ];
  return [h('div', { class: 'sb' }, kids)];
}

/**
 * 룰렛: 대기 → 돌리는 중 → 뽑힘 → (제안 보내기) 보냄. 결과는 기록이 아니라 '제안'이다.
 * 보내기는 Life Hub 에 연결돼 있을 때만 열린다(ctx.canPropose). 멱등 키는 뽑힐 때 한 번 만들고, 실패해서
 * 다시 보낼 때도 같은 키를 쓴다(Hub 가 같은 제안으로 알아본다). Hub 는 역 도장깨기가 지금 뽑을 수 있는 역만 받는다.
 */
function roulette(r, ctx) {
  const name = h('span', { class: 'name', text: r.candidates[0] });
  const note = h('span', { class: 'sub' });
  const spin = h('button', { class: 'act', type: 'button', text: '룰렛 돌리기' });
  const send = h('button', { class: 'act', type: 'button', text: '제안 보내기' });
  const again = h('button', { class: 'act quiet', type: 'button', text: '다시 뽑기' });
  const box = h('div', { class: 'roulette', 'aria-live': 'polite' }, h('span', { class: 'sub lead', text: '다음에 갈 곳을 뽑아 볼까요?' }), name, note, h('div', { class: 'flex ac' }, spin, send, again));
  let timer = null, key = null;
  const newKey = () => 'board-draw-' + Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, '0')).join('');
  const state = (s, message) => {
    box.dataset.rs = s;
    name.hidden = s === 'idle'; spin.hidden = s !== 'idle'; again.hidden = !(s === 'done' || s === 'sent'); send.hidden = !(s === 'done' || s === 'sending');
    send.disabled = s === 'sending' || !ctx.canPropose;
    send.textContent = s === 'sending' ? '보내는 중…' : '제안 보내기';
    note.textContent = message ?? (s === 'done' ? (ctx.canPropose ? '제안을 보내면 역 도장깨기에서 승인한 뒤에 목적지가 돼요' : 'Life Hub에 연결되면 여기서 제안을 보낼 수 있어요')
      : s === 'sent' ? '제안했어요 · 역 도장깨기에서 승인하면 목적지가 돼요' : '');
    box.querySelector('.lead').textContent = s === 'idle' ? '다음에 갈 곳을 뽑아 볼까요?' : s === 'spinning' ? '돌리는 중…' : s === 'sent' ? '제안함' : '뽑힌 곳';
  };
  spin.addEventListener('click', () => {
    let n = 0; state('spinning');
    timer = setInterval(() => { name.textContent = r.candidates[Math.floor(Math.random() * r.candidates.length)]; if (++n >= 16) { clearInterval(timer); key = newKey(); state('done'); } }, 100);
  });
  again.addEventListener('click', () => state('idle'));
  send.addEventListener('click', async () => {
    if (!ctx.canPropose || !ctx.propose || !key) return;
    state('sending');
    try { await ctx.propose(name.textContent, key); state('sent'); }
    catch (e) { state('done', (e && e.message) || '제안을 보내지 못했어요. 다시 눌러 주세요.'); }
  });
  state('idle');
  return box;
}

function map(def, ctx) {
  const d = def.data;
  const on = d.cells.filter((c) => c.state === 'on' || c.state === 'last').length;
  return [h('div', { class: 'mp' },
    h('p', { class: 'meta' }, stretch(def, ctx, d.label)),
    h('div', { class: 'dots', style: `grid-template-columns:repeat(${d.cols},1fr)`, role: 'img', 'aria-label': d.summary },
      d.cells.map((c) => h('i', { class: c.state === 'none' ? 'o' : c.state === 'on' ? 'v' : c.state === 'last' ? 'v last' : null, text: c.name || '' }))),
    h('p', { class: 'sub keep-big', text: d.summary || `${on}곳` }))];
}

function num(def, ctx) {
  const d = def.data;
  return [h('div', { class: 'tn' },
    h('p', { class: 'meta' }, stretch(def, ctx, d.label)),
    h('div', { class: 'nrow' },
      h('span', { class: 'num' + (d.value.length > 4 ? ' long' : '') }, d.value, d.unit && h('small', { text: d.unit })),
      d.caption && h('span', { class: 'sub cap', text: d.caption })),
    d.sub && h('p', { class: 'sub nsub hide-h', text: d.sub }),
    d.foot && h('div', { class: 'hours' }, d.foot.map((f) => h('div', null, h('span', { class: 'sub', text: f.k }), h('b', { text: f.v })))))];
}

function list(def, ctx) {
  const d = def.data;
  return [h('div', { class: 'tl' },
    h('h3', { class: 'meta' }, stretch(def, ctx, d.label)),
    h('div', { class: 'col rows' }, d.rows.map((r) => rowEl(r))),
    d.foot && h('p', { class: 'sub push foot', text: d.foot }))];
}

function line(def, ctx) {
  const d = def.data;
  return [h('div', { class: 'tli' },
    h('p', { class: 'meta' }, stretch(def, ctx, d.label)),
    h('div', { class: 'lrow' }, h('p', { class: 'ttl', text: d.title }), d.pill && h('span', { class: 'pill inv', text: d.pill })),
    d.sub && h('p', { class: 'sub hide-s', text: d.sub }),
    bar(d.progress, 'bar mt8 hide-s'))];
}

function cells(def, ctx) {
  const d = def.data;
  return [h('div', { class: 'tc' },
    h('p', { class: 'meta' }, stretch(def, ctx, d.label)),
    h('div', { class: 'cells', role: 'img', 'aria-label': `${d.total}칸 중 ${d.filled}칸` },
      Array.from({ length: d.total }, (_, i) => h('i', { class: i < d.filled ? 'on' : null }))))];
}

const BY = { sleeve, hero, strip, plate, map, num, list, line, cells };
export function renderBody(def, ctx) { return BY[def.form || def.tone](def, ctx); }

/** 펼침 상세 대화상자 내용 */
export function renderDetail(def, ctx) {
  const d = def.detail;
  return [
    h('div', { class: 'hd' }, h('h2', { id: 'detailT', text: d.title }), h('button', { class: 'act soft', type: 'button', text: '닫기', 'data-close': '' })),
    h('div', { class: 'col g0 mt6' }, d.rows.map((r) => { const e = rowEl(r, { wide: true }); const t = e.querySelector('.thumb'); if (t) thumbSize(t, 40, 60); return e; })),
    def.href && h('div', { class: 'dfoot' }, h('span', { class: 'sub', text: '앱을 열지 않고 볼 수 있어요' }), h('a', { class: 'lk', href: def.href, text: `${ctx.appName(def)} 열기` })),
  ];
}
