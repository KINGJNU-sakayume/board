// 면 전환: 앞면(지금 하는 것) ↔ 뒷면(최근 목록). sleeve 타일에 list 가 있을 때만.
// 넓으면(4칸) 두 면을 나란히, 작으면(1칸 폭이나 1칸 높이) 앞면만, 중간이면 7초마다 번갈아 보여준다.
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

export function setupFaces(tile, isPaused) {
  const f1 = tile.querySelector('.f1'), f2 = tile.querySelector('.f2');
  if (!f1 || !f2) { tile.removeAttribute('data-faces'); return; }
  tile.setAttribute('data-faces', '');
  if (!tile.getAttribute('data-face')) tile.setAttribute('data-face', '1');
  const mode = () => { const w = tile.clientWidth, hh = tile.clientHeight; return w >= 500 ? 'both' : (w < 200 || hh < 200) ? 'one' : 'rotate'; };
  const show = (n) => {
    tile.setAttribute('data-face', n);
    f1.setAttribute('aria-hidden', n === 1 ? 'false' : 'true'); f2.setAttribute('aria-hidden', n === 2 ? 'false' : 'true');
  };
  const sync = () => {
    const m = mode();
    if (m === 'both') { f1.setAttribute('aria-hidden', 'false'); f2.setAttribute('aria-hidden', 'false'); }
    else if (m === 'one') show(1); else show(+tile.getAttribute('data-face') || 1);
  };
  tile.__facesSync = sync;
  if (!tile.__facesOn) {
    tile.__facesOn = true; tile.__hold = false;
    ['mouseenter', 'focusin'].forEach((t) => tile.addEventListener(t, () => { tile.__hold = true; }));
    ['mouseleave', 'focusout'].forEach((t) => tile.addEventListener(t, () => { tile.__hold = false; }));
    setInterval(() => {
      if (!tile.__facesSync || !tile.hasAttribute('data-faces') || mode() !== 'rotate' || tile.__hold || isPaused() || document.hidden || reduce.matches) return;
      show(tile.getAttribute('data-face') === '1' ? 2 : 1);
    }, 7000);
    if (window.ResizeObserver) new ResizeObserver(() => tile.__facesSync && tile.__facesSync()).observe(tile);
  }
  sync();
}
