# Efectos y música originales sintetizados con numpy + mezcla con la voz -> out/mezcla.wav
import numpy as np, wave, json
SR = 44100; FPS = 30
T = json.load(open('tiempos.json')); DUR = 1364 / FPS
N = int(DUR * SR) + 1
fx = np.zeros(N); amb = np.zeros(N); mus = np.zeros(N)
R = np.random.default_rng(7)
t_ = lambda d: np.arange(int(d * SR)) / SR
def put_raw(buf, f, x, g=1.0):
    i = int(f / FPS * SR); j = min(N, i + len(x))
    if j > i: buf[i:j] += x[: j - i] * g
G0, GD = 769, 136
def put(buf, f, x, g=1.0): put_raw(buf, f if f < G0 else f + GD, x, g)
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


def click(g=1.0):
    t = t_(0.06); return (np.sin(2 * np.pi * 900 * t) * np.exp(-t * 90) + noise(0.06) * np.exp(-t * 160) * 0.5) * 0.5 * g
def thud(f0=70, d=0.45, g=1.0):
    t = t_(d); return (np.sin(2 * np.pi * f0 * t * (1 - 0.3 * t)) * np.exp(-t * 9) + lp(noise(d), 0.08) * np.exp(-t * 25) * 2) * g
def whoosh(d=0.45, g=0.25):
    n = noise(d); t = t_(d); e = np.sin(np.pi * t / d) ** 2
    return bp(n, 250, 2600) * e * g
def pop(f0=600, g=0.25):
    t = t_(0.12); return np.sin(2 * np.pi * f0 * (1 + 2 * t) * t) * np.exp(-t * 30) * g
def ding(f0=1320, g=0.22, d=0.9):
    t = t_(d); return (np.sin(2 * np.pi * f0 * t) + 0.5 * np.sin(2 * np.pi * f0 * 1.5 * t)) * np.exp(-t * 5) * g
def knock(f0=320, g=0.35):  # toc de nudillo / golpecito en el hombro
    t = t_(0.09); return (np.sin(2 * np.pi * f0 * t) * np.exp(-t * 60) + bp(noise(0.09), 400, 2500) * np.exp(-t * 90) * 0.6) * g
def kaching(g=0.3):
    t = t_(0.8); x = np.zeros(len(t))
    for k, fr in enumerate([2093, 2637, 3136, 4186]): x += np.sin(2 * np.pi * fr * t) * np.exp(-t * (5 + k)) * (1 - k * 0.15)
    i = int(0.06 * SR); x[:i] += bp(noise(0.06), 3000, 9000) * 0.5
    return x * g
# pasos: mismo camino que walkPath en anim.ts (cada tramo acelera y frena; un paso cada 0.475 m)
def step_frames(pts, stride=0.95, ke=0.75):
    import math
    out, dist, nxt = [], 0.0, 0.0
    for (fa, a), (fb, b) in zip(pts, pts[1:]):
        ln = math.hypot(b[0] - a[0], b[1] - a[1])
        for f in np.arange(fa, fb, 0.25):
            t = (f - fa) / (fb - fa); e = t - ke * math.sin(2 * math.pi * t) / (2 * math.pi)
            if ln > 0 and dist + ln * e >= nxt: out.append(f); nxt += stride / 2
        dist += ln
    return out
