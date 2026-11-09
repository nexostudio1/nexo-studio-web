// Texturas pintadas con Canvas2D (deterministas: generador con semilla).
import * as THREE from 'three';

export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
export function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, rep: [number, number] = [1, 1]) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  draw(cv.getContext('2d')!);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rep[0], rep[1]);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
export const rr = (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  g.beginPath();
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
};

export const floorTex = () => canvasTex(1024, 1024, (g) => {
  const R = rng(3);
  const cols = ['#7a4f3a', '#6e4634', '#83573f', '#744a36', '#6a4331'];
  const rows = 8, rh = 1024 / rows;
  for (let i = 0; i < rows; i++) {
    let x = -R() * 400;
    while (x < 1024) {
      const len = 300 + R() * 400;
      g.fillStyle = cols[Math.floor(R() * cols.length)];
      g.fillRect(x, i * rh, len, rh);
      g.strokeStyle = 'rgba(40,20,10,0.22)'; g.lineWidth = 2;
      for (let k = 0; k < 6; k++) {
        const y0 = i * rh + 10 + R() * (rh - 20), a = 2 + R() * 5, ph = R() * 6;
        g.beginPath();
        for (let xx = x; xx < x + len; xx += 8) g.lineTo(xx, y0 + Math.sin(xx * 0.02 + ph) * a);
        g.stroke();
      }
      g.fillStyle = 'rgba(15,6,4,0.55)'; g.fillRect(x, i * rh, 3, rh);
      x += len;
    }
    g.fillStyle = 'rgba(15,6,4,0.6)'; g.fillRect(0, i * rh, 1024, 4);
    g.fillStyle = 'rgba(255,220,180,0.06)'; g.fillRect(0, i * rh + 4, 1024, 3);
  }
}, [9, 5]);

export const wallTex = () => canvasTex(256, 256, (g) => {
  g.fillStyle = '#3d4a98'; g.fillRect(0, 0, 256, 256);
  g.fillStyle = '#37438e'; g.fillRect(0, 0, 128, 256);
  g.fillStyle = 'rgba(190,200,255,0.16)';
  for (const [x, y] of [[64, 64], [192, 192], [64, 192], [192, 64]]) {
    g.save(); g.translate(x, y); g.rotate(Math.PI / 4); g.fillRect(-7, -7, 14, 14); g.restore();
  }
  g.fillStyle = 'rgba(190,200,255,0.08)';
  for (const [x, y] of [[128, 0], [0, 128], [128, 128], [0, 0]]) { g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill(); }
}, [24, 6]);

export const woodTex = (base = '#c98a3d') => canvasTex(256, 256, (g) => {
  const R = rng(11);
  g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = 'rgba(70,35,10,0.18)'; g.lineWidth = 2;
  for (let k = 0; k < 26; k++) {
    const y0 = R() * 256, a = 2 + R() * 6, ph = R() * 6;
    g.beginPath();
    for (let x = 0; x <= 256; x += 6) g.lineTo(x, y0 + Math.sin(x * 0.03 + ph) * a);
    g.stroke();
  }
  g.fillStyle = 'rgba(70,35,10,0.25)';
  g.beginPath(); g.ellipse(170, 120, 14, 6, 0, 0, 7); g.fill();
});

export const quiltTex = () => canvasTex(512, 512, (g) => {
  const n = 4, s = 512 / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    g.fillStyle = (i + j) % 2 ? '#e6a83c' : '#d9922f'; g.fillRect(i * s, j * s, s, s);
    g.fillStyle = 'rgba(255,240,200,0.18)';
    g.beginPath(); g.arc(i * s + s / 2, j * s + s / 2, s * 0.18, 0, 7); g.fill();
  }
  g.strokeStyle = 'rgba(255,240,210,0.7)'; g.lineWidth = 3; g.setLineDash([10, 8]);
  for (let i = 0; i <= n; i++) {
    g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, 512); g.stroke();
    g.beginPath(); g.moveTo(0, i * s); g.lineTo(512, i * s); g.stroke();
  }
}, [3, 2]);

export const rugTex = () => canvasTex(512, 512, (g) => {
  const c = 256;
  const rings = ['#7d2f58', '#b84a74', '#f2c4d4', '#b84a74', '#9a3a64', '#e98aa8', '#b84a74', '#f6d9e3'];
  for (let i = 0; i < rings.length; i++) {
    g.fillStyle = rings[i]; g.beginPath(); g.arc(c, c, 256 - i * 30, 0, 7); g.fill();
  }
  g.strokeStyle = '#f6d9e3'; g.lineWidth = 5;
  g.beginPath();
  for (let a = 0; a <= 72; a++) {
    const r = 185 + (a % 2 ? 10 : -10), t = (a / 72) * Math.PI * 2;
    g.lineTo(c + Math.cos(t) * r, c + Math.sin(t) * r);
  }
  g.stroke();
});

