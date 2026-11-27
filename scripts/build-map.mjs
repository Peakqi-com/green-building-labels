import { geoNaturalEarth1, geoContains } from 'd3-geo';
import { feature } from 'topojson-client';
import { readFileSync, writeFileSync } from 'node:fs';
const topo = JSON.parse(readFileSync('node_modules/world-atlas/land-110m.json', 'utf8'));
const land = feature(topo, topo.objects.land);
const W = 1000, H = 520, S = 11;
const proj = geoNaturalEarth1().fitSize([W, H], { type: 'Sphere' });
const dots = [];
for (let y = S / 2; y < H; y += S) for (let x = S / 2; x < W; x += S) {
  const ll = proj.invert([x, y]);
  if (ll && ll[1] > -60 && geoContains(land, ll)) dots.push([Math.round(x), Math.round(y)]);
}
const labels = JSON.parse(readFileSync('src/labels.json', 'utf8'));
const pins = labels.map(l => { const [x, y] = proj([l.lon, l.lat]); return { id: l.id, x, y }; });
for (let it = 0; it < 120; it++) for (const a of pins) for (const b of pins) {
  if (a === b) continue;
  const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 0.1, min = 20;
  if (d < min) { const k = (min - d) / d / 2; a.x -= dx * k; a.y -= dy * k; b.x += dx * k; b.y += dy * k; }
}
writeFileSync('src/map.json', JSON.stringify({ w: W, h: H, dots, pins: pins.map(p => ({ id: p.id, x: +p.x.toFixed(1), y: +p.y.toFixed(1) })) }));
console.log('dots', dots.length);
