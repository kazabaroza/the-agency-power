// רינדור פריים-אחרי-פריים ב-Chromium ללא מסך, וקידוד ל-MP4 (H.264) עם ffmpeg.
// אחר כך מסנתז את פס הסאונד (sound.js) ומחבר אותו לקובץ הסופי.
// הסאונד כבוי כברירת מחדל. שימוש:
//   node render.js            רינדור מלא, בלי סאונד
//   node render.js --sound    רינדור מלא + סינתוז הסאונד (sound.js) וחיבור שלו
//   node render.js --mux      רק סאונד וחיבור מחדש (משתמש ב-p100-agency-silent.mp4 הקיים)
const { chromium } = require('playwright');
const { spawn, execFileSync } = require('child_process');
const path = require('path');

(async () => {
  const final = path.join(__dirname, 'p100-agency.mp4');
  const out = path.join(__dirname, 'p100-agency-silent.mp4');
  const wav = path.join(__dirname, 'p100-agency-soundtrack.wav');
  const mux = () => {
    execFileSync('node', [path.join(__dirname, 'sound.js'), wav], { stdio: 'inherit' });
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', out, '-i', wav, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', final]);
    console.log('wrote', final);
  };
  if (process.argv.includes('--mux')) return mux();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.join(__dirname, 'index.html') + '?render');
  await page.evaluate(() => window.ready);
  const { FPS, DURATION } = await page.evaluate(() => ({ FPS, DURATION }));
  const total = Math.round(FPS * DURATION);

  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p',
    '-vf', 'scale=in_range=full:out_range=tv:out_color_matrix=bt709',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
    '-r', String(FPS), '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => ff.on('close', c => (c === 0 ? res() : rej(new Error('ffmpeg ' + c)))));

  for (let i = 0; i < total; i++) {
    const b64 = await page.evaluate(n => { drawFrame(n / FPS); return document.getElementById('c').toDataURL('image/png').slice(22); }, i);
    if (!ff.stdin.write(Buffer.from(b64, 'base64'))) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 150 === 0) console.log(`frame ${i}/${total}`);
  }
  ff.stdin.end();
  await done;
  await browser.close();
  console.log('wrote', out);
  if (process.argv.includes('--sound')) mux();
  else { require('fs').copyFileSync(out, final); console.log('wrote', final, '(no sound)'); }
})();