# cortes de plano
for f in [122, 185, 323, 400, 430, 527, 711, 825, 864, 1004, 1076]: put(fx, f - 6, whoosh(0.4, 0.2))
put_raw(fx, G0 - 6, whoosh(0.4, 0.2)); put(fx, 769 - 6, whoosh(0.4, 0.2))
# gancho: pasos de Tanaka y la oficina escondiéndose
for k in range(13): put(fx, 1 + k * 0.5 * 1.15 * 122 / 7.2, click(0.22) * 0.6)
for f in [20, 59, 98]: put(fx, f, pop(380, 0.22)); put(fx, f + 1, whoosh(0.2, 0.12))
# jefe: bocadillo + sello NULO
put(fx, 126, pop(700, 0.25)); put(fx, 158, thud(60, 0.7, 1.0)); put(fx, 158, bp(noise(0.15), 1500, 7000) * np.exp(-t_(0.15) * 25) * 0.4)
# juzgado: dos golpes de mazo y alivio
for f in [262, 274]: put(fx, f, knock(180, 0.9)); put(fx, f, thud(110, 0.3, 0.5))
put(fx, 268, ding(1568, 0.18)); put(fx, 272, ding(2093, 0.14))
# el jefe marca
DT = {'1': (697, 1209), '3': (697, 1477), '5': (770, 1336), '8': (852, 1336), '0': (941, 1336), '9': (852, 1477)}
for k, d in enumerate('35809'):
    t = t_(0.08); a, b = DT[d]; put(fx, 334 + k * 4, (np.sin(2 * np.pi * a * t) + np.sin(2 * np.pi * b * t)) * env(len(t), 0.003, 0.01) * 0.08)
# presentación de Tanaka: subida + golpe
t = t_(0.5); put(fx, 386, np.sin(2 * np.pi * (300 + 900 * t / 0.5) * t) * (t / 0.5) * 0.08); put(fx, 403, thud(55, 0.6, 0.7)); put(fx, 404, ding(988, 0.15))
# golpecitos en el hombro (toc toc) y sustos
for f in [492, 504, 600, 612, 838, 850, 1050, 1062]: put(fx, f, knock())
for f in [494, 602, 1052]: put(fx, f, pop(900, 0.22))
put(fx, 1052, thud(70, 0.5, 0.6))
# caja de cartón
put(fx, 660, bp(noise(0.35), 300, 3000) * env(int(0.35 * SR), 0.02, 0.2) * 0.3)
# pasos de vuelta
for f in step_frames([(527, (0.1, 1.15)), (572, (1.5, 1.15)), (590, (1.5, -0.42)), (624, (1.5, -0.42)), (642, (1.5, 1.15)), (711, (-1.6, 1.15))]): put(fx, f, click(0.18) * 0.5)
for f in step_frames([(660, (3.2, -0.2)), (672, (3.2, 0.9)), (711, (5.2, 1.15))]): put(fx, f + 1, click(0.16) * 0.35)
for f in step_frames([(1008, (0.4, -3.55)), (1040, (-1.72, -3.55))]): put(fx, f, click(0.18) * 0.4)
# monedas
put(fx, 716, kaching()); put(fx, 1180, kaching(0.34)); put(fx, 1186, kaching(0.2))
# comedor: grillos y matojo
for k in range(14):
    t = t_(0.18); put(fx, 772 + k * 4 + (k % 3), np.sin(2 * np.pi * 4300 * t) * (np.sin(2 * np.pi * 45 * t) > 0) * np.sin(np.pi * t / 0.18) * 0.05)
put(fx, 785, bp(noise(1.3), 200, 1600) * env(int(1.3 * SR), 0.2, 0.4) * 0.12)
# sala de expulsión: tic-tac, luego acelerado; bandera
f = 868.0
while f < 1004:
    put(fx, f, knock(1800 if int(f) % 2 else 1500, 0.12)); f += 15 if f < 944 else 3 if f < 986 else 15
put(fx, 984, whoosh(0.3, 0.25)); put(fx, 986, ding(660, 0.12))
f = 1080.0
while f < 1170: put(fx, f, knock(1800 if int(f) % 2 else 1500, 0.11)); f += 15
# el pasillo: tecleo que se va cortando, pasos lentos, silencio y «glup»
for k in range(40):
    f = G0 + k * 2.2 + (k % 3)
    if f > 820: break
    put_raw(fx, f, (noise(0.025) * np.exp(-t_(0.025) * 220)) * 0.1 * (1 - (f - G0) / 60) * (0.6 + (k % 4) * 0.15))
