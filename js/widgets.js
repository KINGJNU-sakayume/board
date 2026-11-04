// 보드 자체 타일(어느 앱에도 속하지 않는 위젯). 결과는 앱 타일과 같은 규격(schema.js)으로 만들어 같은 렌더러로 그린다.
// 설정값(위치, 팀, 시간표 …)은 이 브라우저의 localStorage 에만 저장된다. 저장소(공개)에는 들어가지 않는다.

const KEY = 'board.widgets.v1';
export function allSettings() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } }
export function settingsOf(id) { return allSettings()[id] || {}; }
export function saveSettings(id, value) {
  const all = allSettings(); all[id] = value;
  try { localStorage.setItem(KEY, JSON.stringify(all)); return true; } catch (e) { return false; }
}

const pad2 = (n) => String(n).padStart(2, '0');
const hm = (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
const won = (n) => Math.round(n).toLocaleString('ko-KR');
async function getJSON(url) {
  const r = await fetch(url, { headers: { accept: 'application/json' }, referrerPolicy: 'no-referrer' });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}

/* ---------- 날씨: Open-Meteo (키 없음) ---------- */
const WMO = [[0, '맑음'], [1, '대체로 맑음'], [2, '구름 조금'], [3, '흐림'], [48, '안개'], [57, '이슬비'], [67, '비'], [77, '눈'], [82, '소나기'], [86, '눈 소나기'], [99, '뇌우']];
const wmo = (c) => (WMO.find(([max]) => c <= max) || [0, '날씨 정보'])[1];

async function geocode(name) {
  const j = await getJSON('https://geocoding-api.open-meteo.com/v1/search?count=1&language=ko&name=' + encodeURIComponent(name));
  const g = j && j.results && j.results[0];
  if (!g) throw new Error('지역을 찾지 못했어요');
  return { lat: +g.latitude.toFixed(3), lon: +g.longitude.toFixed(3), place: g.name };
}

const weather = {
  id: 'weather', name: '날씨', tone: 'type', form: 'num', sizes: ['1x1', '2x1', '2x2', '4x1'], size: '2x2',
  fields: [
    { key: 'place', label: '지역 이름', type: 'text', hint: '예: 서울. 위도·경도를 비우면 이 이름으로 찾아요.' },
    { key: 'lat', label: '위도', type: 'number', step: 'any' },
    { key: 'lon', label: '경도', type: 'number', step: 'any' },
  ],
  locate: true,
  ready: (s) => Number.isFinite(+s.lat) && Number.isFinite(+s.lon) && s.lat !== '' && s.lon !== '',
  async prepare(s) { if ((s.lat === '' || s.lon === '' || s.lat == null) && s.place) Object.assign(s, await geocode(s.place)); return s; },
  empty: { label: '날씨', value: '?°', caption: '위치를 정해 주세요', sub: '눌러서 설정' },
  async load(s) {
    const u = 'https://api.open-meteo.com/v1/forecast?latitude=' + (+s.lat) + '&longitude=' + (+s.lon) +
      '&current=temperature_2m,apparent_temperature,weather_code&hourly=temperature_2m&daily=temperature_2m_max,temperature_2m_min&forecast_days=2&timezone=auto';
    const j = await getJSON(u), c = j.current, hrs = j.hourly, d = j.daily;
    const i0 = hrs.time.findIndex((t) => t > c.time);
    const foot = i0 < 0 ? undefined : hrs.time.slice(i0, i0 + 4).map((t, k) => ({ k: +t.slice(11, 13) + '시', v: Math.round(hrs.temperature_2m[i0 + k]) + '°' }));
    return {
      label: `${s.place || '내 위치'} · ${c.time.slice(11, 16)} 기준`,
      value: Math.round(c.temperature_2m) + '°', caption: wmo(c.weather_code),
      sub: `체감 ${Math.round(c.apparent_temperature)}° · 최고 ${Math.round(d.temperature_2m_max[0])}° / 최저 ${Math.round(d.temperature_2m_min[0])}°`,
      foot,
    };
  },
};

/* ---------- 스포츠: TheSportsDB v1 (무료 키 123 은 홈 경기만 보여준다) ---------- */
function eventTime(e) {
  if (e.strTimestamp) { const t = Date.parse(/Z|[+-]\d\d:?\d\d$/.test(e.strTimestamp) ? e.strTimestamp : e.strTimestamp + 'Z'); if (!Number.isNaN(t)) return new Date(t); }
  if (e.dateEvent) { const t = Date.parse(e.dateEvent + 'T' + (e.strTime || '00:00:00') + 'Z'); if (!Number.isNaN(t)) return new Date(t); }
  return null;
}
const md = (d) => `${d.getMonth() + 1}월 ${d.getDate()}일`;
const sports = {
  id: 'sports', name: '스포츠', tone: 'type', form: 'line', sizes: ['2x1', '4x1'], size: '4x1',
  fields: [
    { key: 'teamId', label: '팀 번호 (TheSportsDB)', type: 'text', hint: 'thesportsdb.com 에서 팀 페이지 주소의 숫자' },
    { key: 'teamName', label: '표시할 팀 이름', type: 'text' },
    { key: 'apiKey', label: 'API 키', type: 'text', hint: '비우면 무료 키 123 (홈 경기만 나와요)' },
  ],
  ready: (s) => /^\d{1,10}$/.test(String(s.teamId || '')),
  empty: { label: '스포츠', title: '팀을 정해 주세요', sub: '눌러서 설정' },
  async load(s) {
    const key = /^[A-Za-z0-9]{1,40}$/.test(s.apiKey || '') ? s.apiKey : '123', base = 'https://www.thesportsdb.com/api/v1/json/' + key + '/';
    const [last, next] = await Promise.all([getJSON(base + 'eventslast.php?id=' + s.teamId), getJSON(base + 'eventsnext.php?id=' + s.teamId).catch(() => null)]);
    const L = last && Array.isArray(last.results) ? last.results[0] : null;
    const N = next && Array.isArray(next.events) ? next.events[0] : null;
    const label = `${s.teamName || '우리 팀'} · ${hm(new Date())} 기준`;
    if (!L && !N) return { label, title: '경기 정보가 없어요' };
    let title = '최근 경기 정보 없음', pill;
    if (L) {
      const hs = L.intHomeScore, as = L.intAwayScore;
      title = `${L.strHomeTeam} ${hs ?? '–'} : ${as ?? '–'} ${L.strAwayTeam}`;
      if (hs != null && as != null) {
        const home = String(L.idHomeTeam) === String(s.teamId), my = home ? +hs : +as, op = home ? +as : +hs;
        pill = my > op ? '승' : my < op ? '패' : '무';
      }
    }
    let sub;
    if (N) { const t = eventTime(N); sub = `다음 경기 ${t ? md(t) + ' ' + hm(t) : (N.dateEvent || '')} · ${String(N.idHomeTeam) === String(s.teamId) ? '홈' : '원정'}`; }
    return { label, title, pill, sub };
  },
};

/* ---------- 시간표: 직접 입력 ---------- */
const DAYS = '일월화수목금토';
function parseTimetable(text) {
  return String(text || '').split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
    const m = l.match(/^(매일|[일월화수목금토]+)\s+(\d{1,2}):(\d{2})\s+(.+)$/);
    if (!m) return null;
    return { days: m[1] === '매일' ? DAYS : m[1], min: +m[2] * 60 + +m[3], time: pad2(+m[2]) + ':' + m[3], title: m[4].slice(0, 40) };
  }).filter(Boolean);
}
const timetable = {
  id: 'timetable', name: '시간표', tone: 'type', form: 'list', sizes: ['2x1', '2x2'], size: '2x2',
  fields: [{ key: 'text', label: '일정 (한 줄에 하나)', type: 'textarea', hint: '예) 월수 09:00 강의 A\n화목 13:00 실습 B\n매일 16:30 스터디' }],
  ready: (s) => parseTimetable(s.text).length > 0,
  empty: { label: '시간표 · 오늘', rows: [{ title: '일정을 넣어 주세요', muted: true }], foot: '눌러서 설정' },
  async load(s, now = new Date()) {
    const all = parseTimetable(s.text), today = DAYS[now.getDay()], tomorrow = DAYS[(now.getDay() + 1) % 7];
    const items = all.filter((x) => x.days.includes(today)).sort((a, b) => a.min - b.min);
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const rows = items.map((x, i) => {
      const end = i + 1 < items.length ? items[i + 1].min : x.min + 60;
      if (nowMin >= end) return { time: x.time, title: x.title, value: '끝남', muted: true };
      if (nowMin >= x.min) return { time: x.time, title: x.title, now: true };
      const left = x.min - nowMin;
      return { time: x.time, title: x.title, value: left >= 60 ? Math.floor(left / 60) + '시간 뒤' : left + '분 뒤' };
    });
    // 지난 일정이 많으면 앞에서부터 줄여 지금·다음이 보이게 한다
    const firstLive = rows.findIndex((r) => !r.muted);
    const shown = firstLive > 1 ? rows.slice(firstLive - 1) : rows;
    const next = all.filter((x) => x.days.includes(tomorrow)).sort((a, b) => a.min - b.min)[0];
    return {
      label: '시간표 · 오늘',
      rows: shown.length ? shown.slice(0, 12) : [{ title: '오늘은 일정이 없어요', muted: true }],
      foot: next ? `내일 첫 일정 ${next.time}` : '내일 일정 없음',
    };
  },
};

