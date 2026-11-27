import './style.css';
import Lenis from 'lenis';
import { animate, scroll } from 'motion';
import labels from './labels.json';
import map from './map.json';

type Label = (typeof labels)[number];
const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector(s) as T;
const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => [...r.querySelectorAll(s)] as T[];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const lowEnd = (navigator.hardwareConcurrency || 8) <= 2 || ((navigator as any).deviceMemory || 8) < 2;

const REGION: Record<string, [string, string]> = {
  asia: ['亞洲', '#2F9E5B'], europe: ['歐洲', '#4FB3DE'], americas: ['美洲', '#E8A100'],
  oceania: ['大洋洲', '#7C9A3B'], mideast: ['中東', '#C9772B'], global: ['全球', '#15372A'],
};
const FOCUS: Record<string, string> = { all: '綜合評估', energy: '能源效率', health: '健康福祉', regen: '再生零碳' };
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/* ---------- 平滑滾動 ---------- */
let lenis: Lenis | null = null;
if (!reduce) {
  lenis = new Lenis({ lerp: 0.12 });
  const raf = (t: number) => { lenis!.raf(t); requestAnimationFrame(raf); };
  requestAnimationFrame(raf);
}
const goTo = (el: Element) => (lenis ? lenis.scrollTo(el as HTMLElement, { offset: -24 }) : el.scrollIntoView({ block: 'start' }));
$$<HTMLAnchorElement>('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
  const t = document.querySelector(a.getAttribute('href')!);
  if (t) { e.preventDefault(); goTo(t); (t as HTMLElement).focus?.({ preventScroll: true }); }
}));

/* ---------- Hero ---------- */
const hero = $('.hero');
const steps = $$('.hero-progress span');
const useGL = !reduce && !lowEnd && !!document.createElement('canvas').getContext('webgl2');
if (useGL) {
  hero.classList.add('gl');
  import('./hero').then(({ initHero }) => {
    const h = initHero($<HTMLCanvasElement>('#scene'));
    scroll((p: number) => h.setProgress(p), { target: hero, offset: ['start start', 'end end'] });
  });
}
if (!reduce) {
  const layers = $$('[data-depth]');
  scroll((p: number) => {
    layers.forEach(l => (l.style.transform = `translate3d(0, ${-p * 320 * +l.dataset.depth!}px, 0)`));
    steps.forEach((s, i) => s.classList.toggle('on', p > 0.05 + i * 0.24));
  }, { target: hero, offset: ['start start', 'end end'] });
} else steps.forEach(s => s.classList.add('on'));

