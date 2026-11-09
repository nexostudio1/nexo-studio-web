// Iluminación cinematográfica 2D: una luz por escena según el tono de la historia.
export type Mood = 'calido' | 'azul' | 'rojo' | 'noche' | 'atardecer';
export type Light = {
  key: string;      // color de la luz principal (se pinta sobre el lado iluminado)
  shadow: string;   // color de las sombras (siempre tintado, nunca negro)
  rim: string;      // luz de borde
  ambient: string;  // tinte global (multiply suave)
  sky: [string, string];
  azimut: number;   // grados; 0 = luz desde la derecha, 180 = desde la izquierda
  intensity: number;
};
export const MOODS: Record<Mood, Light> = {
  calido:    { key: '#FFD08A', shadow: '#5b3f7a', rim: '#FFF1C9', ambient: '#FFE6BF', sky: ['#7fc4ff', '#ffe6bf'], azimut: 35,  intensity: 1.0 },
  atardecer: { key: '#FFB36B', shadow: '#6a3f86', rim: '#FFD7A0', ambient: '#FFC9A0', sky: ['#ffc47c', '#8a6f8a'], azimut: 10,  intensity: 1.1 },
  azul:      { key: '#8FB8FF', shadow: '#1f2a66', rim: '#C6E0FF', ambient: '#9fb8e8', sky: ['#1d3a7a', '#7aa6e8'], azimut: 140, intensity: 0.9 },
  rojo:      { key: '#FF4A3D', shadow: '#3a0f2e', rim: '#FF9A7A', ambient: '#d85a5a', sky: ['#4a0f1f', '#c63a3a'], azimut: 160, intensity: 1.15 },
  noche:     { key: '#6C8CFF', shadow: '#150f33', rim: '#A9C0FF', ambient: '#5a6aa8', sky: ['#0b0f2e', '#3b4a8a'], azimut: 120, intensity: 0.8 },
};
// Vector de sombra a partir del azimut: las sombras caen hacia el lado contrario.
export function shadowDir(L: Light) {
  const a = (L.azimut * Math.PI) / 180;
  return { dx: -Math.cos(a), skew: Math.cos(a) * 28 /* grados de skewX */, flat: 0.28 /* scaleY de la sombra proyectada */ };
}
