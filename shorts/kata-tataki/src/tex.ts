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

export const softDot = () => canvasTex(64, 64, (g) => {
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.4, 'rgba(255,255,255,0.5)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
});

// ---------- oficina ----------
export const carpetTex = (base = '#3f63b8') => canvasTex(512, 512, (g) => {
  const R = rng(7);
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  // losetas de moqueta de 50 cm alternando dirección
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
    g.fillStyle = (x + y) % 2 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,30,0.06)'; g.fillRect(x * 128, y * 128, 128, 128);
    g.strokeStyle = 'rgba(10,20,60,0.25)'; g.lineWidth = 2; g.strokeRect(x * 128, y * 128, 128, 128);
  }
  for (let i = 0; i < 9000; i++) { g.fillStyle = R() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,40,0.07)'; g.fillRect(R() * 512, R() * 512, 2, 2); }
}, [6, 6]);
export const wallTex = (base: string) => canvasTex(256, 256, (g) => {
  const R = rng(11);
  g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2500; i++) { g.fillStyle = R() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.035)'; g.fillRect(R() * 256, R() * 256, 2, 2); }
}, [4, 2]);
export const ceilTex = () => canvasTex(512, 512, (g) => {
  g.fillStyle = '#eceef3'; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = '#b9bfcc'; g.lineWidth = 5;
  for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 128, 0); g.lineTo(i * 128, 512); g.stroke(); g.beginPath(); g.moveTo(0, i * 128); g.lineTo(512, i * 128); g.stroke(); }
  const R = rng(5); for (let i = 0; i < 3000; i++) { g.fillStyle = 'rgba(120,120,140,0.12)'; g.fillRect(R() * 512, R() * 512, 1.5, 1.5); }
}, [8, 8]);
/** horizonte de Tokio: rascacielos, torre de celosía roja y blanca, día o noche */
export const skylineTex = (night: boolean) => canvasTex(1024, 512, (g) => {
  const R = rng(night ? 31 : 29);
  const sky = g.createLinearGradient(0, 0, 0, 512);
  if (night) { sky.addColorStop(0, '#0d1236'); sky.addColorStop(0.7, '#283a7a'); sky.addColorStop(1, '#5a4a8a'); }
  else { sky.addColorStop(0, '#4f8fe6'); sky.addColorStop(0.75, '#a9d0f5'); sky.addColorStop(1, '#dcebfa'); }
  g.fillStyle = sky; g.fillRect(0, 0, 1024, 512);
  if (!night) for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(255,255,255,0.85)'; const x = R() * 1024, y = 40 + R() * 130; for (let k = 0; k < 5; k++) { g.beginPath(); g.ellipse(x + k * 26, y + Math.sin(k) * 6, 34, 20, 0, 0, 6.3); g.fill(); } }
  else for (let i = 0; i < 120; i++) { g.fillStyle = `rgba(255,255,255,${0.3 + R() * 0.6})`; g.fillRect(R() * 1024, R() * 260, 2, 2); }
  // torre
  const tx = 760, tb = 470;
  g.strokeStyle = night ? '#ff6a4a' : '#e2452f'; g.lineWidth = 5;
  g.beginPath(); g.moveTo(tx - 50, tb); g.lineTo(tx, 120); g.lineTo(tx + 50, tb); g.stroke();
  for (let y = 160; y < tb; y += 34) { const w = ((y - 120) / (tb - 120)) * 50; g.beginPath(); g.moveTo(tx - w, y); g.lineTo(tx + w, y + 34 > tb ? tb : y + 34); g.moveTo(tx + w, y); g.lineTo(tx - w, y + 34 > tb ? tb : y + 34); g.stroke(); }
  g.fillStyle = night ? '#ffd07a' : '#ffffff'; g.fillRect(tx - 22, 250, 44, 14); g.fillRect(tx - 12, 175, 24, 10);
  g.beginPath(); g.moveTo(tx, 120); g.lineTo(tx, 60); g.stroke();
  // edificios en dos capas
  for (const layer of [0, 1]) {
    let x = -20;
    while (x < 1044) {
      const w = 50 + R() * 90, h = (layer ? 140 : 210) + R() * (layer ? 160 : 140), y = 512 - h;
      const c = night ? (layer ? '#1c2350' : '#2a336a') : (layer ? '#7d93bd' : '#9eb3d6');
      g.fillStyle = c; g.fillRect(x, y, w, h);
      g.fillStyle = night ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.18)'; g.fillRect(x, y, w * 0.18, h);
      for (let wy = y + 12; wy < 505; wy += 16) for (let wx = x + 8; wx < x + w - 8; wx += 13) {
        const on = night ? R() < 0.45 : R() < 0.9;
        g.fillStyle = night ? (on ? (R() < 0.8 ? '#ffd98a' : '#bfe4ff') : 'rgba(0,0,0,0.25)') : (on ? 'rgba(220,235,255,0.55)' : 'rgba(80,100,140,0.35)');
        g.fillRect(wx, wy, 7, 9);
      }
      if (layer === 1 && R() < 0.3) { g.fillStyle = night ? '#ff4040' : '#d0d6e0'; g.fillRect(x + w / 2 - 2, y - 14, 4, 14); }
      x += w + 6 + R() * 18;
    }
  }
});
/** cartel de la agencia */
export const signTex = () => canvasTex(1024, 512, (g) => {
  rr(g, 8, 8, 1008, 496, 60); g.fillStyle = '#ff7a2f'; g.fill();
  rr(g, 30, 30, 964, 452, 44); g.strokeStyle = '#fff3e0'; g.lineWidth = 10; g.stroke();
  // logo: puerta de salida con flecha
  g.save(); g.translate(170, 256);
  g.fillStyle = '#fff3e0'; rr(g, -70, -110, 120, 220, 18); g.fill();
  g.fillStyle = '#ff7a2f'; rr(g, -52, -90, 84, 180, 10); g.fill();
  g.fillStyle = '#fff3e0'; g.beginPath(); g.moveTo(10, -30); g.lineTo(100, -30); g.lineTo(100, -62); g.lineTo(150, 0); g.lineTo(100, 62); g.lineTo(100, 30); g.lineTo(10, 30); g.closePath(); g.fill();
  g.restore();
  g.fillStyle = '#ffffff'; g.textAlign = 'left'; g.textBaseline = 'middle';
  g.font = 'bold 112px sans-serif'; g.fillText('YA NO', 345, 150);
  g.fillText('PUEDO MÁS', 345, 268);
  g.font = 'bold 54px sans-serif'; g.fillStyle = '#4a1d0a'; g.fillText('もう無理 · Renunciamos por ti', 345, 385);
});
export const deskScreen = (kind: 'sheet' | 'calls' | 'night' | 'cv') => canvasTex(512, 320, (g) => {
  const R = rng(kind.length * 17);
  if (kind === 'night') { g.fillStyle = '#121a3a'; g.fillRect(0, 0, 512, 320); g.fillStyle = '#ff7a2f'; g.font = 'bold 40px sans-serif'; g.textAlign = 'center'; g.fillText('YA NO PUEDO MÁS', 256, 170); return; }
  g.fillStyle = '#f4f7fc'; g.fillRect(0, 0, 512, 320);
  if (kind === 'sheet') {
    g.fillStyle = '#2f6fd6'; g.fillRect(0, 0, 512, 34);
    g.strokeStyle = '#c6d0e0'; g.lineWidth = 2;
    for (let y = 50; y < 320; y += 22) { g.beginPath(); g.moveTo(0, y); g.lineTo(512, y); g.stroke(); }
    for (let x = 60; x < 512; x += 90) { g.beginPath(); g.moveTo(x, 34); g.lineTo(x, 320); g.stroke(); }
    for (let i = 0; i < 40; i++) { g.fillStyle = '#5a667a'; g.fillRect(70 + Math.floor(R() * 5) * 90, 56 + Math.floor(R() * 12) * 22, 30 + R() * 40, 8); }
  } else if (kind === 'calls') {
    g.fillStyle = '#ff7a2f'; g.fillRect(0, 0, 512, 60);
    g.fillStyle = '#fff'; g.font = 'bold 30px sans-serif'; g.textAlign = 'left'; g.fillText('LLAMADAS EN ESPERA', 18, 42);
    g.fillStyle = '#d6332a'; g.font = 'bold 150px sans-serif'; g.textAlign = 'center'; g.fillText('40', 256, 220);
    for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#ffd2bd' : '#ffe6da'; g.fillRect(20 + i * 60, 260, 50, 40); }
  } else {
    g.fillStyle = '#2f6fd6'; g.fillRect(0, 0, 512, 34);
  }
});
export const posterTex = () => canvasTex(360, 500, (g) => {
  g.fillStyle = '#ffd34d'; g.fillRect(0, 0, 360, 500);
  g.fillStyle = '#1f3d8a'; g.beginPath(); g.moveTo(20, 400); g.lineTo(180, 120); g.lineTo(340, 400); g.fill();
  g.fillStyle = '#fff'; g.beginPath(); g.moveTo(140, 190); g.lineTo(180, 120); g.lineTo(220, 190); g.lineTo(200, 175); g.lineTo(180, 195); g.lineTo(160, 175); g.fill();
  g.fillStyle = '#d6332a'; g.fillRect(176, 60, 6, 70); g.fillRect(182, 60, 40, 26);
  g.fillStyle = '#1f3d8a'; g.font = 'bold 54px sans-serif'; g.textAlign = 'center'; g.fillText('ESFUERZO', 180, 470);
});
export const chartTex = () => canvasTex(512, 320, (g) => {
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 512, 320);
  g.strokeStyle = '#2b2f3a'; g.lineWidth = 4; g.beginPath(); g.moveTo(40, 20); g.lineTo(40, 280); g.lineTo(490, 280); g.stroke();
  g.strokeStyle = '#d6332a'; g.lineWidth = 7; g.beginPath(); [60, 80, 75, 120, 150, 140, 200, 250].forEach((v, i) => (i ? g.lineTo : g.moveTo).call(g, 60 + i * 60, 280 - v)); g.stroke();
  g.fillStyle = '#2b2f3a'; g.font = 'bold 30px sans-serif'; g.fillText('HORAS EXTRA', 250, 50);
});
export const calendarTex = () => canvasTex(300, 340, (g) => {
  g.fillStyle = '#fff'; g.fillRect(0, 0, 300, 340);
  g.fillStyle = '#d6332a'; g.fillRect(0, 0, 300, 60);
  g.fillStyle = '#fff'; g.font = 'bold 38px sans-serif'; g.textAlign = 'center'; g.fillText('2026', 150, 44);
  for (let i = 0; i < 35; i++) {
    const x = 20 + (i % 7) * 38, y = 80 + Math.floor(i / 7) * 50;
    g.fillStyle = '#e8ebf2'; g.fillRect(x, y, 32, 42);
    g.strokeStyle = '#d6332a'; g.lineWidth = 3; g.beginPath(); g.moveTo(x + 4, y + 6); g.lineTo(x + 28, y + 36); g.moveTo(x + 28, y + 6); g.lineTo(x + 4, y + 36); g.stroke();
  }
});
export const nameplate = (txt: string) => canvasTex(256, 64, (g) => {
  g.fillStyle = '#2b2f3a'; g.fillRect(0, 0, 256, 64);
  g.fillStyle = '#e8c45a'; g.font = 'bold 34px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 128, 34);
});
export const grassTex = () => canvasTex(512, 512, (g) => {
  const R = rng(41);
  g.fillStyle = '#67b84a'; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 7000; i++) { g.fillStyle = R() < 0.5 ? '#5aa83f' : '#7cc95a'; g.fillRect(R() * 512, R() * 512, 2, 5); }
}, [10, 10]);
export const parkSky = () => canvasTex(512, 512, (g) => {
  const sky = g.createLinearGradient(0, 0, 0, 512); sky.addColorStop(0, '#3f86e8'); sky.addColorStop(0.8, '#bfe0ff'); sky.addColorStop(1, '#e8f4ff');
  g.fillStyle = sky; g.fillRect(0, 0, 512, 512);
  const R = rng(3); for (let i = 0; i < 5; i++) { g.fillStyle = 'rgba(255,255,255,0.9)'; const x = R() * 512, y = 60 + R() * 200; for (let k = 0; k < 4; k++) { g.beginPath(); g.ellipse(x + k * 22, y, 30, 18, 0, 0, 6.3); g.fill(); } }
});
// ---------- efectos 2D ----------
/** ondas de timbre: tres arcos a cada lado */
export const ringFx = () => canvasTex(256, 256, (g) => {
  g.strokeStyle = '#ffffff'; g.lineCap = 'round';
  for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) {
    g.lineWidth = 16; g.strokeStyle = '#241726'; g.beginPath(); g.arc(128, 128, 50 + i * 30, sd > 0 ? -0.6 : Math.PI - 0.6, sd > 0 ? 0.6 : Math.PI + 0.6); g.stroke();
    g.lineWidth = 8; g.strokeStyle = '#fff3b0'; g.stroke();
  }
});
/** rayos de grito */
export const shoutFx = () => canvasTex(256, 256, (g) => {
  for (let i = 0; i < 9; i++) {
    const a = -1.1 + (i / 8) * 2.2, r0 = 50, r1 = 118 - (i % 2) * 22;
    g.lineCap = 'round';
    g.lineWidth = 15; g.strokeStyle = '#241726'; g.beginPath(); g.moveTo(128 + Math.cos(a) * r0, 128 + Math.sin(a) * r0); g.lineTo(128 + Math.cos(a) * r1, 128 + Math.sin(a) * r1); g.stroke();
    g.lineWidth = 7; g.strokeStyle = '#ffffff'; g.stroke();
  }
});
/** estrella de impacto */
export const impactFx = () => canvasTex(256, 256, (g) => {
  g.beginPath();
  for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2, r = i % 2 ? 50 : 118; (i ? g.lineTo : g.moveTo).call(g, 128 + Math.cos(a) * r, 128 + Math.sin(a) * r); }
  g.closePath(); g.fillStyle = '#fff3b0'; g.fill(); g.lineWidth = 8; g.strokeStyle = '#241726'; g.stroke();
});
export const petalTex = () => canvasTex(64, 64, (g) => {
  g.fillStyle = '#ffc2d6'; g.beginPath(); g.ellipse(32, 32, 22, 13, 0.5, 0, 6.3); g.fill();
  g.fillStyle = '#ff9ec0'; g.beginPath(); g.ellipse(36, 30, 10, 6, 0.5, 0, 6.3); g.fill();
});
export const paperBitTex = () => canvasTex(64, 64, (g) => {
  g.fillStyle = '#fbf8ef'; g.strokeStyle = '#241726'; g.lineWidth = 4;
  g.beginPath(); g.moveTo(10, 14); g.lineTo(50, 8); g.lineTo(56, 44); g.lineTo(18, 54); g.closePath(); g.fill(); g.stroke();
});
export const sweatTex = () => canvasTex(64, 96, (g) => {
  g.fillStyle = '#9fd4ff'; g.strokeStyle = '#241726'; g.lineWidth = 5;
  g.beginPath(); g.moveTo(32, 8); g.quadraticCurveTo(58, 56, 32, 86); g.quadraticCurveTo(6, 56, 32, 8); g.fill(); g.stroke();
});

