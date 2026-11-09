# Efectos y música originales sintetizados con numpy + mezcla con la voz -> out/mezcla.wav
import numpy as np, wave, json
SR = 44100; FPS = 30
T = json.load(open('tiempos.json')); DUR = 1225 / FPS
N = int(DUR * SR) + 1
fx = np.zeros(N); amb = np.zeros(N); mus = np.zeros(N)
R = np.random.default_rng(7)
t_ = lambda d: np.arange(int(d * SR)) / SR
def put(buf, f, x, g=1.0):
    i = int(f / FPS * SR); j = min(N, i + len(x))
    if j > i: buf[i:j] += x[: j - i] * g
def env(n, a=0.005, r=0.05):
    e = np.ones(n); na, nr = int(a * SR), int(r * SR)
    if na: e[:na] = np.linspace(0, 1, na)
    if nr: e[-nr:] *= np.linspace(1, 0, nr)
    return e
def lp(x, k):  # paso bajo de un polo
    y = np.zeros_like(x); a = k; s = 0.0
    for i in range(len(x)): s += a * (x[i] - s); y[i] = s
    return y
def bp(x, lo, hi):
    X = np.fft.rfft(x); fr = np.fft.rfftfreq(len(x), 1 / SR); X[(fr < lo) | (fr > hi)] = 0; return np.fft.irfft(X, len(x))
noise = lambda d: R.standard_normal(int(d * SR))

# timbre de teléfono antiguo (el mismo al principio y al final: cierra el bucle)
def ring(d):
    t = t_(d); am = (np.sin(2 * np.pi * 20 * t) > 0).astype(float)
    x = (np.sin(2 * np.pi * 1180 * t) + 0.6 * np.sin(2 * np.pi * 1530 * t) + 0.3 * np.sin(2 * np.pi * 2360 * t)) * am
    return x * env(len(t), 0.003, 0.03) * 0.32
RING = ring(1.1)
put(fx, 0, RING[: int(9 / FPS * SR) + 300] * env(int(9 / FPS * SR) + 300, 0.002, 0.01))
put(fx, 1192, RING)
put(fx, 432, ring(0.5), 0.7)
def click(g=1.0):
    t = t_(0.06); return (np.sin(2 * np.pi * 900 * t) * np.exp(-t * 90) + noise(0.06) * np.exp(-t * 160) * 0.5) * 0.5 * g
put(fx, 9, click()); put(fx, 447, click())
def thud(f0=70, d=0.45, g=1.0):
    t = t_(d); return (np.sin(2 * np.pi * f0 * t * (1 - 0.3 * t)) * np.exp(-t * 9) + lp(noise(d), 0.08) * np.exp(-t * 25) * 2) * g
def whoosh(d=0.45, g=0.25):
    n = noise(d); t = t_(d); e = np.sin(np.pi * t / d) ** 2
    return bp(n, 250, 2600) * e * g
for f in [112, 190, 262, 350, 410, 445, 506, 536, 578, 623, 727, 777, 859, 966, 1023, 1077]: put(fx, f - 6, whoosh())
# teclado
def keys(f0, f1, rate=11, g=0.12):
    f = f0
    while f < f1:
        put(fx, f, (noise(0.025) * np.exp(-t_(0.025) * 220)) * g * (0.6 + R.random() * 0.6)); f += FPS / rate * (0.5 + R.random())
keys(130, 190); keys(412, 444, g=0.1)
# carta: el jefe la rompe
tear = bp(noise(0.6), 900, 7000) * (0.5 + 0.5 * np.abs(np.sin(np.arange(int(0.6 * SR)) / SR * 2 * np.pi * 37))) * env(int(0.6 * SR), 0.02, 0.15) * 0.35
put(fx, 214, tear)
# app: aparece, toque y «contratado»
def pop(f0=600, g=0.25):
    t = t_(0.12); return np.sin(2 * np.pi * f0 * (1 + 2 * t) * t) * np.exp(-t * 30) * g
put(fx, 271, pop(520)); put(fx, 326, pop(900, 0.2))
def ding(f0=1320, g=0.22):
    t = t_(0.9); return (np.sin(2 * np.pi * f0 * t) + 0.5 * np.sin(2 * np.pi * f0 * 1.5 * t)) * np.exp(-t * 5) * g
put(fx, 334, ding()); put(fx, 338, ding(1760, 0.16))
# golpe de zoom en el cartel
put(fx, 382, thud(55, 0.8, 0.8)); put(fx, 376, whoosh(0.25, 0.3))
# marcación DTMF
DT = {'1': (697, 1209), '3': (697, 1477), '5': (770, 1336), '8': (852, 1336), '0': (941, 1336), '9': (852, 1477)}
for k, d in enumerate('3580910'):
    t = t_(0.08); a, b = DT[d]; put(fx, 418 + k * 3.2, (np.sin(2 * np.pi * a * t) + np.sin(2 * np.pi * b * t)) * env(len(t), 0.003, 0.01) * 0.09)
for k, d in enumerate('1358'):
    t = t_(0.08); a, b = DT[d]; put(fx, 1156 + k * 4, (np.sin(2 * np.pi * a * t) + np.sin(2 * np.pi * b * t)) * env(len(t), 0.003, 0.01) * 0.08)
