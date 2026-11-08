# Mezcla de "La guerra que perdió Australia" (SIN_VOZ=1: solo ambiente y efectos): voz al frente; ambiente y efectos sintetizados, sincronizados con story.ts.
import numpy as np, wave, subprocess, os
SIN_VOZ = os.environ.get("SIN_VOZ") == "1"
F = 30; TOTAL = 1452
w = wave.open("public/voz/voz.wav"); sr = w.getframerate()
voz = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
n = int((TOTAL / F + 0.3) * sr); y = np.zeros(n, np.float32); y[:min(n, len(voz))] += 0 if SIN_VOZ else voz[:n]
t = np.arange(n) / sr; rng = np.random.default_rng(7)
def lp(x, k): return np.convolve(x, np.ones(k) / k, mode="same")
def put(i, s):
    i = int(i); m = max(0, min(len(s), n - i)); y[i:i + m] += s[:m]
fs = lambda f: int(f / F * sr)
# --- mismo reloj del mundo que story.ts (cámara lenta en "se atasca") ---
def sm(x): x = np.clip(x, 0, 1); return x * x * (3 - 2 * x)
S = dict(in0=758, in1=768, out0=800, out1=812, rate=0.22)
rate = lambda f: 1 - (1 - S["rate"]) * (sm((f - S["in0"]) / (S["in1"] - S["in0"])) - sm((f - S["out0"]) / (S["out1"] - S["out0"])))
WF = [0.0]
for f in range(1, TOTAL + 3): WF.append(WF[-1] + rate(f - 0.5))
WF = np.array(WF)
# ambiente: viento suave + chicharras
wind = lp(rng.standard_normal(n), 400) * 0.9; y += wind * 0.05 * (0.7 + 0.3 * np.sin(t * 0.4))
cic = rng.standard_normal(n) - lp(rng.standard_normal(n), 3); y += cic * 0.006 * (0.5 + 0.5 * np.sin(2 * np.pi * 7 * t) ** 2)
# disparos: un golpe por fogonazo (cuando el reloj del mundo cruza un múltiplo de 3 dentro de la ráfaga)
def shot(i, slow=1.0):
    L = int(0.18 * sr / slow); k = np.arange(L) / sr * slow
    s = rng.standard_normal(L) * np.exp(-k * 38) * 0.55 + np.sin(2 * np.pi * (90 * slow) * k / slow) * np.exp(-k * 22) * 0.6
    put(i, s * (0.9 if slow > 0.5 else 1.1))
for (a, b, guns) in ((509, 545, 2), (738, 783, 1)):
    w0, w1 = WF[a], WF[b]
    for f in range(a - 2, b + 60):
        for g in range(guns):
            lo, hi = WF[f] + g, WF[f + 1] + g
            if np.floor(hi / 3) > np.floor(lo / 3) and w0 <= WF[f] < w1: shot(fs(f) + g * 400, rate(f))
# atasco: clonc metálico grave (en cámara lenta) + siseo de vapor
i = fs(784); L = int(0.9 * sr); k = np.arange(L) / sr
put(i, (np.sin(2 * np.pi * 140 * k) + 0.5 * np.sin(2 * np.pi * 223 * k)) * np.exp(-k * 6) * 0.35)
put(i + int(0.1 * sr), rng.standard_normal(int(1.2 * sr)) * np.linspace(0.12, 0, int(1.2 * sr)))
# cámara lenta: whoosh grave y lento
i0, i1 = fs(756), fs(812); k = np.linspace(0, 1, i1 - i0); y[i0:i1] += lp(rng.standard_normal(i1 - i0), 120) * np.sin(np.pi * k) * 0.5
# pisadas: tamborileo de patas (huida, carrera, carga)
def patter(a, b, hz, amp):
    for f in np.arange(a, b, 30 / hz):
        L = int(0.05 * sr); k = np.arange(L) / sr
        put(fs(f) + int(rng.integers(0, 300)), np.sin(2 * np.pi * 70 * k) * np.exp(-k * 60) * amp * (0.6 + 0.4 * rng.random()))
patter(542, 612, 22, 0.35); patter(830, 950, 14, 0.3); patter(953, 1124, 9, 0.4); patter(1150, 1230, 26, 0.45)
# coche de 1932: motor a petardeos y bocinazo al ser adelantado
for f in np.arange(953, 1124, 30 / 11):
    L = int(0.06 * sr); k = np.arange(L) / sr; put(fs(f), (rng.standard_normal(L) * 0.4 + np.sin(2 * np.pi * 55 * k)) * np.exp(-k * 40) * 0.18)
i = fs(1064); L = int(0.55 * sr); k = np.arange(L) / sr
put(i, np.sign(np.sin(2 * np.pi * (330 + 60 * np.sin(2 * np.pi * 3 * k)) * k)) * np.minimum(1, k * 30) * np.exp(-k * 2.5) * 0.09)
# whooshes en los movimientos de cámara e impactos en las cifras
def whoosh(f, d=0.6, amp=0.22):
    L = int(d * sr); k = np.linspace(0, 1, L); put(fs(f), lp(rng.standard_normal(L), 30) * np.sin(np.pi * k) ** 2 * amp)
for f in (24, 70, 214, 352, 406, 555, 690, 900, 1160, 1232, 1330): whoosh(f)
def hit(f, amp=0.4):
    L = int(0.7 * sr); k = np.arange(L) / sr; put(fs(f), np.sin(2 * np.pi * 62 * np.exp(-k * 2) * k) * np.exp(-k * 6) * amp)
for f in (121, 412, 1005, 1249, 1283): hit(f)
# el emú del final: un "bum" grave de emú (tamborileo de garganta)
for j in range(3): L = int(0.25 * sr); k = np.arange(L) / sr; put(fs(1400) + j * int(0.3 * sr), np.sin(2 * np.pi * 80 * k) * np.sin(np.pi * k / 0.25) * 0.25)
y = np.tanh(y * 1.2); y /= np.max(np.abs(y)) / 0.92
o = wave.open("out/mezcla_raw.wav", "wb"); o.setnchannels(1); o.setsampwidth(2); o.setframerate(sr); o.writeframes((y * 32767).astype(np.int16).tobytes()); o.close()
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", "out/mezcla_raw.wav", "-af", "loudnorm=I=%d:TP=-1:LRA=11" % (-19 if SIN_VOZ else -14), "-ar", "48000", "-ac", "2", "out/mezcla_sin_voz.wav" if SIN_VOZ else "out/mezcla.wav"], check=True)
os.remove("out/mezcla_raw.wav"); print("ok")
