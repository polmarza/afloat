// Renders the site's brand images into public/ from the game's own code:
// favicon PNGs and app icons from public/favicon.svg, and the share image
// (og-image.jpg) from og.html. Needs the dev server running (`npm run dev`)
// and a local Chrome (set CHROME_PATH if it is not in the default place).
//
//   npm run brand -w @afloat/client            (uses http://localhost:5173)
//   npm run brand -w @afloat/client -- <url>

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const base = (process.argv[2] ?? 'http://localhost:5173').replace(/\/$/, '');
const publicDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const chrome = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: true,
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage();

/** The diamond at `size` px. `padded`: on the dark background with a margin (home screen and app icons). */
async function icon(file, size, padded) {
  await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
  const inner = padded ? Math.round(size * 0.62) : size;
  await page.setContent(
    `<html><body style="margin:0;width:${size}px;height:${size}px;display:grid;place-items:center;background:${padded ? '#040506' : 'transparent'}">
      <img src="${base}/favicon.svg" width="${inner}" height="${inner}"></body></html>`,
    { waitUntil: 'load' },
  );
  await page.waitForFunction(() => document.querySelector('img')?.complete);
  writeFileSync(join(publicDir, file), await page.screenshot({ omitBackground: !padded }));
  console.log('wrote', file);
}

await icon('favicon-32.png', 32, false);
await icon('apple-touch-icon.png', 180, true);
await icon('icon-192.png', 192, true);
await icon('icon-512.png', 512, true);

await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
await page.goto(`${base}/og.html`, { waitUntil: 'load' });
await page.waitForFunction('window.ogReady === true', { timeout: 30000 });
// JPEG keeps it small: some apps (WhatsApp) skip share images of a few hundred KB.
writeFileSync(join(publicDir, 'og-image.jpg'), await page.screenshot({ type: 'jpeg', quality: 88 }));
console.log('wrote og-image.jpg');

await browser.close();
