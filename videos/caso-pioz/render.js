// Renderiza escena.html fotograma a fotograma con Chromium (Playwright) y lo codifica con ffmpeg.
//   node render.js --stills 1,10,20      → PNG de prueba en ./stills
//   node render.js                        → video.mp4 (sin audio) a 30 fps
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const TL = JSON.parse(fs.readFileSync(path.join(DIR, 'timeline.json'), 'utf8'));
const args = process.argv.slice(2);
const stillsArg = args.includes('--stills') ? args[args.indexOf('--stills') + 1] : null;
const OUT = args.includes('--out') ? args[args.indexOf('--out') + 1] : path.join(DIR, 'build', 'video_mudo.mp4');
const WORKERS = 3;

async function openPage(browser) {
  const page = await browser.newPage({ viewport: { width: 400, height: 700 } });
  page.on('pageerror', e => { console.error('Error en la página:', e.message); process.exit(1); });
  await page.goto('file://' + path.join(DIR, 'escena.html'));
  await page.evaluate(tl => window.init(tl), TL);
  return page;
}
const grab = (page, f, type, q) => page.evaluate(([f, type, q]) => {
  window.renderFrame(f);
  return document.getElementById('c').toDataURL(type, q).split(',')[1];
}, [f, type, q]);

(async () => {
  const browser = await chromium.launch({ args: ['--disable-gpu-vsync'] });
  if (stillsArg) {
    const page = await openPage(browser);
    fs.mkdirSync(path.join(DIR, 'stills'), { recursive: true });
    for (const s of stillsArg.split(',')) {
      const f = Math.round(parseFloat(s) * TL.fps);
      const b64 = await grab(page, f, 'image/jpeg', 0.9);
      fs.writeFileSync(path.join(DIR, 'stills', `t${String(s).padStart(5, '0')}.jpg`), Buffer.from(b64, 'base64'));
    }
    await browser.close();
    return;
  }
  const total = Math.round(TL.duration * TL.fps);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(TL.fps), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', OUT], { stdio: ['pipe', 'inherit', 'inherit'] });
  const pages = await Promise.all(Array.from({ length: WORKERS }, () => openPage(browser)));
  const ready = new Map(); let next = 0, issued = 0; const t0 = Date.now();
  const write = buf => new Promise(r => ff.stdin.write(buf) ? r() : ff.stdin.once('drain', r));
  async function flush() {
    while (ready.has(next)) { const b = ready.get(next); ready.delete(next); await write(b); next++;
      if (next % 150 === 0) console.log(`  ${next}/${total} fotogramas · ${((Date.now() - t0) / 1000).toFixed(0)} s`); }
  }
  await Promise.all(pages.map(async page => {
    while (issued < total) {
      const f = issued++;
      const b64 = await grab(page, f, 'image/jpeg', 0.95);
      ready.set(f, Buffer.from(b64, 'base64'));
      await flush();
    }
  }));
  await flush();
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await browser.close();
  console.log('Vídeo listo:', OUT);
})();
