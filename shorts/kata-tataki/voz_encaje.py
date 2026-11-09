# Encaja la voz de ElevenLabs frase a frase en los planos del vídeo -> out/voz_encajada.wav + tiempos_voz.json (para subs)
import json, subprocess, numpy as np, wave, re
SR = 44100
subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', 'voz_eleven/eleven.mp3', '-ar', str(SR), '-ac', '1', 'out/v44.wav'], check=True)
w = wave.open('out/v44.wav'); V = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
W = json.load(open('voz_eleven/palabras.json'))
SEGS = json.load(open('tiempos2.json'))['segs']
FIRST = [('en', 'japón'), ('allí', 'despedir'), ('así', 'que'), ('su', 'técnica'), ('pasa', 'por'), ('parece', 'un'), ('pero', 'cada'),
         ('por', 'eso'), ('y', 'si'), ('un', 'día'), ('ahora', 'pasa')]   # dos primeras palabras de cada frase
# silencios reales (para cortar por en medio de ellos y no comerse sílabas)
out = subprocess.run(['ffmpeg', '-hide_banner', '-i', 'out/v44.wav', '-af', 'silencedetect=noise=-38dB:d=0.08', '-f', 'null', '-'], capture_output=True, text=True).stderr
ss = [float(x) for x in re.findall(r'silence_start: ([\d.]+)', out)]; se = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', out)]
SIL = list(zip(ss, se))
def cut_between(a, b):
    """punto de corte entre el final de una palabra (a) y el inicio de la siguiente (b)"""
    c = [(s, e) for s, e in SIL if e > a - 0.15 and s < b + 0.15]
    return (c[0][0] + 0.06, c[0][1] - 0.04) if c else ((a + b) / 2, (a + b) / 2)
idx, k = [], 0
for i, x in enumerate(W):
    nw = lambda q: W[q][2].strip('¿¡,.').lower() if q < len(W) else ''
    if k < len(FIRST) and (nw(i), nw(i + 1)) == FIRST[k]: idx.append(i); k += 1
assert len(idx) == 11, idx
ranges = []
for n, i in enumerate(idx):
    j = idx[n + 1] - 1 if n < 10 else len(W) - 1
    a = 0.0 if n == 0 else cut_between(W[i - 1][1], W[i][0])[1]
    b = len(V) / SR if n == 10 else cut_between(W[j][1], W[j + 1][0])[0]
    ranges.append((a, b))
def clip(a, b): return V[int(a * SR):int(b * SR)].copy()
def squeeze_pauses(x, mx=0.26):
    """acorta los silencios internos largos a mx s"""
    env = np.convolve(np.abs(x), np.ones(441) / 441, 'same'); quiet = env < 10 ** (-38 / 20)
    out, i, n = [], 0, len(x)
    while i < n:
        if quiet[i]:
            j = i
            while j < n and quiet[j]: j += 1
            L = j - i; keep = L if (i == 0 or j == n) else min(L, int(mx * SR))
            out.append(x[i:i + keep // 2]); out.append(x[j - (keep - keep // 2):j]); i = j
        else:
            j = i
            while j < n and not quiet[j]: j += 1
            out.append(x[i:j]); i = j
    return np.concatenate(out)
def atempo(x, r):
    if abs(r - 1) < 0.005: return x
    p = subprocess.run(['ffmpeg', '-loglevel', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', '-af', f'atempo={r:.4f}', '-f', 'f32le', '-'], input=x.tobytes(), capture_output=True, check=True)
    return np.frombuffer(p.stdout, dtype=np.float32)
def trim(x):
    env = np.abs(x) > 10 ** (-40 / 20); nz = np.nonzero(env)[0]
    return x[max(0, nz[0] - int(0.03 * SR)): nz[-1] + int(0.06 * SR)]
END = 45.467; N = int(END * SR); out = np.zeros(N, np.float32)
EARLY = [0.35, 0, 0, 0, 0, 0.8, 0, 0, 0, 0, 0]   # cuánto puede adelantarse cada frase a su plano
prev_end, place = 0.0, []
for n, (a, b) in enumerate(ranges):
    x = trim(squeeze_pauses(clip(a, b)))
    s0 = max(SEGS[n]['t0'] - EARLY[n], prev_end + 0.12)
    lim = (SEGS[n + 1]['t0'] - 0.08) if n < 10 else END - 0.25
    d = len(x) / SR; r = min(1.10, max(1.0, d / max(0.1, lim - s0)))
    x = atempo(x, r).copy(); d = len(x) / SR
    fade = int(0.01 * SR); x[:fade] *= np.linspace(0, 1, fade); x[-fade:] *= np.linspace(1, 0, fade)
    i0 = int(s0 * SR); seg = x[:max(0, N - i0)]; out[i0:i0 + len(seg)] += seg
    place.append({'t0': s0, 't1': s0 + d}); prev_end = s0 + d
    print(f"{n + 1:2d} voz {a:5.2f}-{b:5.2f} -> {s0:5.2f}-{s0 + d:5.2f} (plano {SEGS[n]['t0']:5.2f}-{SEGS[n]['t1']:5.2f}) x{r:.3f}" + ('  PISA' if s0 + d > lim + 0.01 else ''))
ww = wave.open('out/voz_encajada.wav', 'w'); ww.setnchannels(1); ww.setsampwidth(2); ww.setframerate(SR)
ww.writeframes((np.clip(out, -1, 1) * 32767).astype(np.int16).tobytes()); ww.close()
json.dump({'segs': place}, open('tiempos_voz.json', 'w'), indent=1)
