// Cara del teléfono pintada en su pantalla (Canvas2D, un dibujo por cuadro).
import {Phone} from './anim';
import {rr} from './tex';

export const FW = 420, FH = 800;
const hex = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a: string, b: string, t: number, al = 1) => {
  const A = hex(a), B = hex(b);
  return `rgba(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')},${al})`;
};
const INK = '#05060f';

export function drawFace(g: CanvasRenderingContext2D, ph: Phone, f: number) {
  const W = FW, H = FH, a = ph.anger;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, W, H);
  const bg = g.createRadialGradient(W * 0.5, H * 0.38, 20, W * 0.5, H * 0.45, H * 0.8);
  bg.addColorStop(0, mix('#2e3f86', '#6a1426', a));
  bg.addColorStop(1, mix('#070a1c', '#14040a', a));
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  const reflect = () => {
    const rf = g.createLinearGradient(0, 0, W, H);
    rf.addColorStop(0.2, 'rgba(255,255,255,0)'); rf.addColorStop(0.32, 'rgba(255,255,255,0.08)');
    rf.addColorStop(0.42, 'rgba(255,255,255,0)');
    g.fillStyle = rf; g.fillRect(0, 0, W, H);
  };
  if (ph.glow === 0) {
    g.fillStyle = '#04050c'; g.fillRect(0, 0, W, H);
    reflect();
    return;
  }
  // líneas de pantalla
  g.fillStyle = 'rgba(0,0,0,0.13)';
  for (let y = 0; y < H; y += 6) g.fillRect(0, y, W, 2);
  // barra de estado
  g.fillStyle = 'rgba(255,255,255,0.8)'; g.font = 'bold 30px Arial'; g.textBaseline = 'middle'; g.textAlign = 'left';
  g.fillText('3:07', 34, 46);
  g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 3; rr(g, W - 96, 33, 50, 26, 6); g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.8)'; g.fillRect(W - 44, 41, 5, 10);
  if (Math.floor(f / 8) % 2 === 0) { g.fillStyle = '#ff3b30'; rr(g, W - 92, 37, 8, 18, 3); g.fill(); }
  g.fillStyle = '#000'; rr(g, W / 2 - 55, 26, 110, 36, 18); g.fill();

  const iris = mix('#3ad6ff', '#ff2f45', Math.min(1, a * 1.15));
  for (const s of [-1, 1]) {
    const cx = W / 2 + s * W * 0.235, cy = H * 0.37, rx = W * 0.178, ry = W * 0.205;
    // brillo
    g.save(); g.shadowColor = iris; g.shadowBlur = 34;
    g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, 7); g.fill(); g.restore();
    g.save(); g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, 7); g.clip();
    const ix = cx + ph.look[0] * rx * 0.42, iy = cy - ph.look[1] * ry * 0.4, ir = rx * 0.56 * ph.pupil;
    const ig = g.createRadialGradient(ix, iy, ir * 0.2, ix, iy, ir);
    ig.addColorStop(0, mix('#ffffff', '#ffd0d0', a)); ig.addColorStop(0.35, iris); ig.addColorStop(1, mix('#0a4f8a', '#6a0010', a));
    g.fillStyle = ig; g.beginPath(); g.arc(ix, iy, ir, 0, 7); g.fill();
    g.fillStyle = '#05060c'; g.beginPath(); g.arc(ix, iy, ir * 0.5, 0, 7); g.fill();
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(ix - ir * 0.32, iy - ir * 0.35, ir * 0.24, 0, 7); g.fill();
    g.beginPath(); g.arc(ix + ir * 0.3, iy + ir * 0.3, ir * 0.1, 0, 7); g.fill();
    // párpados
    const th = -s * a * 0.5;
    const lidC = mix('#1b2558', '#3e0c1a', a);
    const y0 = cy - ry + 2 * ry * Math.min(1, ph.lid + 0.1 * a);
    g.save(); g.translate(cx, y0); g.rotate(th);
    g.fillStyle = lidC; g.fillRect(-rx * 2, -ry * 3, rx * 4, ry * 3);
    g.strokeStyle = INK; g.lineWidth = 9; g.beginPath(); g.moveTo(-rx * 2, 0); g.lineTo(rx * 2, 0); g.stroke();
    g.restore();
    const yb = cy + ry - 2 * ry * (0.12 * a + 0.5 * Math.max(0, ph.lid - 0.5));
    g.fillStyle = lidC; g.fillRect(cx - rx * 2, yb, rx * 4, ry * 2);
    g.strokeStyle = INK; g.lineWidth = 6; g.beginPath(); g.moveTo(cx - rx * 2, yb); g.lineTo(cx + rx * 2, yb); g.stroke();
    g.restore();
    g.strokeStyle = INK; g.lineWidth = 7; g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, 7); g.stroke();
    // ceja
    const by = cy - ry - 30 + a * 22 + 30 * Math.max(0, ph.lid - 0.3);
    g.save(); g.translate(cx, by); g.rotate(th * 1.25);
    g.lineCap = 'round'; g.strokeStyle = INK; g.lineWidth = 30; g.beginPath(); g.moveTo(-rx * 0.85, 0); g.lineTo(rx * 0.85, 0); g.stroke();
    g.strokeStyle = '#e8ecff'; g.lineWidth = 20; g.beginPath(); g.moveTo(-rx * 0.85, 0); g.lineTo(rx * 0.85, 0); g.stroke();
    g.restore();
  }
  // boca
  const mx = W / 2, my = H * 0.68;
  g.lineCap = 'round'; g.lineJoin = 'round';
  if (ph.mouth > 0.5) {
    const ry = W * 0.2 * ph.mouth, rx = W * 0.17;
    g.save(); g.beginPath(); g.ellipse(mx, my, rx, ry, 0, 0, 7);
    g.fillStyle = '#2a0510'; g.fill(); g.clip();
    g.fillStyle = '#ffffff'; g.fillRect(mx - rx, my - ry, rx * 2, ry * 0.32);
    g.fillStyle = '#e8506a'; g.beginPath(); g.ellipse(mx, my + ry * 0.85, rx * 0.65, ry * 0.5, 0, 0, 7); g.fill();
    g.restore();
    g.strokeStyle = INK; g.lineWidth = 8; g.beginPath(); g.ellipse(mx, my, rx, ry, 0, 0, 7); g.stroke();
  } else if (ph.grit > 0.3) {
    const w = W * 0.38, h = 74, jx = 2.5 * Math.sin(f * 3.1);
    const x0 = mx - w / 2 + jx, y0 = my - h / 2;
    rr(g, x0, y0, w, h, 18); g.fillStyle = '#ffffff'; g.fill();
    g.strokeStyle = '#9aa2c8'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(x0, my); g.lineTo(x0 + w, my); g.stroke();
    for (let i = 1; i < 6; i++) { g.beginPath(); g.moveTo(x0 + (w * i) / 6, y0); g.lineTo(x0 + (w * i) / 6, y0 + h); g.stroke(); }
    rr(g, x0, y0, w, h, 18); g.strokeStyle = INK; g.lineWidth = 8; g.stroke();
  } else {
    g.strokeStyle = INK; g.lineWidth = 24; g.beginPath(); g.arc(mx, my + 70, 82, Math.PI * 1.2, Math.PI * 1.8); g.stroke();
    g.strokeStyle = '#e8ecff'; g.lineWidth = 14; g.beginPath(); g.arc(mx, my + 70, 82, Math.PI * 1.2, Math.PI * 1.8); g.stroke();
  }
  // bordes rojos de enojo
  const v = g.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.62);
  v.addColorStop(0, 'rgba(255,30,40,0)'); v.addColorStop(1, `rgba(255,30,40,${0.35 * a * a})`);
  g.fillStyle = v; g.fillRect(0, 0, W, H);
  if (ph.glow > 1) { g.fillStyle = `rgba(255,255,255,${Math.min(0.35, ((ph.glow - 1) / 2.5) * 0.35)})`; g.fillRect(0, 0, W, H); }
  reflect();
}