/* ---------- 四大面向 ---------- */
const ASPECT: Record<string, [string, string]> = {
  eco: ['生態', '留住土地原本的生命力：保留大樹與多層次植栽、用透水鋪面讓雨水回到土壤，給鳥和昆蟲留一條綠色通道。'],
  energy: ['節能', '先靠設計少用電：遮陽、隔熱、自然通風，再用高效率空調照明，最後才用太陽能等再生能源補上。'],
  waste: ['減廢', '從建材開始算碳：結構輕量化、用再生建材、施工少產生廢土與廢棄物，拆除時也能回收再用。'],
  health: ['健康', '照顧住在裡面的人：充足採光、換氣與低逸散建材，再加上省水器具和雨水回收，讓室內舒服又安心。'],
};
const aspectText = $('.aspect-text');
function setAspect(k: string) {
  $$('.aspect-tabs button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.a === k)));
  $$('.house .part').forEach(p => p.classList.toggle('lit', p.classList.contains(k)));
  aspectText.innerHTML = `<strong style="color:var(--${k})">${ASPECT[k][0]}</strong><p>${ASPECT[k][1]}</p>`;
  if (!reduce) animate(aspectText, { opacity: [0, 1], y: [8, 0] }, { duration: 0.35 });
}
$$('.aspect-tabs button').forEach(b => b.addEventListener('click', () => setAspect(b.dataset.a!)));
setAspect('eco');

/* ---------- 徽章 SVG ---------- */
function badge(l: Label, size = 120) {
  const c = REGION[l.region][1];
  const ring = `${l.en} ${l.country} ${l.year}`.toUpperCase();
  const fs = l.abbr.length > 9 ? 11.5 : l.abbr.length > 7 ? 13 : l.abbr.length > 5 ? 15 : l.abbr.length > 2 ? 21 : 26;
  return `<svg class="badge" width="${size}" height="${size}" viewBox="0 0 120 120" aria-hidden="true">
    <defs><path id="r-${l.id}-${size}" d="M60 60m-45 0a45 45 0 1 1 90 0a45 45 0 1 1-90 0"/></defs>
    <circle cx="60" cy="60" r="57" fill="${c}"/><circle cx="60" cy="60" r="35" fill="#F1F4EA"/>
    <circle cx="60" cy="60" r="52" fill="none" stroke="#F1F4EA" stroke-width="1" stroke-dasharray="2 3"/>
    <text font-size="7.4" letter-spacing="1" fill="#F1F4EA" font-family="Bricolage Grotesque, sans-serif" font-weight="700"><textPath href="#r-${l.id}-${size}" textLength="276">${esc(ring.slice(0, 54))}</textPath></text>
    <text x="60" y="${60 + fs * 0.35}" text-anchor="middle" font-size="${fs}" font-weight="800" fill="#15372A" font-family="Bricolage Grotesque, Noto Sans TC, sans-serif">${esc(l.abbr)}</text>
  </svg>`;
}

/* ---------- 地圖 ---------- */
const mapEl = $('#worldmap');
mapEl.innerHTML = `<svg viewBox="0 0 ${map.w} ${map.h}" role="group" aria-label="25 枚標章的發源地">
  <g fill="#c6d3b3">${map.dots.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.6"/>`).join('')}</g>
  ${map.pins.map(p => {
    const l = labels.find(l => l.id === p.id)!;
    return `<a href="#s-${l.id}" class="pin" data-id="${l.id}" aria-label="${esc(l.abbr)}（${l.country}）">
      <circle cx="${p.x}" cy="${p.y}" r="9" fill="${REGION[l.region][1]}" stroke="#F1F4EA" stroke-width="2.5"/>
      <text x="${p.x}" y="${p.y - 14}" text-anchor="middle">${esc(l.abbr)}</text></a>`;
  }).join('')}</svg>`;
$$<SVGAElement>('.pin', mapEl).forEach(a => a.addEventListener('click', e => {
  e.preventDefault();
  const s = $(`#s-${a.dataset.id}`);
  state.region = 'all'; state.focus = 'any'; renderChips(); filter();
  goTo(s);
  setTimeout(() => { s.classList.add('ping'); setTimeout(() => s.classList.remove('ping'), 1400); $<HTMLButtonElement>('.stamp-flip', s).focus({ preventScroll: true }); }, 700);
}));

/* ---------- 標章牆 ---------- */
const state = { region: 'all', focus: 'any' };
const stampsEl = $('#stamps');
stampsEl.innerHTML = labels.map(l => `<li class="stamp" id="s-${l.id}" data-region="${l.region}" data-focus="${l.focus}" tabindex="-1">
  <button class="stamp-flip" aria-pressed="false" aria-label="${esc(l.abbr)} ${esc(l.zh)}，翻面看重點">
    <span class="face front">${badge(l)}<strong>${esc(l.zh)}</strong><span class="meta">${l.country}｜${l.year}</span></span>
    <span class="face back"><strong>${esc(l.abbr)}</strong><span class="tag">${esc(l.tag)}</span><span class="lv">${l.levels.length} 個等級，最高「${esc(l.levels.at(-1)!)}」</span></span>
  </button>
  <button class="stamp-more" data-id="${l.id}">完整資料</button>
</li>`).join('');

