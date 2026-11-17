// פס סאונד שמסונתז כולו בקוד (בלי הקלטות ובלי דגימות), מסונכרן לפריימים של האנימציה.
// קורא את SCENE_STARTS ו-DURATION מתוך index.html, כך שעדכון התזמון שם מזיז גם את הסאונד.
// שימוש: node sound.js [out.wav]
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const SCENE_STARTS = JSON.parse(html.match(/const SCENE_STARTS\s*=\s*(\[[^\]]+\])/)[1]);
const DURATION = parseFloat(html.match(/const DURATION\s*=\s*([\d.]+)/)[1]);
const FPS = 30, SR = 48000, N = Math.round(DURATION * SR);

const dryL = new Float32Array(N), dryR = new Float32Array(N);   // ערוץ יבש
const sendL = new Float32Array(N), sendR = new Float32Array(N); // שליחה להדהוד
const padL = new Float32Array(N), padR = new Float32Array(N);   // רקע

const snap = t => Math.round(t * FPS) / FPS;              // הצמדה לפריים
const at = (i, rel) => snap(SCENE_STARTS[i] + rel);       // זמן יחסי לתחילת סצנה
const rnd = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }; // זהה ל-index.html
let seed = 987654321;
const white = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2147483648 - 1; };
const CUES = []; // לתיעוד ולבדיקה

function put(i, v, pan, rev) {
  if (i < 0 || i >= N) return;
  const l = v * Math.cos((pan + 1) * Math.PI / 4), r = v * Math.sin((pan + 1) * Math.PI / 4);
  dryL[i] += l; dryR[i] += r;
  if (rev) { sendL[i] += l * rev; sendR[i] += r * rev; }
}
// סינוס עם גלישת גובה אקספוננציאלית ודעיכה
function tone(t, { f0, f1 = f0, dur, amp, pan = 0, att = 0.004, rev = 0, h2 = 0 }) {
  const n = Math.round(dur * SR), s0 = Math.round(t * SR); let ph = 0;
  for (let i = 0; i < n; i++) {
    const x = i / n, f = f0 * Math.pow(f1 / f0, x);
    ph += 2 * Math.PI * f / SR;
    const env = Math.min(1, i / (att * SR)) * Math.exp(-6.2 * x) * (1 - x * x * x);
    put(s0 + i, (Math.sin(ph) + h2 * Math.sin(2 * ph)) * env * amp, pan, rev);
  }
}
// רעש לבן דרך מסנן מעביר-פס שהתדר שלו נע
function noise(t, { dur, f0, f1 = f0, q = 1.2, amp, pan = 0, pan1 = pan, env = 'hump', rev = 0 }) {
  const n = Math.round(dur * SR), s0 = Math.round(t * SR); let low = 0, band = 0;
  for (let i = 0; i < n; i++) {
    const x = i / n, fc = f0 * Math.pow(f1 / f0, x), f = 2 * Math.sin(Math.PI * Math.min(fc, SR / 6.5) / SR);
    low += f * band; const high = white() - low - band / q; band += f * high;
    let e = env === 'up' ? x * x * Math.min(1, (1 - x) * 25) : env === 'down' ? (1 - x) * (1 - x) * Math.min(1, x * 200) : Math.pow(Math.sin(Math.PI * x), 2);
    put(s0 + i, band * e * amp, pan + (pan1 - pan) * x, rev);
  }
}
const bell = (t, f, amp, pan = 0, dur = 1.1, rev = 0.5) => {
  tone(t, { f0: f, dur, amp, pan, rev });
  tone(t, { f0: f * 2.76, dur: dur * 0.45, amp: amp * 0.28, pan, rev });
  tone(t, { f0: f * 5.4, dur: dur * 0.2, amp: amp * 0.1, pan, rev });
};
const kick = (t, amp = 0.5) => { tone(t, { f0: 135, f1: 42, dur: 0.38, amp, rev: 0.12 }); noise(t, { dur: 0.012, f0: 3000, amp: amp * 0.18, env: 'down' }); };
const thud = (t, amp = 0.3, pan = 0) => tone(t, { f0: 190, f1: 78, dur: 0.17, amp, pan, rev: 0.15 });
const tick = (t, f = 900, amp = 0.05, pan = 0) => tone(t, { f0: f, f1: f * 0.8, dur: 0.05, amp, pan, att: 0.001, rev: 0.2 });
const bloop = (t, f, amp = 0.1, pan = 0) => tone(t, { f0: f * 0.72, f1: f, dur: 0.16, amp, pan, rev: 0.3, h2: 0.15 });
const swish = (t, dur = 0.3, amp = 0.035, f0 = 1500, f1 = 4200, pan = 0, pan1 = 0) => noise(t, { dur, f0, f1, amp, pan, pan1, rev: 0.2 });
const cue = (t, name) => CUES.push({ t: +t.toFixed(4), frame: Math.round(t * FPS), name });

