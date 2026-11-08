# Encaja la toma de ElevenLabs en los huecos del vídeo (cada frase empieza en su cuadro fijo).
# Por frase: acorta las pausas largas entre palabras y, si aún no cabe, acelera sin cambiar el tono (atempo).
# Escribe public/voz/voz.wav y public/voz/palabras_whisper.json (tiempos por palabra ya en la línea del vídeo).
import json, subprocess, wave
import numpy as np

FPS, TOTAL, SR = 30, 686, 44100
SRC = "public/voz/elevenlabs/original.mp3"
W = json.load(open("public/voz/elevenlabs/palabras_original.json"))
# (índices de palabra [a, b], cuadro inicial del hueco, cuadro final del hueco)
SEG = [((0, 4), 0, 48), ((5, 14), 49, 155), ((15, 21), 156, 219), ((22, 34), 220, 340), ((35, 42), 341, 409),
       ((43, 53), 410, 507), ((54, 65), 508, 606), ((66, 75), 608, 684)]
MAX_GAP, KEEP_GAP, MAX_TEMPO = 0.36, 0.26, 1.32

raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", SRC, "-ar", str(SR), "-ac", "1", "-f", "f32le", "-"], capture_output=True, check=True).stdout
src = np.frombuffer(raw, dtype=np.float32)

def atempo(a, k):
    if k <= 1.001: return a
    p = subprocess.run(["ffmpeg", "-loglevel", "error", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-", "-af", f"atempo={k:.4f}", "-f", "f32le", "-"],
                       input=a.astype(np.float32).tobytes(), capture_output=True, check=True)
    return np.frombuffer(p.stdout, dtype=np.float32)

out = np.zeros(int((TOTAL / FPS + 0.5) * SR), np.float32)
words = []
for (a, b), f0, f1 in SEG:
    t0, t1 = max(0, W[a]["s"] - 0.06), W[b]["e"] + 0.12
    # tramos que se quedan: se recorta el centro de cada pausa larga
    keep, cur = [], t0
    for i in range(a, b):
        g0, g1 = W[i]["e"], W[i + 1]["s"]
        if g1 - g0 > MAX_GAP:
            c0, c1 = g0 + KEEP_GAP / 2, g1 - KEEP_GAP / 2
            keep.append((cur, c0)); cur = c1
    keep.append((cur, t1))
    def mapped(t):  # tiempo original -> segundos desde el inicio del tramo, antes de acelerar
        acc = 0.0
        for k0, k1 in keep:
            if t <= k1: return acc + max(0.0, t - k0)
            acc += k1 - k0
        return acc
    fade = int(0.008 * SR)
    pieces = []
    for k0, k1 in keep:
        p = src[int(k0 * SR):int(k1 * SR)].copy()
        if len(p) > 2 * fade: p[:fade] *= np.linspace(0, 1, fade); p[-fade:] *= np.linspace(1, 0, fade)
        pieces.append(p)
    seg = np.concatenate(pieces)
    slot = (f1 - f0) / FPS
    k = min(MAX_TEMPO, max(1.0, len(seg) / SR / slot))
    seg = atempo(seg, k)
    i0 = int(f0 / FPS * SR); n = min(len(seg), len(out) - i0); out[i0:i0 + n] += seg[:n]
    for i in range(a, b + 1):
        words.append({"w": W[i]["w"], "s": round(f0 / FPS + mapped(W[i]["s"]) / k, 3), "e": round(f0 / FPS + mapped(W[i]["e"]) / k, 3)})
    print(f"frames {f0}-{f1}: {len(seg) / SR:.2f}s en hueco de {slot:.2f}s, x{k:.2f}" + ("  (se pasa)" if len(seg) / SR > slot + 0.05 else ""))

out /= max(1e-6, np.max(np.abs(out))) / 0.95
wv = wave.open("public/voz/voz.wav", "wb"); wv.setnchannels(1); wv.setsampwidth(2); wv.setframerate(SR)
wv.writeframes((out * 32767).astype(np.int16).tobytes()); wv.close()
json.dump(words, open("public/voz/palabras_whisper.json", "w"), ensure_ascii=False, indent=0)
