"""Banda sonora sintetizada para «Caso 3:17» (sin samples externos).
Música tensa y discreta + efectos sincronizados con timeline.json.
Uso: python3 audio.py  → build/audio.wav
"""
import json, os
import numpy as np
from scipy.signal import fftconvolve, butter, sosfilt

DIR = os.path.dirname(os.path.abspath(__file__))
TL = json.load(open(os.path.join(DIR, 'timeline.json')))
SR = 48000
DUR = TL['duration']
N = int(SR * DUR)
rng = np.random.default_rng(317)
t = np.arange(N) / SR

music = np.zeros((N, 2))
sfx = np.zeros((N, 2))
dry = np.zeros((N, 2))  # efectos sin reverb


def lp(x, f, order=2):
    return sosfilt(butter(order, f, 'low', fs=SR, output='sos'), x, axis=0)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, 'high', fs=SR, output='sos'), x, axis=0)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], 'band', fs=SR, output='sos'), x, axis=0)


def env_points(points):
    """Envolvente lineal a partir de [(tiempo, nivel), ...]."""
    ts, vs = zip(*points)
    return np.interp(t, ts, vs)


def add(bus, start, sig, gain=1.0, pan=0.0):
    i = int(start * SR)
    if i < 0:
        sig, i = sig[-i:], 0
    if i >= N:
        return
    sig = sig[: N - i]
    if sig.ndim == 1:
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        sig = np.stack([sig * l, sig * r], 1) * np.sqrt(2)
    bus[i: i + len(sig)] += sig * gain


# ---------- 1. Dron grave (La) con aire de habitación ----------
drone = np.zeros(N)
for f, a in [(55, .5), (55.4, .35), (82.4, .22), (110, .12), (164.8, .05)]:
    drone += a * np.sin(2 * np.pi * f * t + rng.random() * 6)
drone *= .6 + .4 * np.sin(2 * np.pi * .07 * t)
brown = np.cumsum(rng.standard_normal(N)); brown = hp(brown, 20); brown /= np.abs(brown).max()
room = lp(brown, 400) * .5
lvl = env_points([(0, 0), (1.5, .55), (13.5, .6), (14.2, .35), (25, .45), (33, .55), (42, .5), (50, .55), (57, .6),
                  (63.15, .85), (63.25, 0), (64.4, 0), (65.5, .45), (68, .4), (71, .5), (74.2, .3), (75, 0)])
d = (drone * .9 + room) * lvl
music += np.stack([d, d], 1) * .35

# ---------- 2. Latido (escena de la nota) que se corta en «No fue el corazón» ----------
def thump(dur=.32, f0=62):
    tt = np.arange(int(dur * SR)) / SR
    f = f0 * (1 + 1.2 * np.exp(-tt * 30))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 14)

hb_t = 21.0
while hb_t < TL['texts'][3]['start'] - .2:
    g = .9 * min(1, (hb_t - 21) / 2 + .3)
    add(music, hb_t, thump(), g * .65)
    add(music, hb_t + .26, thump(f0=55), g * .45)
    hb_t += .95

# ---------- 3. Piano lejano (motivo en La menor) ----------
def piano(freq, dur=3.5, vel=1.0):
    tt = np.arange(int(dur * SR)) / SR
    s = np.zeros_like(tt)
    for k in range(1, 8):
        fk = freq * k * np.sqrt(1 + .0004 * k * k)
        s += (vel / k ** 1.3) * np.sin(2 * np.pi * fk * tt) * np.exp(-tt * (1.2 + k * .9))
    att = np.minimum(1, tt / .004)
    return s * att * .5

NOTE = lambda n: 440 * 2 ** ((n - 69) / 12)
motif = [57, 64, 72, 71, 64, 69, 67, 63]  # La-Mi-Do-Si-Mi-La-Sol-Re# (la última, inquietante)
pt, i = 14.6, 0
while pt < 56:
    n = motif[i % len(motif)]
    add(music, pt, piano(NOTE(n), vel=.9 if i % 4 == 0 else .6), .5, pan=(i % 3 - 1) * .4)
    if i % 4 == 0:
        add(music, pt, piano(NOTE(n - 24), dur=5, vel=.8), .45)
    pt += 1.6 if i % 2 == 0 else 2.2
    i += 1

# ---------- 4. Cuerdas en trémolo para la discusión (cluster que sube) ----------
def strings(freqs, start, end, rise):
    idx = slice(int(start * SR), int(end * SR))
    tt = t[idx] - start
    s = np.zeros(len(tt))
    for f in freqs:
        for det in (-.15, .12):
            s += np.sin(2 * np.pi * (f + det) * tt + rng.random() * 6) + .3 * np.sin(2 * np.pi * 2 * (f + det) * tt)
    trem = .6 + .4 * np.sin(2 * np.pi * 7.5 * tt)
    e = np.clip(tt / rise, 0, 1) ** 2
    out = np.zeros(N); out[idx] = s * trem * e
    return out

st = strings([NOTE(69), NOTE(70), NOTE(76)], 56.5, TL['events']['arguingStopAt317'], 6.0) * .05
music += np.stack([st, np.roll(st, 300)], 1)

# ---------- 5. Final: acorde cálido, sin resolver ----------
fin = np.zeros(N)
s0 = TL['events']['clockRestart']
idx = slice(int(s0 * SR), N)
tt = t[idx] - s0
for n, a in [(45, .5), (57, .35), (60, .25), (64, .25), (71, .12)]:
    fin[idx] += a * np.sin(2 * np.pi * NOTE(n) * tt) * (1 - np.exp(-tt * .8))