// מילים שנוחתות (טיפוגרפיה קינטית): תקתוק לכל מילה, ומכה למילת מפתח
function words(i, t0, n, key = false) {
  for (let k = 0; k < n; k++) {
    const t = at(i, t0 + k * 0.11 + 0.3);
    tick(t, 760 + k * 110, 0.045, k % 2 ? -0.3 : 0.3);
    cue(t, `מילה נוחתת (סצנה ${i + 1})`);
  }
  if (key) { const t = at(i, t0 + (n - 1) * 0.11 + 0.3); tone(t, { f0: 150, f1: 58, dur: 0.24, amp: 0.3, rev: 0.15 }); swish(at(i, t0 + n * 0.11 + 0.3), 0.4, 0.03); }
}

// ───────────── חיתוכים ונחיתות של ה"גיבור" ─────────────
kick(0, 0.45); bell(0, 220, 0.05, 0, 1.6); cue(0, 'פתיחה (פריים ראשון)');
for (let i = 1; i < SCENE_STARTS.length; i++) {
  noise(at(i, -0.3), { dur: 0.7, f0: 320, f1: 2600, amp: 0.085, pan: 0.5, pan1: -0.5, rev: 0.3 }); // מעוף
  kick(at(i, 0), 0.5); cue(at(i, 0), `חיתוך לסצנה ${i + 1}`);
  thud(at(i, 0.4), 0.3); tick(at(i, 0.4), 1300, 0.04); cue(at(i, 0.4), `נחיתת הבועה (סצנה ${i + 1})`);
}

// ───────────── סצנה 1: בלגן → שאיבה → הבזק ─────────────
swish(at(0, 0.4), 0.45, 0.03);
for (let i = 2; i < 9; i++) { const t = at(0, 0.15 + (i - 2) * 0.16 + 0.15); tick(t, 420 + i * 70, 0.065, i % 2 ? -0.5 : 0.5); thud(t, 0.07, i % 2 ? -0.5 : 0.5); cue(t, 'חלון קופץ'); }
for (let i = 0; i < 9; i++) { const t = at(0, 0.9 + rnd(i + 95) * 1.5); tone(t, { f0: 1250 + rnd(i) * 500, dur: 0.07, amp: 0.035, pan: rnd(i + 3) * 1.4 - 0.7, rev: 0.3 }); cue(t, 'התראה'); }
for (let t = 1.6, gap = 0.22, k = 0; t < 2.72; t += gap, gap *= 0.88, k++) tone(at(0, t), { f0: 1300 + k * 45, dur: 0.05, amp: 0.02 + k * 0.0022, pan: k % 2 ? -0.6 : 0.6, rev: 0.25 });
noise(at(0, 1.3), { dur: 1.45, f0: 220, f1: 3200, amp: 0.11, env: 'up', rev: 0.25 });                     // מתח עולה
noise(at(0, 2.75), { dur: 0.48, f0: 3200, f1: 180, amp: 0.15, env: 'up', rev: 0.2 }); cue(at(0, 2.75), 'שאיבה'); // שאיבה
tone(at(0, 2.75), { f0: 520, f1: 70, dur: 0.48, amp: 0.07, att: 0.2 });
{ const t = at(0, 3.25); kick(t, 0.7); tone(t, { f0: 72, f1: 34, dur: 0.95, amp: 0.32, rev: 0.1 }); noise(t, { dur: 0.55, f0: 4200, f1: 320, amp: 0.13, env: 'down', rev: 0.5 }); bell(t, 440, 0.06, -0.2, 1.8); bell(t, 659.25, 0.045, 0.2, 1.8); cue(t, 'הבזק: מכה ראשית'); }
bloop(at(0, 3.45), 520, 0.11); cue(at(0, 3.45), 'בועה נוחתת');