# gritos del jefe: «voz» ininteligible (sierra con formantes cambiantes, saturada)
def shout(d, tel=False, g=0.3):
    t = t_(d); f0 = 190 + 40 * np.sin(2 * np.pi * 3.3 * t) + 25 * np.sin(2 * np.pi * 7.1 * t)
    ph = np.cumsum(f0) / SR; saw = 2 * (ph % 1) - 1
    X = np.zeros(len(t))
    syl = (np.sin(2 * np.pi * 4.6 * t) > -0.35).astype(float); syl = lp(syl, 0.004)
    for fo, w in [(700, 1), (1150, 0.7), (2600, 0.4)]:
        mod = fo * (1 + 0.35 * np.sin(2 * np.pi * (2.1 + w) * t + w))
        X += np.sin(2 * np.pi * np.cumsum(mod) / SR) * w
    y = np.tanh(3 * saw * (0.6 + 0.4 * X)) * syl
    y = bp(y, 300 if tel else 120, 3200 if tel else 6000)
    return y / (np.abs(y).max() + 1e-9) * g * env(len(t), 0.02, 0.1)
put(fx, 474, shout(1.05, False, 0.32)); put(fx, 968, shout(1.75, True, 0.2))
# puñetazo en la mesa + objetos que saltan
put(fx, 549, thud(85, 0.6, 1.0)); put(fx, 551, bp(noise(0.25), 2000, 8000) * np.exp(-t_(0.25) * 18) * 0.25)
# parque: pájaros
for k in range(7):
    t = t_(0.12); f0 = 2800 + R.random() * 1400
    put(fx, 730 + k * 6.5 + R.random() * 3, np.sin(2 * np.pi * (f0 + 900 * np.sin(2 * np.pi * 18 * t)) * t) * np.sin(np.pi * t / 0.12) * 0.07)
# cuarenta llamadas: timbres lejanos
for k in range(9): put(fx, 782 + k * 8.5, bp(ring(0.35), 800, 3000), 0.18 + 0.03 * (k % 3))
# boli de noche
for k in range(26): put(fx, 1080 + k * 2.6, bp(noise(0.06), 1500, 6000) * np.sin(np.pi * t_(0.06) / 0.06) * 0.07)
# ambientes
def bed(f0, f1, kind):
    i, j = int(f0 / FPS * SR), int(f1 / FPS * SR); n = j - i
    if kind == 'office': x = lp(noise(n / SR), 0.02) * 0.6 + np.sin(2 * np.pi * 60 * np.arange(n) / SR) * 0.01
    elif kind == 'park': x = bp(noise(n / SR), 200, 1500) * 0.25
    else: x = lp(noise(n / SR), 0.01) * 0.35
    x *= env(n, 0.05, 0.05); amb[i:j] += x * 0.08
for s0, s1, k in [(0, 727, 'office'), (727, 777, 'park'), (777, 1077, 'office'), (1077, 1225, 'night')]: bed(s0, s1, k)
# música: marimba original, 104 bpm, en Re mayor; se va de noche
BPM = 104; beat = 60 / BPM
def mar(fr, d=0.5, g=0.1):
    t = t_(d); return (np.sin(2 * np.pi * fr * t) + 0.25 * np.sin(2 * np.pi * fr * 4 * t) * np.exp(-t * 30)) * np.exp(-t * 7) * g
mid = lambda m: 440 * 2 ** ((m - 69) / 12)
prog = [[62, 66, 69], [59, 62, 66], [55, 59, 62], [57, 61, 64]]
pat = [0, 2, 1, 2, 0, 2, 1, 2]
k = 0; tt = 0.0
while tt < 1077 / FPS - 0.3:
    ch = prog[(k // 8) % 4]; n = ch[pat[k % 8]] + (12 if k % 16 in (6, 14) else 0)
    put(mus, tt * FPS, mar(mid(n), 0.5, 0.08))
    if k % 8 == 0: put(mus, tt * FPS, mar(mid(ch[0] - 24), 1.0, 0.11))
    k += 1; tt += beat / 2
put(mus, 0, mar(mid(62), 0.5, 0.0))
fade = np.ones(N); i0, i1 = int(1060 / FPS * SR), int(1077 / FPS * SR); fade[i0:i1] = np.linspace(1, 0, i1 - i0); fade[i1:] = 0
mus *= fade
# voz
w = wave.open('out/voz.wav'); v = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(float) / 32768; vs = w.getframerate()
v = np.interp(np.arange(int(len(v) * SR / vs)) / SR, np.arange(len(v)) / vs, v)
voice = np.zeros(N); voice[: min(N, len(v))] = v[:N]
# la música baja mientras habla la voz
act = lp((np.abs(voice) > 0.02).astype(float), 0.0005); duck = 1 - 0.6 * np.clip(act * 3, 0, 1)
import sys
VOICE = 0.0 if '--sin-voz' in sys.argv else 1.0
mix = voice * VOICE + fx * 0.55 + amb + mus * duck * 0.6
mix = np.tanh(mix * 1.2) / 1.2
st = np.stack([mix, mix], 1)
w = wave.open('out/mezcla_sin_voz.wav' if VOICE == 0 else 'out/mezcla.wav', 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(st, -1, 1) * 32767).astype(np.int16).tobytes()); w.close()
print('ok', round(N / SR, 2))
