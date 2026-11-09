"""Banda sonora sintetizada para el short de Pioz (sin samples externos).
Uso: python3 audio.py → build/audio.wav
"""
import json, os
import numpy as np
from scipy.signal import fftconvolve, butter, sosfilt
from scipy.io import wavfile

DIR = os.path.dirname(os.path.abspath(__file__))
TL = json.load(open(os.path.join(DIR, 'timeline.json')))
SR, DUR = 48000, TL['duration']
N = int(SR * DUR)
rng = np.random.default_rng(2016)
t = np.arange(N) / SR
music, sfx, dry = np.zeros((N, 2)), np.zeros((N, 2)), np.zeros((N, 2))

lp = lambda x, f, o=2: sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x, axis=0)
hp = lambda x, f, o=2: sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x, axis=0)
bp = lambda x, a, b, o=2: sosfilt(butter(o, [a, b], 'band', fs=SR, output='sos'), x, axis=0)
env = lambda pts: np.interp(t, *zip(*pts))
tt_ = lambda d: np.arange(int(d * SR)) / SR
NOTE = lambda n: 440 * 2 ** ((n - 69) / 12)


def add(bus, start, sig, gain=1.0, pan=0.0):
    i = int(start * SR)
    if i < 0: sig, i = sig[-i:], 0
    if i >= N: return
    sig = sig[: N - i]
    if sig.ndim == 1:
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        sig = np.stack([sig * l, sig * r], 1) * np.sqrt(2)
    bus[i: i + len(sig)] += sig * gain

# ---- dron en Re + aire ----
dr = sum(a * np.sin(2 * np.pi * f * t + rng.random() * 6) for f, a in [(36.7, .5), (73.4, .4), (73.9, .3), (110, .15), (146.8, .08)])
dr *= .65 + .35 * np.sin(2 * np.pi * .09 * t)
brown = np.cumsum(rng.standard_normal(N)); brown = lp(hp(brown, 20), 350); brown /= np.abs(brown).max()
lvl = env([(0, .7), (8, .6), (14.5, .8), (18.2, .9), (18.4, .25), (20.2, .6), (27, .8), (33, .7), (39.4, .8), (46, .7), (52.4, .9), (57.9, 1), (58.0, 0), (58.3, .5), (61.6, .5), (62, 0)])
d = (dr + brown * .5) * lvl
music += np.stack([d, d], 1) * .3

# ---- pulso constante que va creciendo (mantiene la tensión) ----
def pulse(f=73.4, dur=.22):
    x = tt_(dur); return np.sin(2 * np.pi * f * x) * np.exp(-x * 16) * np.minimum(1, x / .004)
def hat(dur=.05):
    x = tt_(dur); return hp(rng.standard_normal(len(x)), 7000) * np.exp(-x * 90)
