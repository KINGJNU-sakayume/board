// 화면을 꽉 채우는 격자. PC는 세로 칸 수(rows)를 화면 높이에 맞추고 가로로 늘어난다.
// 휴대폰(폭 640px 이하)은 2열 세로 스크롤이고, 4칸 폭 타일은 2칸으로 접힌다.
// 칸 한 개는 120~170px 사이로 둔다. 타일 안 배치(컨테이너 쿼리)가 1칸 < 200px, 2칸 200~499px, 4칸 >= 500px 을 전제로 하기 때문.

export const PHONE = window.matchMedia('(max-width: 640px)');
const MIN = 120, MAX = 170;
const state = { unit: 136, gap: 10, rows: 4, cols: 4 };

export function metrics() { return state; }

export function fit(scroller) {
  const root = document.documentElement, cs = getComputedStyle(root);
  state.gap = parseFloat(cs.getPropertyValue('--gap')) || 10;
  if (PHONE.matches) {
    const pad = parseFloat(cs.getPropertyValue('--pad')) || 16;
    state.cols = 2; state.rows = 0;
    state.unit = Math.floor((root.clientWidth - pad * 2 - state.gap) / 2);
  } else {
    const grid = scroller.querySelector('.grid');
    const H = grid ? grid.clientHeight : scroller.clientHeight - 40;
    let rows = Math.max(2, Math.ceil((H + state.gap) / (MAX + state.gap)));
    let unit = (H - (rows - 1) * state.gap) / rows;
    if (unit < MIN && rows > 2) { rows -= 1; unit = (H - (rows - 1) * state.gap) / rows; }
    state.rows = rows; state.cols = 4;
    state.unit = Math.floor(Math.min(MAX, Math.max(96, unit)));
  }
  root.style.setProperty('--unit', state.unit + 'px');
  root.style.setProperty('--rows', String(state.rows || 1));
  root.classList.toggle('phone', PHONE.matches);
  return state;
}

export function watch(scroller, onChange) {
  let raf = 0;
  const run = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { fit(scroller); onChange && onChange(state); }); };
  window.addEventListener('resize', run);
  PHONE.addEventListener('change', run);
  run();
}
