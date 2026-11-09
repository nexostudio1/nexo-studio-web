// Sincronización labial para español: palabras con tiempos -> visemas por cuadro.
// El español es casi fonético, así que reglas de grafemas a visemas bastan.
export type Viseme = 'REST' | 'MBP' | 'FV' | 'A' | 'E' | 'I' | 'O' | 'U' | 'TDLN' | 'SZ' | 'CH' | 'R';
export type Word = { word: string; start: number; end: number }; // segundos

const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zñ]/g, '');

export function wordToVisemes(raw: string): Viseme[] {
  const w = norm(raw);
  const out: Viseme[] = [];
  for (let i = 0; i < w.length; i++) {
    const c = w[i], n = w[i + 1];
    if (c === 'c' && n === 'h') { out.push('CH'); i++; continue; }
    if (c === 'l' && n === 'l') { out.push('I'); i++; continue; }
    if (c === 'q' && n === 'u') { i++; continue; }
    if (c === 'g' && n === 'u' && 'ei'.includes(w[i + 2] ?? '')) { i++; continue; }
    if ('mbp'.includes(c)) out.push('MBP');
    else if (c === 'c' && !'ei'.includes(n ?? '')) out.push('TDLN'); // c dura = k
    else if (c === 'f') out.push('FV');
    else if (c === 'a') out.push('A');
    else if (c === 'e') out.push('E');
    else if (c === 'i' || c === 'y') out.push('I');
    else if (c === 'o') out.push('O');
    else if (c === 'u' || c === 'w') out.push('U');
    else if ('tdln'.includes(c) || c === 'ñ') out.push('TDLN');
    else if ('szcxj'.includes(c)) out.push('SZ');
    else if (c === 'r') out.push('R');
    else if ('gkh'.includes(c)) { if (c !== 'h') out.push('TDLN'); }
    else if (c === 'v') out.push('MBP'); // en español v = b
  }
  // quita repetidos seguidos
  return out.filter((v, k) => v !== out[k - 1]);
}

// Devuelve el visema de cada cuadro. Las consonantes duran poco y las vocales se llevan el tiempo.
export function buildTrack(words: Word[], fps: number, totalFrames: number): Viseme[] {
  const track: Viseme[] = Array(totalFrames).fill('REST');
  for (const w of words) {
    const vs = wordToVisemes(w.word);
    if (!vs.length) continue;
    const weight = (v: Viseme) => ('AEIOU'.includes(v) ? 2 : 1);
    const total = vs.reduce((s, v) => s + weight(v), 0);
    const f0 = Math.max(0, Math.round((w.start - 0.02) * fps)); // la boca se adelanta ~1 cuadro
    const f1 = Math.min(totalFrames, Math.round((w.end - 0.02) * fps));
    let acc = 0;
    for (const v of vs) {
      const a = f0 + Math.round(((f1 - f0) * acc) / total);
      acc += weight(v);
      const b = f0 + Math.round(((f1 - f0) * acc) / total);
      for (let f = a; f < Math.max(b, a + 1) && f < totalFrames; f++) track[f] = v;
    }
  }
  return track;
}

// Forma de la boca (0..1) para suavizar entre visemas con un resorte, no saltos duros.
export const MOUTH: Record<Viseme, { open: number; wide: number; round: number; teeth: number }> = {
  REST: { open: 0.05, wide: 0.5, round: 0, teeth: 0 },
  MBP:  { open: 0.0,  wide: 0.45, round: 0, teeth: 0 },
  FV:   { open: 0.12, wide: 0.55, round: 0, teeth: 1 },
  A:    { open: 1.0,  wide: 0.7, round: 0, teeth: 0.4 },
  E:    { open: 0.55, wide: 1.0, round: 0, teeth: 0.7 },
  I:    { open: 0.3,  wide: 1.0, round: 0, teeth: 0.9 },
  O:    { open: 0.7,  wide: 0.3, round: 0.8, teeth: 0 },
  U:    { open: 0.3,  wide: 0.1, round: 1.0, teeth: 0 },
  TDLN: { open: 0.3,  wide: 0.6, round: 0, teeth: 0.8 },
  SZ:   { open: 0.2,  wide: 0.8, round: 0, teeth: 1 },
  CH:   { open: 0.25, wide: 0.3, round: 0.6, teeth: 0.8 },
  R:    { open: 0.35, wide: 0.5, round: 0.2, teeth: 0.3 },
};
