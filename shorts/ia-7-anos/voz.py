# Voz "más creativa": voz de alta calidad, cada frase con su propio ritmo, pausas dramáticas y efectos sutiles.
import subprocess, wave, json, numpy as np, sys
VOICE = sys.argv[1] if len(sys.argv) > 1 else "es_AR-daniela-high.onnx"
FPS = 30
# (frame de inicio del hueco, frame final del hueco, [(texto, length_scale, noise_scale, noise_w, pausa_despues_s)], efecto)
SLOTS = [
 (0, 47,  [("Olvida a los robots asesinos.", 0.95, 0.8, 1.0, 0)], None),
 (49, 154, [("La inteligencia artificial no necesita balas.", 0.86, 0.75, 0.95, 0.22), ("Le bastan... siete años.", 1.05, 0.85, 1.1, 0)], None),
 (156, 218, [("Año uno:", 0.95, 0.7, 0.9, 0.12), ("te quita las tareas pequeñas.", 0.85, 0.75, 0.95, 0)], None),
 (220, 339, [("Año tres:", 0.95, 0.7, 0.9, 0.12), ("tu empleo.", 0.95, 0.85, 1.0, 0.18), ("El FMI ve expuesto el cuarenta por ciento del mundo.", 0.84, 0.75, 0.95, 0)], None),
 (341, 408, [("Año cinco:", 0.95, 0.7, 0.9, 0.1), ("decide qué ves... y qué crees.", 0.88, 0.85, 1.05, 0)], None),
 (410, 506, [("Año siete.", 1.1, 0.7, 0.9, 0.2), ("Nadie la apaga...", 1.0, 0.85, 1.05, 0.12), ("porque nadie sabe vivir sin ella.", 0.92, 0.8, 1.0, 0)], "echo"),
 (508, 606, [("Por suerte, aún hay tiempo.", 0.9, 0.8, 1.0, 0.3), ("Por desgracia... nadie lo toma en serio.", 0.98, 0.85, 1.05, 0)], "low"),
]
sr = None
def synth(text, ls, ns, nw, path):
    subprocess.run(["python3", "-m", "piper", "-m", VOICE, "--length-scale", str(ls), "--noise-scale", str(ns), "--noise-w-scale", str(nw), "-f", path],
                   input=text.encode(), check=True, capture_output=True)
    w = wave.open(path); r = w.getframerate(); a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
    idx = np.where(np.abs(a) > 0.01)[0]; return a[max(0, idx[0] - 200): idx[-1] + 400], r
def atempo(a, r, k):
    open("tmp_in.raw", "wb").write(a.astype(np.float32).tobytes())
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "f32le", "-ar", str(r), "-ac", "1", "-i", "tmp_in.raw", "-af", f"atempo={k:.4f}", "-f", "f32le", "tmp_out.raw"], check=True)
    return np.frombuffer(open("tmp_out.raw", "rb").read(), dtype=np.float32)
total = 606 / FPS
out = None; info = []
for (f0, f1, phrases, fx) in SLOTS:
    parts = []
    for i, (t, ls, ns, nw, pause) in enumerate(phrases):
        a, sr = synth(t, ls, ns, nw, "ph.wav"); parts.append(a)
        if pause: parts.append(np.zeros(int(pause * sr), np.float32))
    seg = np.concatenate(parts)
    if out is None: out = np.zeros(int((total + 0.5) * sr), np.float32)
    slot = (f1 - f0) / FPS
    if len(seg) / sr > slot: seg = atempo(seg, sr, min(1.35, len(seg) / sr / slot))
    if fx == "echo":  # eco sutil, como en una sala enorme
        e = np.zeros(len(seg) + int(0.6 * sr), np.float32); e[:len(seg)] += seg
        for d, g in ((0.11, 0.28), (0.23, 0.16), (0.37, 0.08)): k = int(d * sr); e[k:k + len(seg)] += seg * g
        seg = e
    if fx == "low":  # final más íntimo: algo más cerca y cálido (graves)
        b = np.convolve(seg, np.ones(6) / 6, mode="same"); seg = seg * 0.75 + b * 0.45
    i0 = int(f0 / FPS * sr); n = min(len(seg), len(out) - i0); out[i0:i0 + n] += seg[:n]
    info.append({"f0": f0, "f1": f1, "dur": round(len(seg) / sr, 2), "text": " ".join(p[0] for p in phrases)})
out /= np.max(np.abs(out)) / 0.95
w = wave.open("voz_creativa.wav", "wb"); w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((out * 32767).astype(np.int16).tobytes()); w.close()
json.dump(info, open("segs_creativa.json", "w"), ensure_ascii=False, indent=1)
for x in info: print(x)