/* ---------- 가격 추적: 직접 입력 ---------- */
const price = {
  id: 'price', name: '가격 추적', tone: 'type', form: 'num', sizes: ['1x1', '2x1'], size: '2x1',
  fields: [
    { key: 'item', label: '물건 이름', type: 'text' },
    { key: 'price', label: '지금 가격 (원)', type: 'number', step: '1' },
    { key: 'target', label: '목표 가격 (원, 선택)', type: 'number', step: '1' },
  ],
  ready: (s) => !!s.item && Number(s.price) > 0,
  empty: { label: '가격 추적', value: '–', unit: '원', sub: '눌러서 물건을 넣어 주세요' },
  async load(s) {
    const p = Number(s.price), t = Number(s.target);
    return {
      label: '가격 · ' + String(s.item).slice(0, 30), value: won(p), unit: '원',
      sub: t > 0 ? (p <= t ? `목표 ${won(t)} 도달` : `목표 ${won(t)} · ${won(p - t)} 남음`) : undefined,
    };
  },
};

/* ---------- D-day: 직접 입력 ---------- */
const dday = {
  id: 'dday', name: 'D-day', tone: 'type', form: 'num', sizes: ['1x1', '2x1'], size: '1x1',
  fields: [{ key: 'title', label: '이름', type: 'text' }, { key: 'date', label: '날짜', type: 'date' }],
  ready: (s) => !!s.title && /^\d{4}-\d{2}-\d{2}$/.test(s.date || ''),
  empty: { label: 'D-day', value: 'D-?', sub: '눌러서 날짜를 넣어 주세요' },
  async load(s, now = new Date()) {
    const [y, m, d] = s.date.split('-').map(Number);
    const days = Math.round((new Date(y, m - 1, d) - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 864e5);
    return { label: String(s.title).slice(0, 30), value: days === 0 ? 'D-day' : days > 0 ? `D-${days}` : `D+${-days}`, sub: `${y}년 ${m}월 ${d}일` };
  },
};

export const WIDGETS = [weather, timetable, sports, price, dday];

/** 위젯 하나의 타일 정의(검증 전). 설정 전이거나 불러오기에 실패하면 그 상태를 그대로 보여준다(가짜 값 없음). */
export async function widgetDef(w) {
  const s = settingsOf(w.id);
  const base = { id: w.id, name: w.name, tone: w.tone, form: w.form, sizes: w.sizes, size: w.size };
  if (!w.ready(s)) return { ...base, data: w.empty, __needsSetup: true };
  try { return { ...base, data: await w.load(s) }; } catch (e) {
    const fail = w.form === 'list' ? { label: w.name, rows: [{ title: '불러오지 못했어요', muted: true }], foot: String(e.message || e).slice(0, 80) }
      : w.form === 'num' ? { label: w.name, value: '–', sub: '불러오지 못했어요' }
        : { label: w.name, title: '불러오지 못했어요', sub: String(e.message || e).slice(0, 80) };
    return { ...base, data: fail, __failed: true };
  }
}
