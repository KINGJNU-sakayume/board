// 포인트색: 앱이 accent {h, s} 를 보내면 그것을 쓴다. 없으면 표지 이미지에서 뽑아 본다.
// 다른 출처 이미지는 CORS 때문에 캔버스가 막히는 경우가 많다. 그때는 조용히 무채색(--s:0)으로 남는다.

export function sample(img) {
  try {
    const n = 32, c = document.createElement('canvas'); c.width = c.height = n;
    const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0, n, n);
    const d = x.getImageData(0, 0, n, n).data; let sx = 0, sy = 0, sw = 0, ss = 0;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255;
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, df = mx - mn;
      if (df < 0.08) continue;
      const den = 1 - Math.abs(2 * l - 1); if (den < 0.001) continue;
      const s = df / den; let hh;
      if (mx === r) hh = ((g - b) / df) % 6; else if (mx === g) hh = (b - r) / df + 2; else hh = (r - g) / df + 4;
      hh *= 60; if (hh < 0) hh += 360;
      const w = s * den, a = hh * Math.PI / 180;
      sx += Math.cos(a) * w; sy += Math.sin(a) * w; sw += w; ss += s * w;
    }
    if (!sw) return null;
    let H = Math.atan2(sy, sx) * 180 / Math.PI; if (H < 0) H += 360;
    return { h: Math.round(H), s: Math.min(0.72, Math.max(0.42, ss / sw)) };
  } catch (e) { return null; }
}

export function applyAccent(tile, def) {
  const set = (a) => { tile.style.setProperty('--h', a.h); tile.style.setProperty('--s', a.s); };
  if (def.accent) { set(def.accent); return; }
  tile.style.removeProperty('--h'); tile.style.removeProperty('--s');
  if (!['sleeve', 'hero'].includes(def.tone)) return;
  const img = tile.querySelector('.cover img, img.bg');
  if (!img) return;
  const go = () => { const a = sample(img); if (a) set(a); };
  if (img.complete && img.naturalWidth) go(); else img.addEventListener('load', go, { once: true });
}