$$<HTMLButtonElement>('.stamp-flip').forEach(b => b.addEventListener('click', () => {
  const on = b.getAttribute('aria-pressed') !== 'true';
  b.setAttribute('aria-pressed', String(on));
  const inner = [$('.front', b), $('.back', b)];
  if (reduce) { b.classList.toggle('flipped', on); return; }
  const sp = { type: 'spring', stiffness: 260, damping: 20 } as const;
  animate(inner[0], { transform: on ? ['rotateY(0deg)', 'rotateY(180deg)'] : ['rotateY(180deg)', 'rotateY(0deg)'] }, sp);
  animate(inner[1], { transform: on ? ['rotateY(-180deg)', 'rotateY(0deg)'] : ['rotateY(0deg)', 'rotateY(-180deg)'] }, sp);
}));

function renderChips() {
  const groups: Record<string, [string, string][]> = {
    region: [['all', '全部地區'], ...Object.entries(REGION).map(([k, v]) => [k, v[0]] as [string, string])],
    focus: [['any', '全部重點'], ...Object.entries(FOCUS)],
  };
  $$('.chips').forEach(c => {
    const key = c.dataset.key as 'region' | 'focus';
    c.innerHTML = groups[key].map(([k, t]) => `<button aria-pressed="${state[key] === k}" data-v="${k}">${t}</button>`).join('');
  });
}
function filter() {
  let n = 0;
  $$('.stamp').forEach(s => {
    const ok = (state.region === 'all' || s.dataset.region === state.region) && (state.focus === 'any' || s.dataset.focus === state.focus);
    s.hidden = !ok; if (ok) n++;
  });
  $('.count').textContent = n ? `顯示 ${n} 枚標章` : '沒有符合的標章，換一個地區或重點試試。';
  if (!reduce) animate($$('.stamp:not([hidden])'), { opacity: [0, 1], scale: [0.94, 1] }, { duration: 0.3, delay: (i: number) => Math.min(i, 12) * 0.025 });
}
$('.filters').addEventListener('click', e => {
  const b = (e.target as HTMLElement).closest('button');
  if (!b) return;
  const key = (b.parentElement as HTMLElement).dataset.key as 'region' | 'focus';
  state[key] = b.dataset.v!;
  renderChips(); filter();
});
renderChips(); filter();

