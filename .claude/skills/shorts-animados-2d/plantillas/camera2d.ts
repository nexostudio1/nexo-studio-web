// Cámara 2D para vertical 9:16 (1080x1920): zoom, seguimiento, vibración y cambios de plano.
export type Key = { f: number; x: number; y: number; zoom: number; rot?: number };
export const W = 1080, H = 1920; // 9:16

const smoother = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Interpola entre llaves con smootherstep (nunca lineal).
export function camAt(keys: Key[], f: number) {
  if (f <= keys[0].f) return { rot: 0, ...keys[0] };
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (f <= b.f) {
      const t = smoother((f - a.f) / (b.f - a.f));
      return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), zoom: lerp(a.zoom, b.zoom, t), rot: lerp(a.rot ?? 0, b.rot ?? 0, t) };
    }
  }
  const l = keys[keys.length - 1];
  return { rot: 0, ...l };
}

// Seguimiento con retraso suave: la cámara llega un poco tarde al personaje (se siente humana).
export function follow(targetXs: number[], f: number, lag = 8) {
  let c = targetXs[0];
  for (let i = 1; i <= f; i++) c += (targetXs[Math.min(i, targetXs.length - 1)] - c) / lag;
  return c;
}

// Vibración que cambia de signo cada cuadro y se apaga en `dur` cuadros.
export function shake(f: number, hitFrame: number, amp = 18, dur = 7) {
  const k = f - hitFrame;
  if (k < 0 || k >= dur) return { x: 0, y: 0, rot: 0 };
  const e = 1 - k / dur, s = k % 2 ? -1 : 1;
  return { x: s * amp * e, y: -s * amp * 0.6 * e, rot: s * 0.8 * e };
}

// Parallax: cada capa se desplaza a distinta velocidad. 0 = cielo fijo, 1 = plano de los personajes, >1 = primer plano.
export const LAYERS = { cielo: 0.1, lejos: 0.25, medio: 0.55, suelo: 1, personajes: 1, frente: 1.5 };
export const layerOffset = (cam: { x: number; y: number }, speed: number) => ({ x: -cam.x * speed, y: -cam.y * speed });
// Desenfoque de campo en px a 1080x1920 por capa.
export const BLUR = { cielo: 0, lejos: 6, medio: 3, personajes: 0, frente: 12 };