for f in step_frames([(G0, (-3.6, 1.2)), (868, (0.4, 1.2)), (884, (0.4, 1.2)), (G0 + GD, (1.7, 1.2))])[1:]: put_raw(fx, f, click(0.22) * 0.55)
t = t_(0.25); put_raw(fx, 872, np.sin(2 * np.pi * (260 - 180 * t / 0.25) * t) * np.exp(-t * 14) * 0.35)  # glup
put_raw(fx, 878, bp(noise(0.2), 400, 2000) * np.exp(-t_(0.2) * 20) * 0.12)  # alguien carraspea
# ambientes
def bed(f0, f1, kind):
    f0 = f0 if f0 < G0 else f0 + GD; f1 = f1 if f1 <= G0 else f1 + GD
    i, j = int(f0 / FPS * SR), int(f1 / FPS * SR); n = j - i
    x = lp(noise(n / SR), 0.02) * 0.6 if kind == 'office' else lp(noise(n / SR), 0.006) * 0.25
    x *= env(n, 0.05, 0.05); amb[i:j] += x * 0.08
for s0, s1, k in [(0, 769, 'office'), (825, 864, 'office'), (864, 1004, 'room'), (1004, 1076, 'office'), (1076, 1228, 'room')]: bed(s0, s1, k)
bed_i = int((G0 + GD) / FPS * SR); amb[int(G0 / FPS * SR):bed_i] += lp(noise(GD / FPS), 0.004)[: bed_i - int(G0 / FPS * SR)] * 0.012
# música: marimba con ritmo (original), 112 bpm; calla en el comedor y en la sala, vuelve al final
BPM = 112; beat = 60 / BPM
def mar(fr, d=0.45, g=0.1):
    t = t_(d); return (np.sin(2 * np.pi * fr * t) + 0.25 * np.sin(2 * np.pi * fr * 4 * t) * np.exp(-t * 30)) * np.exp(-t * 7) * g
mid = lambda m: 440 * 2 ** ((m - 69) / 12)
prog = [[60, 64, 67], [57, 60, 64], [62, 65, 69], [55, 59, 62]]
pat = [0, 2, 1, 2, 0, 1, 2, 1]
def music(f0, f1, gain=1.0):
    k = 0; tt = f0 / FPS
    while tt < f1 / FPS:
        ch = prog[(k // 8) % 4]; n = ch[pat[k % 8]] + (12 if k % 8 in (3, 7) else 0)
        put(mus, tt * FPS, mar(mid(n), 0.4, 0.075 * gain))
        if k % 4 == 0: put(mus, tt * FPS, mar(mid(ch[0] - 24), 0.7, 0.11 * gain))
        if k % 2 == 1: put(mus, tt * FPS, bp(noise(0.03), 5000, 12000) * np.exp(-t_(0.03) * 120) * 0.05 * gain)
        k += 1; tt += beat / 2
pass  # sin música: solo efectos
import sys
w = wave.open('out/voz.wav'); v = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(float) / 32768; vs = w.getframerate()
v = np.interp(np.arange(int(len(v) * SR / vs)) / SR, np.arange(len(v)) / vs, v)
voice = np.zeros(N); voice[: min(N, len(v))] = v[:N]
act = lp((np.abs(voice) > 0.02).astype(float), 0.0005); duck = 1 - 0.5 * np.clip(act * 3, 0, 1)
VOICE = 1.0 if '--con-voz' in sys.argv else 0.0   # por defecto SIN voz (la voz se graba aparte en ElevenLabs)
mix = voice * VOICE + fx * 0.6 + amb + mus * duck * 0.7
mix = np.tanh(mix * 1.2) / 1.2
st = np.stack([mix, mix], 1)
w = wave.open('out/mezcla_sin_voz.wav' if VOICE == 0 else 'out/mezcla.wav', 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(st, -1, 1) * 32767).astype(np.int16).tobytes()); w.close()
print('ok', round(N / SR, 2))