/* ---------- 抽屜 ---------- */
const drawer = $('#drawer');
let lastFocus: HTMLElement | null = null;
function openDrawer(l: Label) {
  lastFocus = document.activeElement as HTMLElement;
  $('.drawer-body', drawer).innerHTML = `<div class="d-head">${badge(l, 96)}<div><h3 id="drawer-title">${esc(l.zh)}</h3><p class="d-en">${esc(l.en)}</p></div></div>
    <p class="d-tag">${esc(l.tag)}</p><p>${esc(l.desc)}</p>
    <dl><dt>地區</dt><dd>${l.country}</dd><dt>創立</dt><dd>${l.year} 年</dd><dt>主管機構</dt><dd>${esc(l.org)}</dd><dt>適用建築</dt><dd>${esc(l.types)}</dd></dl>
    <h4>評估面向</h4><ul class="pills">${l.aspects.map(a => `<li>${esc(a)}</li>`).join('')}</ul>
    <h4>分級（由低到高）</h4><ol class="steps">${l.levels.map(v => `<li>${esc(v)}</li>`).join('')}</ol>
    <p><a class="ext" href="${l.url}" target="_blank" rel="noopener">前往官方網站</a></p>`;
  drawer.hidden = false;
  document.documentElement.classList.add('lock');
  lenis?.stop();
  if (!reduce) {
    animate($('.drawer-panel', drawer), { x: ['100%', '0%'] }, { type: 'spring', stiffness: 300, damping: 32 });
    animate($('.drawer-bg', drawer), { opacity: [0, 1] }, { duration: 0.25 });
  }
  $<HTMLButtonElement>('.drawer-x', drawer).focus();
}
function closeDrawer() {
  drawer.hidden = true;
  document.documentElement.classList.remove('lock');
  lenis?.start();
  lastFocus?.focus({ preventScroll: true });
}
stampsEl.addEventListener('click', e => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>('.stamp-more');
  if (b) openDrawer(labels.find(l => l.id === b.dataset.id)!);
});
drawer.addEventListener('click', e => { if ((e.target as HTMLElement).closest('[data-close]')) closeDrawer(); });
addEventListener('keydown', e => {
  if (drawer.hidden) return;
  if (e.key === 'Escape') closeDrawer();
  if (e.key === 'Tab') {
    const f = $$<HTMLElement>('button, a[href]', drawer);
    const [first, last] = [f[0], f[f.length - 1]];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});

/* ---------- EEWH 圓環 ---------- */
const GROUPS = [
  { k: 'eco', n: '生態', items: [['生物多樣性', 9, '基地內保留生態跳島、多孔隙環境與多樣化原生植栽。'], ['綠化量', 9, '用植栽固碳量計算，喬木、灌木、屋頂與立面綠化都算。'], ['基地保水', 9, '透水鋪面、雨水滯留設施，讓土地像海綿一樣吸水。']] },
  { k: 'energy', n: '節能', items: [['日常節能', 32, '外殼隔熱遮陽、空調與照明效率，是配分最重、也是必要的指標。']] },
  { k: 'waste', n: '減廢', items: [['CO₂ 減量', 9, '結構合理化、輕量化與耐久化，降低建材生產的碳排。'], ['廢棄物減量', 9, '減少施工廢土與廢棄物，使用再生建材。']] },
  { k: 'health', n: '健康', items: [['室內環境', 12, '隔音、採光、通風換氣與低逸散的室內建材。'], ['水資源', 8, '省水器具、雨水與生活雜排水回收再利用，也是必要指標。'], ['污水垃圾改善', 3, '雨污水分流、垃圾集中與資源回收空間。']] },
] as const;
const ringEl = $('#ring'), ringInfo = $('.ring-info');
const total = 100, R = 140, r0 = 92;
let a0 = -Math.PI / 2, idx = 0;
const segs: string[] = [];
const arc = (a: number, b: number) => {
  const p = (rad: number, ang: number) => `${(rad * Math.cos(ang)).toFixed(2)} ${(rad * Math.sin(ang)).toFixed(2)}`;
  const big = b - a > Math.PI ? 1 : 0;
  return `M${p(R, a)}A${R} ${R} 0 ${big} 1 ${p(R, b)}L${p(r0, b)}A${r0} ${r0} 0 ${big} 0 ${p(r0, a)}Z`;
};
GROUPS.forEach(g => g.items.forEach(([name, w]) => {
  const a1 = a0 + (w / total) * Math.PI * 2;
  segs.push(`<path class="seg" tabindex="0" role="button" data-i="${idx++}" data-g="${g.k}" d="${arc(a0 + 0.012, a1 - 0.012)}" fill="var(--${g.k})" aria-label="${name}"/>`);
  a0 = a1;
}));
ringEl.innerHTML = segs.join('') + `<text class="ring-c" y="-6" text-anchor="middle">EEWH</text><text class="ring-s" y="22" text-anchor="middle">4 群 9 指標</text>`;
const flat = GROUPS.flatMap(g => g.items.map(it => ({ g, it })));
function showSeg(i: number) {
  const { g, it } = flat[i];
  $$('.seg', ringEl).forEach(s => s.classList.toggle('on', +s.dataset.i! === i));
  ringInfo.innerHTML = `<span class="ri-g" style="--c:var(--${g.k})">${g.n}</span><h3>${it[0]}</h3><p>${it[2]}</p><p class="ri-w">試算配分約 ${it[1]} 分</p>`;
}
$$('.seg', ringEl).forEach(s => {
  s.addEventListener('click', () => showSeg(+s.dataset.i!));
  s.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showSeg(+s.dataset.i!); } });
});
showSeg(3);