// ───────────── סצנה 2: לוגו ושלושת התחומים ─────────────
for (let k = 0; k < 11; k++) tick(at(1, 0.3 + k * 0.1), 1900 + (k % 3) * 120, 0.018, 0.2);
words(1, 1.5, 3);
[440, 554.37, 659.25].forEach((f, k) => { const t = at(1, 2.5 + k * 0.9 + 0.25); bloop(t, f, 0.09, [0.4, -0.4, 0][k]); thud(t, 0.1); cue(t, 'תגית נוחתת'); });

// ───────────── סצנה 3: מדברים, היא עובדת ─────────────
words(2, 0.1, 2);
tick(at(2, 0.6), 1100, 0.04, 0.4);
for (let k = 0; k < 10; k++) tick(at(2, 1.8 + k * 0.11), 2000 + (k % 4) * 90, 0.016, 0.3);
words(2, 2.9, 2, true);
[554.37, 659.25, 880].forEach((f, k) => { const st = 3.3 + k * 0.75; thud(at(2, st + 0.2), 0.12); cue(at(2, st + 0.2), 'משימה נוחתת');
  bell(at(2, st + 0.55), f, 0.065, 0.3, 0.9); cue(at(2, st + 0.55), 'וי'); });

// ───────────── סצנה 4: דוח, עצה, סדר ─────────────
[1.1, 2.7, 4.3].forEach((T, k) => {
  const tw = at(3, (k === 0 ? 0.15 : T - 0.1) + 0.3); tick(tw, 760 + k * 110, 0.05); cue(tw, 'מילה נוחתת (סצנה 4)');
  swish(at(3, T - 0.35), 0.4, 0.025, 900, 2600);
  const t = at(3, T + 0.3); thud(t, 0.22, [0.5, 0, -0.5][k]); bell(t, [440, 554.37, 659.25][k], 0.055, [0.5, 0, -0.5][k], 0.9); cue(t, 'כרטיס נוחת');
});

// ───────────── סצנה 5: בקשה → תמונה → סרטון → רילס → באוויר ─────────────
words(4, 0.1, 1);
{ const t = at(4, 1.6); bloop(t, 392, 0.1); thud(t, 0.16); cue(t, 'תמונה נוחתת'); }
[2.6, 3.9].forEach(m => { swish(at(4, m), 0.5, 0.05, 500, 1900, -0.4, 0.4); const t = at(4, m + 0.5); tick(t, 1000, 0.05); thud(t, 0.12); cue(t, 'מסגרת משתנה'); });
noise(at(4, 4.8), { dur: 0.5, f0: 400, f1: 5200, amp: 0.1, env: 'up', rev: 0.3 });
tone(at(4, 4.82), { f0: 220, f1: 880, dur: 0.48, amp: 0.05, att: 0.25 });
{ const t = at(4, 5.3); kick(t, 0.6); [659.25, 830.61, 987.77].forEach((f, k) => bell(t, f, 0.05, k * 0.4 - 0.4, 1.6)); tick(t, 900, 0.05); cue(t, '"באוויר" נוחת'); }

// ───────────── סצנה 6: שלושה "בלי" ─────────────
[[0.4, 2], [2.05, 3], [3.85, 3]].forEach(([st, n], k) => {
  words(5, st + 0.05, n);
  if (k) { const t = at(5, st + 0.3); bloop(t, 330, 0.07, 0.5); cue(t, 'אייקון נוחת'); }
  noise(at(5, st + 0.75), { dur: 0.24, f0: 4400, f1: 900, amp: 0.1, env: 'down', pan: 0.6, pan1: 0.3, rev: 0.25 });
  const t = at(5, st + 1.0); thud(t, 0.3, 0.4); tone(t, { f0: 110, f1: 55, dur: 0.2, amp: 0.2 }); cue(t, 'מחיקה');
});

// ───────────── סצנה 7: קריאה לפעולה ─────────────
words(6, 0.15, 2);
bloop(at(6, 0.65), 440, 0.09);
words(6, 0.9, 2, true);
{ const t = at(6, 1.9); tone(t, { f0: 55, dur: 2.2, amp: 0.22, rev: 0.1 }); [440, 554.37, 659.25, 880].forEach((f, k) => bell(t + k * 0.03, f, 0.055, k * 0.3 - 0.45, 2.6, 0.7)); cue(t, 'לוגו נוחת'); }
tick(at(6, 2.3), 1200, 0.04);

