import { chromium } from 'playwright-core';
const [url, tag] = process.argv.slice(2);
const exe = process.env.CHROME;
const b = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const [name, vp, scale] of [['d', { width: 1440, height: 900 }, 0.5], ['m', { width: 390, height: 844 }, 1]]) {
  const p = await b.newPage({ viewport: vp, deviceScaleFactor: scale });
  p.on('console', m => m.type() === 'error' && console.log('console:', m.text()));
  p.on('pageerror', e => console.log('pageerror:', e.message));
  await p.goto(url, { waitUntil: 'networkidle' });
  await p.waitForTimeout(1200);
  const H = await p.evaluate(() => document.querySelector('.hero').offsetHeight - innerHeight);
  for (const f of [0, 0.5, 1]) {
    await p.evaluate(y => window.scrollTo(0, y), H * f); await p.waitForTimeout(1500);
    await p.screenshot({ path: `../screenshots/${tag}-${name}-hero${f * 100}.png` });
  }
  for (const s of ['#what', '#map', '#wall', '#eewh', '#compare']) {
    await p.evaluate(sel => document.querySelector(sel).scrollIntoView(), s); await p.waitForTimeout(700);
    await p.locator(s).screenshot({ path: `../screenshots/${tag}-${name}-${s.slice(1)}.png` });
  }
  await p.locator('.stamp-flip').first().click(); await p.waitForTimeout(900);
  await p.locator('#s-eewh').screenshot({ path: `../screenshots/${tag}-${name}-flip.png` });
  await p.locator('.stamp-more').first().click(); await p.waitForTimeout(900);
  await p.screenshot({ path: `../screenshots/${tag}-${name}-drawer.png` });
  const ov = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  console.log(name, 'overflowX', ov);
  await p.close();
}
await b.close();
