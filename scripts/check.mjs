// npm run check — 문법 검사, 예시 데이터 규격 검사, CSP 와 설정의 출처 목록이 맞는지 확인.
import { readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { CONFIG } from '../js/config.js';
import { validateManifest, validateTile } from '../js/schema.js';

let fail = 0;
const ok = (c, m) => { if (!c) { fail++; console.error('✗ ' + m); } else console.log('✓ ' + m); };

for (const f of readdirSync('js')) execFileSync(process.execPath, ['--check', 'js/' + f]);
ok(true, 'js/*.js 문법');

const policy = { imageOrigins: CONFIG.imageOrigins, linkOrigins: CONFIG.linkOrigins };
const pack = JSON.parse(readFileSync('data/sample-tiles.json', 'utf8'));
let n = 0;
for (const m of pack.manifests) {
  const v = validateManifest(m, policy);
  ok(v.ok && v.errors.length === 0, `예시 ${m.app}: 타일 ${v.tiles.length}개${v.errors.length ? ' — ' + v.errors.map((e) => e.message).join('; ') : ''}`);
  n += v.tiles.length;
}
ok(n > 0, `예시 타일 합계 ${n}개`);

// 틀린 입력은 막혀야 한다 (fail closed)
const bad = [
  [{ id: 'X', name: 'a', tone: 'type', form: 'num', sizes: ['1x1'], data: { label: 'a', value: 1 } }, '대문자 id'],
  [{ id: 'a', name: 'a', tone: 'type', form: 'num', sizes: ['3x3'], data: { label: 'a', value: 1 } }, '없는 크기'],
  [{ id: 'a', name: 'a', tone: 'type', form: 'num', sizes: ['1x1'], size: '2x1', data: { label: 'a', value: 1 } }, 'sizes 밖의 size'],
  [{ id: 'a', name: 'a', tone: 'glass', sizes: ['1x1'], data: {} }, '없는 톤'],
  [{ id: 'a', name: 'a', tone: 'type', form: 'num', sizes: ['1x1'], href: 'https://evil.example/', data: { label: 'a', value: 1 } }, '허용 안 된 링크'],
  [{ id: 'a', name: 'a', tone: 'type', form: 'num', sizes: ['1x1'], href: 'javascript:alert(1)', data: { label: 'a', value: 1 } }, 'javascript: 링크'],
  [{ id: 'a', name: 'a', tone: 'type', form: 'cells', sizes: ['2x1'], data: { label: 'a', total: 3, filled: 4 } }, 'filled > total'],
  [{ id: 'a', name: 'a', tone: 'sleeve', sizes: ['2x2'], data: { label: 'a', title: 'b' } }, 'sleeve 표지 없음'],
  [{ id: 'a', name: 'a', tone: 'sleeve', sizes: ['2x2'], data: { label: 'a', title: 'b', cover: {} } }, 'src·mono 둘 다 없는 표지'],
  [{ id: 'a', name: 'a', tone: 'type', form: 'line', sizes: ['2x1'], data: { label: 'a', title: 'b', sub: '' } }, '빈 글자(선택 필드라도)'],
];
for (const [t, why] of bad) { let threw = false; try { validateTile(t, 't', policy); } catch { threw = true; } ok(threw, '막힘: ' + why); }
const off = validateTile({ id: 'a', name: 'a', tone: 'strip', sizes: ['2x1'], data: { label: 'a', items: [{ title: 'x', cover: { src: 'https://evil.example/a.jpg' } }] } }, 't', policy);
ok(off.data.items[0].cover.src === undefined, '허용 안 된 이미지 출처는 글자 칸으로');
const monoOnly = validateTile({ id: 'a', name: 'a', tone: 'hero', sizes: ['2x2'], data: { label: 'a', title: '봄', cover: { mono: '봄' } } }, 't', policy);
ok(monoOnly.data.cover.src === undefined && monoOnly.data.cover.mono === '봄', '주소 없는 표지({mono})는 hero·sleeve 를 살린다');
// 검사 기준(policy)을 빼먹으면 타일이 모두 빠지는데도 ok 가 true — 앱 테스트가 errors 를 봐야 하는 이유
const noPolicy = validateManifest({ version: 1, app: 'a', generated_at: '2026-01-01T00:00:00Z', tiles: [{ id: 'a', name: 'a', tone: 'type', form: 'num', sizes: ['1x1'], href: 'https://kingjnu-sakayume.github.io/a/', data: { label: 'a', value: 1 } }] });
ok(noPolicy.ok && noPolicy.tiles.length === 0 && noPolicy.errors.length === 1, 'policy 없이 부르면 ok 인데 타일 0개(앱 테스트 주의 사항)');
ok(validateManifest({ version: 2, app: 'a', generated_at: '2026-01-01T00:00:00Z', tiles: [] }, policy).tiles.length === 0 && !validateManifest({ version: 2, app: 'a', generated_at: '2026-01-01T00:00:00Z', tiles: [] }, policy).ok, '모르는 version 은 통째로 거절');

// CSP 의 img-src / connect-src 가 설정과 맞는지
const html = readFileSync('index.html', 'utf8');
const csp = (html.match(/Content-Security-Policy" content="([^"]+)"/) || [])[1] || '';
const imgSrc = (csp.match(/img-src ([^;]+)/) || [])[1] || '';
for (const o of CONFIG.imageOrigins) ok(imgSrc.split(/\s+/).includes(o), 'CSP img-src 에 ' + o);
for (const o of ['https://api.open-meteo.com', 'https://geocoding-api.open-meteo.com', 'https://www.thesportsdb.com']) ok(csp.includes(o), 'CSP connect-src 에 ' + o);
ok(!/style=/.test(html.replace(/<meta[^>]+>/g, '')), 'index.html 에 인라인 style 없음 (CSP style-src self)');
ok((csp.match(/connect-src ([^;]+)/) || [])[1]?.split(/\s+/).includes(CONFIG.hub.origin), 'CSP connect-src 에 Life Hub ' + CONFIG.hub.origin);

// Life Hub 클라이언트 문서·콜백이 설정과 맞는지 (life-hub 는 정확히 이 redirect URI 로 프로필을 고른다)
const cimd = JSON.parse(readFileSync('lifehub-client.json', 'utf8'));
ok(cimd.client_id === CONFIG.hub.appUrl + 'lifehub-client.json', 'lifehub-client.json client_id');
ok(JSON.stringify(cimd.redirect_uris) === JSON.stringify([CONFIG.hub.appUrl + 'lifehub/']), 'lifehub-client.json redirect_uris');
ok(cimd.token_endpoint_auth_method === 'none' && cimd.grant_types.includes('refresh_token'), 'lifehub-client.json 공개 클라이언트');
const hubJs = readFileSync('js/hub.js', 'utf8'), cb = readFileSync('lifehub/index.html', 'utf8');
const key = (hubJs.match(/CALLBACK_KEY = '([^']+)'/) || [])[1];
ok(key && cb.includes(`'${key}'`), '콜백 페이지와 js/hub.js 가 같은 sessionStorage 키를 씀');
ok(readFileSync('.github/workflows/pages.yml', 'utf8').includes('lifehub lifehub-client.json'), 'Pages 배포에 lifehub/ 와 lifehub-client.json 포함');

if (fail) { console.error(`\n${fail}개 실패`); process.exit(1); }
console.log('\n모두 통과');