beat = 60 / 112 / 2
k, tm = 0, 4.8
while tm < 58.0:
    if not (18.3 < tm < 20.3):
        inten = np.interp(tm, [4.8, 20, 39, 52, 58], [.5, .7, .85, 1, 1.1])
        add(music, tm, pulse(73.4 if (k // 16) % 2 == 0 else 69.3), .55 * inten * (1 if k % 4 == 0 else .55))
        if tm > 20.2 and k % 2 == 1: add(music, tm, hat(), .05 * inten, pan=.3)
        if tm > 39.4 and k % 4 == 2: add(music, tm, bp(rng.standard_normal(int(.12 * SR)), 1200, 4000) * np.exp(-tt_(.12) * 40), .09 * inten)
    tm += beat; k += 1

# ---- piano frío (Re menor) ----
def piano(freq, dur=3.5, vel=1.0):
    x = tt_(dur); s = np.zeros_like(x)
    for h in range(1, 8): s += (vel / h ** 1.3) * np.sin(2 * np.pi * freq * h * np.sqrt(1 + .0004 * h * h) * x) * np.exp(-x * (1.2 + h * .9))
    return s * np.minimum(1, x / .004) * .5
motif = [62, 69, 65, 64, 62, 70, 69, 61]
for i, tm in enumerate(np.arange(8.3, 57, beat * 8)):
    add(music, tm, piano(NOTE(motif[i % 8])), .42, pan=(i % 3 - 1) * .4)
    add(music, tm + beat * 3, piano(NOTE(motif[(i + 2) % 8] + 12), 2.5, .6), .22, pan=-(i % 3 - 1) * .4)

# ---- cuerdas trémolo que suben hacia la condena ----
def strings(freqs, a, b, rise, g):
    idx = slice(int(a * SR), int(b * SR)); x = t[idx] - a; s = np.zeros(len(x))
    for f in freqs:
        for det in (-.2, .15): s += np.sin(2 * np.pi * (f + det) * x + rng.random() * 6) + .3 * np.sin(4 * np.pi * (f + det) * x)
    out = np.zeros(N); out[idx] = s * (.6 + .4 * np.sin(2 * np.pi * 8 * x)) * np.clip(x / rise, 0, 1) ** 2 * g
    return np.stack([out, np.roll(out, 300)], 1)
music += strings([NOTE(74), NOTE(75), NOTE(81)], 12.5, 18.3, 5.5, .035)
music += strings([NOTE(74), NOTE(77), NOTE(82)], 44, 58.0, 12, .04)

# ---- efectos ----
def boom(dur=3.0, f0=46, g=1.0):
    x = tt_(dur); f = f0 * (1 + 1.5 * np.exp(-x * 9))
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 1.7) + lp(rng.standard_normal(len(x)), 250) * np.exp(-x * 6) * .6) * g
def hit():
    x = tt_(1.2); return boom(1.2, 60) * .8 + bp(rng.standard_normal(len(x)), 800, 6000) * np.exp(-x * 30) * .5
def ping():  # notificación genérica (dos notas), no imita ninguna app
    x = tt_(.35); return (np.sin(2 * np.pi * 1318 * x) * np.exp(-x * 22) + .7 * np.sin(2 * np.pi * 1760 * (x - .07).clip(0)) * np.exp(-(x - .07).clip(0) * 20) * (x > .07)) * .5
def buzz():
    x = tt_(.55); return np.sign(np.sin(2 * np.pi * 155 * x)) * (np.sin(2 * np.pi * 3.6 * x) > -.2) * np.exp(-x * 1.5) * .25 + lp(rng.standard_normal(len(x)), 500) * .08
def thud():
    x = tt_(.7); return np.sin(2 * np.pi * np.cumsum(58 * (1 + 1.5 * np.exp(-x * 30))) / SR) * np.exp(-x * 7)
def door():
    x = tt_(.5); return bp(rng.standard_normal(len(x)), 150, 1200) * np.exp(-x * 14) * .8 + np.sin(2 * np.pi * 90 * x) * np.exp(-x * 20)
def whoosh(dur=.9):
    x = tt_(dur); n = rng.standard_normal(len(x)); out = np.zeros_like(n)
    for k in range(0, len(n), 2048):
        fc = 300 + 3000 * k / len(n); seg = bp(n[k:k + 2560], fc * .7, fc * 1.3, 1); out[k:k + 2048] = seg[:len(out[k:k + 2048])]
    return out * np.sin(np.pi * x / dur) ** 2
def riser(dur=1.6):
    x = tt_(dur); return hp(rng.standard_normal(len(x)), 1500) * (x / dur) ** 3
def jet():
    x = tt_(3.2); return lp(rng.standard_normal(len(x)), 900) * np.sin(np.pi * x / 3.2) ** 2
def send():
    x = tt_(.4); return np.sin(2 * np.pi * np.cumsum(500 + 1800 * x / .4) / SR) * np.sin(np.pi * x / .4) ** 2 * .4
def siren():  # dos tonos lejanos, muy filtrados
    x = tt_(2.6); f = np.where((x * 1.6) % 1 < .5, 660, 880); return lp(np.sin(2 * np.pi * np.cumsum(f) / SR), 1500) * np.sin(np.pi * x / 2.6) * .5
def gavel():
    x = tt_(.8); return np.sin(2 * np.pi * np.cumsum(120 * (1 + 2 * np.exp(-x * 60))) / SR) * np.exp(-x * 12) + bp(rng.standard_normal(len(x)), 500, 3500) * np.exp(-x * 50) * .9

for e in TL['sfx']:
    k, s = e['type'], e['t']
    if k == 'boom': add(sfx, s, boom(), .55)
    elif k == 'hit': add(sfx, s, hit(), .6); add(sfx, s - .8, riser(.8), .04)
    elif k == 'ping': add(dry, s, ping(), .16, pan=rng.uniform(-.4, .4))
    elif k == 'buzz': add(dry, s, buzz(), .5)
    elif k == 'thud': add(sfx, s, thud(), .75)
    elif k == 'door': add(sfx, s, door(), .4)
    elif k == 'whoosh': add(sfx, s - .45, whoosh(), .1)
    elif k == 'riser': add(sfx, s, riser(), .06)
    elif k == 'jet': add(sfx, s, jet(), .22, pan=-.3)
    elif k == 'send': add(dry, s, send(), .3)
    elif k == 'siren': add(sfx, s, siren(), .1, pan=.4)
    elif k == 'gavel': add(sfx, s, gavel(), .95); add(sfx, s, boom(2.5, 40), .4)
    elif k == 'endhit': add(sfx, s, boom(3, 42), .7); add(music, s, piano(NOTE(61), 3, .9), .5); add(music, s, piano(NOTE(38), 3, .9), .45)

# ---- reverb y mezcla ----
x = tt_(2.6); e = np.exp(-x * 2.4)
IR = np.stack([lp(rng.standard_normal(len(x)) * e, 6000) for _ in range(2)], 1) / np.sqrt(np.sum(e ** 2))
win = music + sfx * .7 + dry * .3
wet = np.stack([fftconvolve(win[:, c], IR[:, c])[:N] for c in range(2)], 1)
mix = music * .8 + sfx + dry + wet * .4
mix[-int(.3 * SR):] *= np.linspace(1, 0, int(.3 * SR))[:, None] ** 2
mix = np.tanh(mix * 1.6) / 1.6
mix /= np.abs(mix).max() / .89
os.makedirs(os.path.join(DIR, 'build'), exist_ok=True)
wavfile.write(os.path.join(DIR, 'build', 'audio.wav'), SR, (mix * 32767).astype(np.int16))
print('Audio listo')