export const windowTex = () => canvasTex(512, 672, (g) => {
  const R = rng(5);
  const sky = g.createLinearGradient(0, 0, 0, 672);
  sky.addColorStop(0, '#0b1240'); sky.addColorStop(0.6, '#1d3a86'); sky.addColorStop(1, '#3c6fb5');
  g.fillStyle = sky; g.fillRect(0, 0, 512, 672);
  for (let i = 0; i < 90; i++) {
    g.fillStyle = `rgba(255,255,255,${0.4 + R() * 0.6})`;
    g.beginPath(); g.arc(R() * 512, R() * 420, R() * 2.2 + 0.6, 0, 7); g.fill();
  }
  const glow = g.createRadialGradient(170, 160, 30, 170, 160, 170);
  glow.addColorStop(0, 'rgba(255,250,220,0.55)'); glow.addColorStop(1, 'rgba(255,250,220,0)');
  g.fillStyle = glow; g.fillRect(0, 0, 512, 400);
  g.fillStyle = '#fffbe6'; g.beginPath(); g.arc(170, 160, 58, 0, 7); g.fill();
  g.fillStyle = 'rgba(200,190,160,0.35)';
  for (const [x, y, r] of [[150, 145, 12], [190, 180, 9], [175, 130, 6]]) { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
  // ciudad
  let x = 0;
  while (x < 512) {
    const w = 40 + R() * 60, h = 90 + R() * 170;
    g.fillStyle = '#0a0f2a'; g.fillRect(x, 672 - h, w, h);
    for (let yy = 672 - h + 12; yy < 660; yy += 22) for (let xx = x + 8; xx < x + w - 10; xx += 16)
      if (R() < 0.35) { g.fillStyle = R() < 0.5 ? '#ffd27a' : '#ffb35c'; g.fillRect(xx, yy, 7, 10); }
    x += w + 4;
  }
});

export const posterRocket = () => canvasTex(400, 560, (g) => {
  g.fillStyle = '#16204f'; g.fillRect(0, 0, 400, 560);
  const R = rng(9);
  for (let i = 0; i < 60; i++) { g.fillStyle = '#ffffff'; g.globalAlpha = 0.3 + R() * 0.7; g.fillRect(R() * 400, R() * 560, 3, 3); }
  g.globalAlpha = 1;
  g.fillStyle = '#ff8a3c'; g.beginPath(); g.arc(300, 120, 60, 0, 7); g.fill();
  g.fillStyle = '#e04a3a'; g.beginPath(); g.ellipse(300, 120, 100, 18, -0.3, 0, 7); g.lineWidth = 6; g.strokeStyle = '#ffd36b'; g.stroke();
  g.save(); g.translate(170, 330); g.rotate(-0.5);
  g.fillStyle = '#f2f2f2'; g.beginPath(); g.ellipse(0, 0, 44, 120, 0, 0, 7); g.fill();
  g.fillStyle = '#e04a3a'; g.beginPath(); g.moveTo(-44, 40); g.lineTo(-80, 120); g.lineTo(-30, 100); g.fill();
  g.beginPath(); g.moveTo(44, 40); g.lineTo(80, 120); g.lineTo(30, 100); g.fill();
  g.fillStyle = '#3cc7ff'; g.beginPath(); g.arc(0, -30, 20, 0, 7); g.fill();
  g.fillStyle = '#ffb030'; g.beginPath(); g.moveTo(-25, 112); g.lineTo(0, 190); g.lineTo(25, 112); g.fill();
  g.restore();
  g.fillStyle = '#ffd36b'; g.font = 'bold 64px Arial'; g.textAlign = 'center'; g.fillText('ESPACIO', 200, 520);
});

export const posterMount = () => canvasTex(520, 360, (g) => {
  const s = g.createLinearGradient(0, 0, 0, 360);
  s.addColorStop(0, '#ff9a6b'); s.addColorStop(0.6, '#ffd08a'); s.addColorStop(1, '#ffe3a8');
  g.fillStyle = s; g.fillRect(0, 0, 520, 360);
  g.fillStyle = '#fff3c4'; g.beginPath(); g.arc(360, 170, 46, 0, 7); g.fill();
  const m = (c: string, pts: number[][]) => { g.fillStyle = c; g.beginPath(); g.moveTo(0, 360); for (const [x, y] of pts) g.lineTo(x, y); g.lineTo(520, 360); g.fill(); };
  m('#b0567a', [[0, 230], [120, 120], [230, 220], [330, 140], [440, 230], [520, 180]]);
  m('#6d3a6e', [[0, 290], [90, 220], [200, 300], [300, 230], [420, 300], [520, 250]]);
  m('#3b2450', [[0, 330], [140, 290], [280, 340], [400, 300], [520, 330]]);
});

export const clockTex = () => canvasTex(256, 128, (g) => {
  g.fillStyle = '#120608'; g.fillRect(0, 0, 256, 128);
  g.fillStyle = '#ff3b2e'; g.font = 'bold 86px Courier New'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = '#ff3b2e'; g.shadowBlur = 16; g.fillText('3:07', 128, 68);
});

export const softDot = () => canvasTex(64, 64, (g) => {
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.4, 'rgba(255,255,255,0.5)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
});

export const zTex = () => canvasTex(128, 128, (g) => {
  g.font = 'bold 110px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineWidth = 14; g.strokeStyle = '#1a2150'; g.strokeText('Z', 64, 70);
  g.fillStyle = '#ffffff'; g.fillText('Z', 64, 70);
});

export const panesTex = () => canvasTex(256, 336, (g) => {
  g.fillStyle = '#000'; g.fillRect(0, 0, 256, 336);
  const pane = g.createLinearGradient(0, 0, 0, 336);
  pane.addColorStop(0, 'rgba(150,180,255,1)'); pane.addColorStop(1, 'rgba(90,120,220,1)');
  g.fillStyle = pane;
  g.fillRect(12, 12, 108, 150); g.fillRect(136, 12, 108, 150); g.fillRect(12, 174, 108, 150); g.fillRect(136, 174, 108, 150);
});
