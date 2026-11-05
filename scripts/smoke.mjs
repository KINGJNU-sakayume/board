// npm run smoke — 로컬 서버를 띄우고 Playwright 로 화면·편집·크기 조절을 확인한다. (playwright 가 설치된 환경에서)
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { console.error('playwright 가 없어요: npm i -D playwright'); process.exit(1); }

const PORT = 8123, URL = `http://127.0.0.1:${PORT}/`;
const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 700));
mkdirSync('shots', { recursive: true });
let fail = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) fail++; };

const b = await chromium.launch();
try {
  for (const [name, vp, scheme] of [['pc-1440', { width: 1440, height: 900 }, 'dark'], ['pc-1920', { width: 1920, height: 1080 }, 'light'], ['pc-short', { width: 1280, height: 640 }, 'dark']]) {
    const p = await b.newPage({ viewport: vp, colorScheme: scheme });
    const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
    await p.goto(URL); await p.waitForSelector('.w'); await p.waitForTimeout(600);
    const m = await p.evaluate(() => {
      const de = document.documentElement, sc = document.getElementById('scroller'), g = document.querySelector('.grid');
      return { vScroll: de.scrollHeight > innerHeight + 1, hScroll: sc.scrollWidth > sc.clientWidth, unit: getComputedStyle(de).getPropertyValue('--unit'), rows: getComputedStyle(de).getPropertyValue('--rows'),
        fill: g.getBoundingClientRect().bottom, vh: innerHeight, tiles: document.querySelectorAll('.grid > .w').length };
    });
    ok(!m.vScroll, `${name}: 세로 스크롤 없음`); ok(m.hScroll, `${name}: 가로 스크롤 있음`);
    ok(m.vh - m.fill < 40, `${name}: 격자가 화면 아래까지 (${Math.round(m.vh - m.fill)}px 남음, 칸 ${m.unit} × ${m.rows}줄, 타일 ${m.tiles})`);
    ok(errs.length === 0, `${name}: 오류 없음 ${errs.join(' | ')}`);
    await p.screenshot({ path: `shots/${name}.png` });
    await p.close();
  }

  // 크기 조절: 편집 모드 → 핸들을 끄는 '도중'에 타일 크기가 바뀌어야 한다
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto(URL); await p.waitForSelector('.w'); await p.waitForTimeout(400);
  await p.keyboard.press('KeyE'); await p.waitForTimeout(200);
  const t = p.locator('.w[data-id="board:weather"]');
  const before = await t.getAttribute('data-size');
  const hb = await t.locator('.rz').boundingBox();
  const unit = await p.evaluate(() => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--unit')));
  await p.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2); await p.mouse.down();
  const steps = 12;
  for (let i = 1; i <= steps; i++) { await p.mouse.move(hb.x + hb.width / 2 + (i * unit * 2.2) / steps, hb.y + hb.height / 2 - (i * unit) / steps); await p.waitForTimeout(25); }
  const during = await t.getAttribute('data-size');
  const chip = await p.locator('.gchip').textContent();
  await p.screenshot({ path: 'shots/resize-during.png' });
  await p.mouse.up(); await p.waitForTimeout(300);
  const after = await t.getAttribute('data-size');
  ok(before === '2x2' && during === '4x1' && after === '4x1', `핸들 끌기: ${before} → 끄는 중 ${during} → 놓은 뒤 ${after} (칩: ${chip})`);
  const saved = await p.evaluate(() => JSON.parse(localStorage.getItem('board.layout.v1') || 'null'));
  ok(saved && JSON.stringify(saved).includes('"board:weather","4x1"'), '바뀐 크기가 저장됨');
  // Esc 로 끄는 중 취소하면 원래 크기로
  const hb2 = await t.locator('.rz').boundingBox();
  await p.mouse.move(hb2.x + 20, hb2.y + 20); await p.mouse.down();
  for (let i = 1; i <= 8; i++) { await p.mouse.move(hb2.x + 20 - i * unit * 0.3, hb2.y + 20 + i * unit * 0.15); await p.waitForTimeout(25); }
  const mid = await t.getAttribute('data-size');
  await p.keyboard.press('Escape'); await p.mouse.up(); await p.waitForTimeout(250);
  ok(mid !== '4x1' && (await t.getAttribute('data-size')) === '4x1', `끄는 중 Esc: ${mid} 에서 4x1 로 되돌아감`);
  ok(await p.evaluate(() => document.getElementById('page').classList.contains('editing')), 'Esc 취소 뒤에도 편집 모드 유지');
  // 끌어서 옮기기 (미디어 그룹이 화면에 보이게 먼저 넘긴다)
  await p.evaluate(() => { document.getElementById('scroller').scrollLeft = document.getElementById('g-media').offsetLeft - 20; }); await p.waitForTimeout(200);
  const first = await p.evaluate(() => document.querySelector('.grid[data-group="media"] > .w').dataset.id);
  const src = p.locator('.grid[data-group="media"] > .w').nth(1), dst = p.locator('.grid[data-group="media"] > .w').first();
  const sb = await src.boundingBox(), db = await dst.boundingBox();
  await p.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2); await p.mouse.down();
  for (let i = 1; i <= 15; i++) { await p.mouse.move(sb.x + sb.width / 2 + ((db.x + 10) - (sb.x + sb.width / 2)) * i / 15, sb.y + sb.height / 2 + ((db.y + db.height / 2) - (sb.y + sb.height / 2)) * i / 15); await p.waitForTimeout(30); }
  await p.waitForTimeout(200); await p.mouse.up(); await p.waitForTimeout(300);
  const nowFirst = await p.evaluate(() => document.querySelector('.grid[data-group="media"] > .w').dataset.id);
  ok(nowFirst !== first, `끌어서 옮기기: 미디어 첫 타일 ${first} → ${nowFirst}`);
  await p.keyboard.press('Escape');
  // 모든 타일을 가장 작은/가장 큰 크기로
  for (const pick of ['min', 'max']) {
    await p.evaluate((pick) => document.querySelectorAll('.w').forEach((t) => { const s = t.dataset.sizes.split(' '); t.dataset.size = pick === 'min' ? s[0] : s[s.length - 1]; }), pick);
    await p.waitForTimeout(300); await p.screenshot({ path: `shots/all-${pick}.png` });
  }
  await p.close();

  // 보드 위젯 설정 (네트워크 없는 것만): 설정 전 타일을 누르면 설정 창 → 저장하면 바로 그려진다
  {
    const q = await b.newPage({ viewport: { width: 1440, height: 900 } });
    await q.goto(URL); await q.waitForSelector('.w');
    await q.click('.w[data-id="board:timetable"] .stretch');
    await q.fill('#setDlg textarea', '매일 00:00 아침 일정\n매일 23:59 밤 일정');
    await q.click('#setDlg button[type=submit]'); await q.waitForTimeout(400);
    const rows = await q.locator('.w[data-id="board:timetable"] .row').count();
    await q.click('.w[data-id="board:price"] .stretch');
    await q.fill('#f-price-item', '예시 이어폰'); await q.fill('#f-price-price', '189000'); await q.fill('#f-price-target', '170000');
    await q.click('#setDlg button[type=submit]'); await q.waitForTimeout(400);
    const price = await q.locator('.w[data-id="board:price"] .num').textContent();
    ok(rows === 2 && price.startsWith('189,000'), `위젯 설정: 시간표 ${rows}행, 가격 ${price}`);
    await q.screenshot({ path: 'shots/widgets-set.png' });
    await q.close();
  }

  // Life Hub 연결 (가짜 Hub: 네트워크 요청을 가로채 응답한다. 실제 Hub 에는 보내지 않는다)
  {
    const HUB = 'https://life-hub-api.213303.workers.dev';
    const now = Date.now();
    const man = (app, tiles, receivedDaysAgo = 0) => ({ version: 1, app, generated_at: new Date(now - 6e4).toISOString(), received_at: new Date(now - receivedDaysAgo * 864e5).toISOString(), tiles });
    const line = (id, title) => ({ id, name: '예시 ' + id, tone: 'type', form: 'line', sizes: ['2x1'], data: { label: '실제 모드 예시', title } });
    let tilesStatus = 200, tokenCalls = [];
    const q = await b.newPage({ viewport: { width: 1440, height: 900 } });
    await q.route(HUB + '/**', async (route) => {
      const u = new globalThis.URL(route.request().url());
      if (u.pathname === '/oauth/token') {
        const body = new URLSearchParams(route.request().postData() || '');
        tokenCalls.push(body.get('grant_type'));
        if (body.get('grant_type') === 'refresh_token' && tilesStatus === 401) return route.fulfill({ status: 400, contentType: 'application/json', body: '{"error":"invalid_grant"}' });
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ access_token: 'at-' + tokenCalls.length, refresh_token: 'rt', token_type: 'bearer', expires_in: 3600, scope: 'board:read' }) });
      }
      if (u.pathname === '/board/v1/tiles') {
        if (tilesStatus !== 200) return route.fulfill({ status: tilesStatus, body: '' });
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ generated_at: new Date(now).toISOString(), manifests: [
          man('animan', [line('now', '실제로 온 타일')]), man('sub', [line('old', '오래된 타일')], 20),
          { version: 1, app: 'hub', generated_at: new Date(now).toISOString(), tiles: [{ id: 'inbox', name: '받은 제안', tone: 'type', form: 'num', sizes: ['1x1', '2x1'], data: { label: '받은 제안', value: 2, unit: '건' } }] },
        ] }) });
      }
      return route.fulfill({ status: 404, body: '' });
    });
    // 콜백에서 돌아온 상황: 이 탭에서 시작한 연결(state 일치) + 콜백 페이지가 남긴 결과
    await q.addInitScript(() => {
      if (sessionStorage.getItem('smoke.once')) return; sessionStorage.setItem('smoke.once', '1');
      sessionStorage.setItem('board.lifehub.pending-auth.v1', JSON.stringify({ state: 'st1', verifier: 'v'.repeat(43), created_at: Date.now() }));
      sessionStorage.setItem('board.lifehub.callback.v1', '?code=c1&state=st1&iss=' + encodeURIComponent('https://life-hub-api.213303.workers.dev'));
    });
    await q.goto(URL); await q.waitForSelector('.w[data-id="animan:now"]');
    const ids = await q.evaluate(() => [...document.querySelectorAll('.grid > .w')].map((t) => t.dataset.id).filter((id) => !id.startsWith('board:')).sort());
    ok(tokenCalls[0] === 'authorization_code' && JSON.stringify(ids) === JSON.stringify(['animan:now', 'hub:inbox', 'sub:old']), `연결 마무리 후 실제 타일만: ${ids.join(', ')}`);
    const st = await q.locator('#status').textContent();
    ok(/^Life Hub · /.test(st), '상태 줄: ' + st);
    ok(await q.locator('.w[data-id="sub:old"] .staleb').textContent() === '오래됨 · 20일 전' && !(await q.locator('.w[data-id="animan:now"] .staleb').count()), '오래된 앱 목록에만 오래됨 표시');
    await q.screenshot({ path: 'shots/hub-connected.png' });
    // 토큰이 거부되면: 앱 타일을 비우고(예시로 돌아가지 않음) '연결 끊김'
    tilesStatus = 401;
    await q.evaluate(() => { const t = JSON.parse(localStorage.getItem('board.lifehub.tokens.v1')); t.access_expires_at = 0; localStorage.setItem('board.lifehub.tokens.v1', JSON.stringify(t)); });
    await q.reload(); await q.waitForSelector('.w[data-id="board:weather"]'); await q.waitForTimeout(400);
    const left = await q.evaluate(() => [...document.querySelectorAll('.grid > .w')].map((t) => t.dataset.id).filter((id) => !id.startsWith('board:')));
    const st2 = await q.locator('#status').textContent();
    const tokens = await q.evaluate(() => localStorage.getItem('board.lifehub.tokens.v1'));
    ok(left.length === 0 && /연결 끊김/.test(st2) && tokens === null, `연결 끊김: 앱 타일 ${left.length}개, 토큰 지움, 상태 "${st2}"`);
    await q.close();
  }

  // 휴대폰
  const ph = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const perr = []; ph.on('pageerror', (e) => perr.push(e.message));
  await ph.goto(URL); await ph.waitForSelector('.w'); await ph.waitForTimeout(500);
  const pm = await ph.evaluate(() => ({ h: document.documentElement.scrollWidth > innerWidth + 1, unit: getComputedStyle(document.documentElement).getPropertyValue('--unit') }));
  ok(!pm.h && perr.length === 0, `휴대폰: 가로 넘침 없음 (칸 ${pm.unit}) ${perr.join(' | ')}`);
  await ph.screenshot({ path: 'shots/phone.png', fullPage: true });
  await ph.close();
} finally { await b.close(); srv.kill(); }
if (fail) { console.error(`${fail}개 실패`); process.exit(1); }
console.log('모두 통과');