// ───────────── רקע: אקורד נמוך ושקט לכל סצנה (מתחת לתחום הדיבור) ─────────────
const A = 55, CH = { A: [A, A * 2, 164.81, 220], D: [73.42, 110, 146.83, 220], Fm: [46.25, 92.5, 138.59, 185], E: [82.41, 123.47, 164.81, 207.65] };
const PROG = ['A', 'D', 'Fm', 'D', 'E', 'Fm', 'A'];
for (let i = 0; i < SCENE_STARTS.length; i++) {
  const st = SCENE_STARTS[i], en = i + 1 < SCENE_STARTS.length ? SCENE_STARTS[i + 1] : DURATION;
  const a0 = Math.max(0, Math.round((st - 0.3) * SR)), a1 = Math.min(N, Math.round((en + 0.3) * SR));
  CH[PROG[i % PROG.length]].forEach((f, k) => {
    const amp = [0.032, 0.026, 0.017, 0.010][k], lf = 0.09 + k * 0.035;
    for (let s = a0; s < a1; s++) {
      const t = s / SR, fi = Math.min(1, (t - (st - 0.3)) / 0.6, ((en + 0.3) - t) / 0.6);
      const e = amp * fi * fi * (3 - 2 * fi) * (0.78 + 0.22 * Math.sin(2 * Math.PI * lf * t + k));
      padL[s] += Math.sin(2 * Math.PI * f * t) * e; padR[s] += Math.sin(2 * Math.PI * (f + 0.35) * t + 0.6) * e;
    }
  });
}

// ───────────── הדהוד קצר (Schroeder) על ערוץ השליחה ─────────────
function reverb(inp, offs) {
  const out = new Float32Array(N);
  [0.0297, 0.0371, 0.0411, 0.0437].forEach(d => {
    const D = Math.round((d + offs) * SR), buf = new Float32Array(D); let p = 0, lp = 0;
    for (let i = 0; i < N; i++) { const y = buf[p]; lp = y * 0.6 + lp * 0.4; buf[p] = inp[i] + lp * 0.8; out[i] += y * 0.25; p = (p + 1) % D; }
  });
  [0.005, 0.0017].forEach(d => {
    const D = Math.round(d * SR), buf = new Float32Array(D); let p = 0;
    for (let i = 0; i < N; i++) { const b = buf[p], x = out[i]; const y = -0.7 * x + b; buf[p] = x + 0.7 * y; out[i] = y; p = (p + 1) % D; }
  });
  return out;
}
const wetL = reverb(sendL, 0), wetR = reverb(sendR, 0.0007);

// ───────────── מיקס, דהיות בקצוות, הגבלה ונירמול ─────────────
const outL = new Float32Array(N), outR = new Float32Array(N);
let peak = 0, padSq = 0;
for (let i = 0; i < N; i++) {
  const t = i / SR, fade = Math.min(1, t / 0.02, (DURATION - t) / 1.2);
  outL[i] = Math.tanh((dryL[i] + wetL[i] * 0.6 + padL[i]) * 1.1) * fade;
  outR[i] = Math.tanh((dryR[i] + wetR[i] * 0.6 + padR[i]) * 1.1) * fade;
  peak = Math.max(peak, Math.abs(outL[i]), Math.abs(outR[i])); padSq += padL[i] * padL[i];
}
const gain = 0.708 / peak; // שיא ב- ‎-3dBFS
const pcm = Buffer.alloc(44 + N * 4);
pcm.write('RIFF', 0); pcm.writeUInt32LE(36 + N * 4, 4); pcm.write('WAVEfmt ', 8); pcm.writeUInt32LE(16, 16);
pcm.writeUInt16LE(1, 20); pcm.writeUInt16LE(2, 22); pcm.writeUInt32LE(SR, 24); pcm.writeUInt32LE(SR * 4, 28);
pcm.writeUInt16LE(4, 32); pcm.writeUInt16LE(16, 34); pcm.write('data', 36); pcm.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, outL[i] * gain)) * 32767), 44 + i * 4);
  pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, outR[i] * gain)) * 32767), 46 + i * 4);
}
const out = process.argv[2] || path.join(__dirname, 'p100-agency-soundtrack.wav');
fs.writeFileSync(out, pcm);
CUES.sort((a, b) => a.t - b.t);
fs.writeFileSync(out.replace(/\.wav$/, '-cues.json'), JSON.stringify(CUES, null, 1));
const db = x => (20 * Math.log10(x)).toFixed(1);
console.log(`wrote ${out}: ${DURATION}s, ${SR}Hz stereo 16-bit, ${CUES.length} cues`);
console.log(`pad RMS ${db(Math.sqrt(padSq / N) * 1.1 * gain)} dBFS, peak ${db(peak * gain)} dBFS`);