// ---------- kata-tataki ----------
export const bubbleTex = (txt: string) => canvasTex(640, 360, (g) => {
  g.fillStyle = '#ffffff'; g.strokeStyle = '#241726'; g.lineWidth = 12;
  rr(g, 20, 20, 600, 240, 110); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(420, 250); g.lineTo(520, 340); g.lineTo(350, 255); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#ffffff'; g.fillRect(352, 236, 160, 20);
  g.fillStyle = '#d6332a'; g.font = '900 92px Inter, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 320, 142);
});
export const coinTex = () => canvasTex(128, 128, (g) => {
  g.fillStyle = '#f2b33d'; g.strokeStyle = '#241726'; g.lineWidth = 8; g.beginPath(); g.arc(64, 64, 54, 0, 6.3); g.fill(); g.stroke();
  g.strokeStyle = '#ffd77a'; g.lineWidth = 5; g.beginPath(); g.arc(64, 64, 40, 0, 6.3); g.stroke();
  g.fillStyle = '#8a5a14'; g.font = '900 64px Inter, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('¥', 64, 68);
});
export const tapFxTex = () => canvasTex(128, 128, (g) => {
  g.lineCap = 'round';
  for (const a of [-2.4, -1.57, -0.7]) {
    g.lineWidth = 14; g.strokeStyle = '#241726'; g.beginPath(); g.moveTo(64 + Math.cos(a) * 26, 64 + Math.sin(a) * 26); g.lineTo(64 + Math.cos(a) * 56, 64 + Math.sin(a) * 56); g.stroke();
    g.lineWidth = 6; g.strokeStyle = '#fff3b0'; g.stroke();
  }
});
export const weedTex = () => canvasTex(128, 128, (g) => {
  g.strokeStyle = '#8a6a3a'; g.lineWidth = 4; const R = rng(5);
  for (let i = 0; i < 40; i++) { g.beginPath(); const a = R() * 6.3, b = a + 1 + R() * 2; g.arc(64, 64, 20 + R() * 36, a, b); g.stroke(); }
  g.strokeStyle = '#241726'; g.lineWidth = 3; g.beginPath(); g.arc(64, 64, 58, 0, 6.3); g.stroke();
});
export const woodPanel = () => canvasTex(512, 512, (g) => {
  const R = rng(13); g.fillStyle = '#8a5532'; g.fillRect(0, 0, 512, 512);
  for (let x = 0; x < 512; x += 64) { g.fillStyle = x % 128 ? '#7d4c2c' : '#93603a'; g.fillRect(x, 0, 62, 512); g.fillStyle = '#5a3520'; g.fillRect(x + 62, 0, 2, 512); }
  for (let i = 0; i < 300; i++) { g.strokeStyle = 'rgba(60,30,10,0.25)'; g.lineWidth = 1; const x = R() * 512; g.beginPath(); g.moveTo(x, R() * 512); g.lineTo(x + (R() - 0.5) * 6, R() * 512); g.stroke(); }
}, [3, 1]);
export const emblemTex = () => canvasTex(256, 256, (g) => {
  g.fillStyle = '#e8c45a'; g.strokeStyle = '#241726'; g.lineWidth = 8; g.beginPath(); g.arc(128, 128, 110, 0, 6.3); g.fill(); g.stroke();
  g.strokeStyle = '#241726'; g.lineWidth = 9; g.beginPath(); g.moveTo(128, 50); g.lineTo(128, 200); g.moveTo(60, 80); g.lineTo(196, 80); g.moveTo(90, 210); g.lineTo(166, 210); g.stroke();
  for (const x of [72, 184]) { g.beginPath(); g.moveTo(x, 80); g.lineTo(x - 30, 140); g.lineTo(x + 30, 140); g.closePath(); g.stroke(); g.beginPath(); g.arc(x, 140, 30, 0, Math.PI); g.stroke(); }
});
export const vendingTex = () => canvasTex(256, 512, (g) => {
  g.fillStyle = '#d6332a'; g.fillRect(0, 0, 256, 512);
  g.fillStyle = '#1b2440'; g.fillRect(20, 30, 216, 300);
  const cols = ['#3aa06a', '#f2b33d', '#2f6fd6', '#ff7a2f', '#ffffff', '#c0353a'];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) { g.fillStyle = cols[(r * 5 + c) % 6]; g.fillRect(34 + c * 40, 46 + r * 72, 26, 50); g.fillStyle = '#ffffff'; g.fillRect(36 + c * 40, 100 + r * 72, 22, 6); }
  g.fillStyle = '#111'; g.fillRect(40, 400, 176, 60);
});