/* ---------- 等級試算 ---------- */
const LEVELS: [number, string, string][] = [[20, '合格級', '#9BB886'], [37, '銅級', '#B87333'], [45, '銀級', '#A7B1B7'], [53, '黃金級', '#FFC233'], [64, '鑽石級', '#8ED1EE']];
const slidersEl = $('#sliders');
slidersEl.innerHTML = GROUPS.map(g => {
  const max = g.items.reduce((s, it) => s + it[1], 0);
  return `<label style="--c:var(--${g.k})"><span>${g.n}<output>0</output><small>／${max}</small></span>
    <input type="range" min="0" max="${max}" value="${Math.round(max * 0.4)}" data-g="${g.k}"></label>`;
}).join('');
$('#levels').innerHTML = LEVELS.map(([s, n, c]) => `<li style="--c:${c}"><b>${n}</b><span>${s} 分以上</span></li>`).join('');
const medal = $('#medal');
let prevLevel = '';
function calc() {
  let sum = 0;
  $$<HTMLInputElement>('input', slidersEl).forEach(i => {
    sum += +i.value;
    (i.previousElementSibling!.querySelector('output') as HTMLOutputElement).value = i.value;
    i.style.setProperty('--p', `${(+i.value / +i.max) * 100}%`);
  });
  const hit = [...LEVELS].reverse().find(([s]) => sum >= s);
  $('.medal-score', medal).textContent = String(sum);
  $('.medal-level', medal).textContent = hit ? hit[1] : '未達合格';
  medal.style.setProperty('--c', hit ? hit[2] : '#d7dfc6');
  $$('#levels li').forEach((li, i) => li.classList.toggle('on', !!hit && LEVELS[i][1] === hit[1]));
  const lv = hit?.[1] || '';
  if (lv !== prevLevel && !reduce) animate(medal, { scale: [0.86, 1], rotate: [-8, 0] }, { type: 'spring', stiffness: 400, damping: 14 });
  prevLevel = lv;
}
slidersEl.addEventListener('input', calc);
calc();

/* ---------- 比較表 ---------- */
const tbody = $('#table tbody'), acc = $('#acc');
let sortKey = '', asc = true;
function renderTable() {
  const rows = [...labels];
  if (sortKey) rows.sort((a, b) => {
    const va = sortKey === 'levels' ? a.levels.length : sortKey === 'year' ? +a.year : (a as any)[sortKey];
    const vb = sortKey === 'levels' ? b.levels.length : sortKey === 'year' ? +b.year : (b as any)[sortKey];
    return (va > vb ? 1 : va < vb ? -1 : 0) * (asc ? 1 : -1);
  });
  tbody.innerHTML = rows.map(l => `<tr><th scope="row"><span class="dot" style="background:${REGION[l.region][1]}"></span>${esc(l.abbr)}<small>${esc(l.zh)}</small></th>
    <td>${l.country}</td><td>${l.year}</td><td>${l.levels.length}</td><td>${esc(l.levels.at(-1)!)}</td><td>${l.aspects.slice(0, 4).map(esc).join('、')}${l.aspects.length > 4 ? ' 等' : ''}</td></tr>`).join('');
  acc.innerHTML = rows.map(l => `<details><summary><span class="dot" style="background:${REGION[l.region][1]}"></span><b>${esc(l.abbr)}</b><span>${l.country}｜${l.year}</span></summary>
    <dl><dt>中文名</dt><dd>${esc(l.zh)}</dd><dt>分級</dt><dd>${l.levels.map(esc).join('、')}</dd><dt>評估重點</dt><dd>${l.aspects.map(esc).join('、')}</dd></dl></details>`).join('');
}
$$<HTMLButtonElement>('[data-sort]').forEach(b => b.addEventListener('click', () => {
  asc = sortKey === b.dataset.sort ? !asc : true;
  sortKey = b.dataset.sort!;
  $$('th[aria-sort]').forEach(th => th.removeAttribute('aria-sort'));
  b.parentElement!.setAttribute('aria-sort', asc ? 'ascending' : 'descending');
  renderTable();
}));
renderTable();
$('.legend').innerHTML = Object.values(REGION).map(([n, c]) => `<li><span class="dot" style="background:${c}"></span>${n}</li>`).join('');