fin *= env_points([(0, 0), (s0, 0), (s0 + 2, 1), (73.5, 1), (75, 0)])
music += np.stack([fin, fin], 1) * .07

# ---------- 6. Efectos ----------
def click(f=3200, dur=.03, decay=180):
    tt = np.arange(int(dur * SR)) / SR
    n = rng.standard_normal(len(tt))
    return bp(n, f * .6, min(f * 1.6, 20000)) * np.exp(-tt * decay)

def tick(tock=False):
    c = click(4200 if not tock else 2900, .05, 120) * 1.4
    tt = np.arange(len(c)) / SR
    body = np.sin(2 * np.pi * (1900 if not tock else 1500) * tt) * np.exp(-tt * 160) * .5
    return c + body

def boom(dur=3.0, f0=48, gain=1.0):
    tt = np.arange(int(dur * SR)) / SR
    f = f0 * (1 + 1.5 * np.exp(-tt * 9))
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 1.6)
    s += lp(rng.standard_normal(len(tt)), 250) * np.exp(-tt * 6) * .6
    return s * gain

def whoosh(dur=1.4, up=True):
    tt = np.arange(int(dur * SR)) / SR
    n = rng.standard_normal(len(tt))
    out = np.zeros_like(n)
    seg = 2048
    for k in range(0, len(n), seg):
        p = k / len(n); p = p if up else 1 - p
        fc = 300 + 2500 * p
        out[k:k + seg] = bp(n[k:k + seg + 512], fc * .7, fc * 1.3, 1)[:len(out[k:k + seg])]
    e = np.sin(np.pi * np.clip(tt / dur, 0, 1)) ** 2
    return out * e

def typekey(strong=False):
    c = click(2600 + rng.random() * 900, .06, 90) * (1.3 if strong else 1)
    tt = np.arange(len(c)) / SR
    return c + np.sin(2 * np.pi * 180 * tt) * np.exp(-tt * 70) * .35

def stamp():
    tt = np.arange(int(.9 * SR)) / SR
    th = np.sin(2 * np.pi * np.cumsum(70 * (1 + 2 * np.exp(-tt * 40))) / SR) * np.exp(-tt * 9)
    slap = bp(rng.standard_normal(len(tt)), 600, 5000) * np.exp(-tt * 45)
    return th * 1.2 + slap * .9

def riser(dur=1.6):
    tt = np.arange(int(dur * SR)) / SR
    n = hp(rng.standard_normal(len(tt)), 1500)
    return n * (tt / dur) ** 3

for T in TL['texts']:
    s, kind = T['start'], T['sfx']
    if kind in ('boom', 'boomtype'):
        add(sfx, s, boom(gain=1.0 if kind == 'boom' else .8), .55)
        add(sfx, s - 1.6, riser(), .05)
    if kind in ('type', 'boomtype'):
        for i, ch in enumerate(T['text']):
            if ch != ' ':
                add(dry, s + i / 16, typekey(i == 0), .22, pan=(i / len(T['text']) - .5) * .5)
        add(dry, s + len(T['text']) / 16 + .12, click(1800, .12, 40), .25)  # tope del carro
    if kind == 'stamp':
        add(sfx, s, stamp(), .8)
        add(sfx, s, boom(2.5, 40), .35)
    if kind == 'end':
        add(sfx, s - 1.6, riser(), .07)
        add(sfx, s, boom(4.0, 42), .7)
        add(music, s, piano(NOTE(63), 4.5, .9), .5)
        add(music, s, piano(NOTE(45), 4.5, .9), .45)

# transiciones entre escenas
for sc in TL['scenes'][1:]:
    add(sfx, sc['start'] - .5, whoosh(), .09, pan=-.3)

# tic-tac del reloj de pared durante la discusión → se para a las 3:17
stop = TL['events']['arguingStopAt317']
for k in range(6, -1, -1):
    tm = stop - k
    add(dry, tm, tick(k % 2 == 1), .5 if k else .8)
add(sfx, stop, boom(3.5, 38), .45)

# el reloj vuelve a funcionar
rs = TL['events']['clockRestart']
add(dry, rs - .15, click(900, .2, 25), .35)  # se libera el muelle
k = 0
while rs + k < DUR - .1:
    add(dry, rs + k, tick(k % 2 == 1), .3 * min(1, .4 + k * .25))
    k += 1

# ---------- 7. Reverb y mezcla ----------
def ir(dur=2.8, decay=2.2):
    tt = np.arange(int(dur * SR)) / SR
    e = np.exp(-tt * decay)
    L = rng.standard_normal(len(tt)) * e
    R = rng.standard_normal(len(tt)) * e
    L, R = lp(L, 6000), lp(R, 6000)
    return np.stack([L, R], 1) / np.sqrt(np.sum(e ** 2))

IR = ir()
wet_in = music + sfx * .7 + dry * .25
wet = np.stack([fftconvolve(wet_in[:, c], IR[:, c])[:N] for c in range(2)], 1)
mix = music * .8 + sfx + dry + wet * .45
mix[: int(.02 * SR)] *= np.linspace(0, 1, int(.02 * SR))[:, None]
mix[-int(.4 * SR):] *= np.linspace(1, 0, int(.4 * SR))[:, None] ** 2
# compresión suave
mix = np.tanh(mix * 1.6) / 1.6
mix /= np.abs(mix).max() / .89

os.makedirs(os.path.join(DIR, 'build'), exist_ok=True)
from scipy.io import wavfile
wavfile.write(os.path.join(DIR, 'build', 'audio.wav'), SR, (mix * 32767).astype(np.int16))
print('Audio listo: build/audio.wav')
