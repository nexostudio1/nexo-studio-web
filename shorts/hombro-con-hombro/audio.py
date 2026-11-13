# Música, ambiente y efectos sintetizados con numpy + mezcla a -14 LUFS.
import numpy as np, subprocess, wave, math
import render as R

SR = 48000; T = R.TOTAL; n = int(T * SR); t = np.arange(n) / SR
rnd = np.random.default_rng(5)
def put(buf, sig, at):
    i = int(at * SR)
    if i < 0: sig = sig[-i:]; i = 0
    j = min(len(buf), i + len(sig))
    if i < len(buf): buf[i:j] += sig[:j - i]
def lowpass(x, fc):
    a = math.exp(-2 * math.pi * fc / SR); y = np.zeros_like(x); s = 0.0
    for k in range(len(x)): s = (1 - a) * x[k] + a * s; y[k] = s
    return y
def gate(a, b, fade=.25):
    g = np.zeros(n); g[(t >= a) & (t < b)] = 1
    w = int(fade * SR); return np.convolve(g, np.ones(w) / w, mode='same')
def note(f, dur, vol, decay=1.1):
    x = np.arange(int(dur * SR)) / SR
    s = np.sin(2 * np.pi * f * x) + .35 * np.sin(4 * np.pi * f * x) * np.exp(-x * 6) + .1 * np.sin(6 * np.pi * f * x)
    return s * np.minimum(1, x / .01) * np.exp(-x / decay) * vol
def bed(chords, bpm, drums=True, pad=False):
    m = np.zeros(n); beat = 60 / bpm; tt = 0.0; bar = 0
    while tt < T:
        ch = chords[bar % len(chords)]
        for k, f in enumerate(ch): put(m, note(f, beat * 4, .06 if not pad else .05, 2.5 if pad else 1.1), tt + k * (.012 if not pad else .15))
        put(m, note(ch[0] / 2, beat * 4, .1, 2.0), tt)
        if drums:
            for b in range(4):
                x = np.arange(int(.18 * SR)) / SR
                if b % 2 == 0: put(m, np.sin(2 * np.pi * (60 + 80 * np.exp(-x * 30)) * x) * np.exp(-x * 18) * .3, tt + b * beat)
                else: put(m, rnd.normal(0, 1, len(x)) * np.exp(-x * 25) * .04, tt + b * beat)
        tt += beat * 4; bar += 1
    return lowpass(m, 3000)

c1, c2 = R.SC_CHANGE[1][0], R.SC_CHANGE[2][0]
sad = bed([[220.0, 261.6, 329.6], [174.6, 220.0, 261.6], [196.0, 246.9, 293.7], [164.8, 207.7, 246.9]], 70, drums=False, pad=True)
warm = bed([[261.6, 329.6, 392.0, 493.9], [220.0, 261.6, 329.6, 392.0], [174.6, 220.0, 261.6, 329.6], [196.0, 246.9, 293.7, 349.2]], 88)
music = sad * gate(-1, c1) + warm * gate(c2 + .3, T + 1)
# ambientes
room = lowpass(rnd.normal(0, 1, n), 350) * .02 * gate(-1, c1)
cafe = lowpass(rnd.normal(0, 1, n), 900) * .03 * gate(c1, c2) * (1 - .8 * np.array([R.interrogation(x) for x in t[::SR // 100]]).repeat(SR // 100)[:n].clip(0, 1) if True else 1)
water = lowpass(rnd.normal(0, 1, n), 600) * (.035 + .02 * np.sin(2 * np.pi * .3 * t)) * gate(c2, T + 1)
amb = room + cafe + water
sfx = np.zeros(n)
def whoosh(at, dur=.32, vol=.22):
    m = int(dur * SR); x = np.arange(m) / m; put(sfx, lowpass(rnd.normal(0, 1, m), 2500) * np.sin(np.pi * x) ** 2 * vol, at - dur * .6)
def impact(at, vol=.5):
    x = np.arange(int(.8 * SR)) / SR; s = np.sin(2 * np.pi * (48 + 60 * np.exp(-x * 12)) * x) * np.exp(-x * 4) * vol
    s[:int(.02 * SR)] += rnd.normal(0, 1, int(.02 * SR)) * .3 * vol; put(sfx, s, at)
def ding(at, f=1320, vol=.12):
    x = np.arange(int(.6 * SR)) / SR; put(sfx, (np.sin(2 * np.pi * f * x) + .4 * np.sin(2 * np.pi * f * 2.01 * x)) * np.exp(-x * 6) * vol, at)
def tick(at, vol=.08):
    x = np.arange(int(.03 * SR)) / SR; put(sfx, np.sin(2 * np.pi * 2500 * x) * np.exp(-x * 200) * vol, at)
def chirp(at):
    for k in range(3):
        x = np.arange(int(.08 * SR)) / SR; f = 3200 + 900 * np.sin(np.pi * x / .08)
        put(sfx, np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * x / .08) * .04, at + k * .11)
for c in R.CUTS[1:]: whoosh(c)
impact(0, .3); whoosh(.02, .25, .25)
ding(R.wt('noventa'), 990); ding(R.wt('veintiuno') + .2, 1180); impact(R.wt('quince'), .45)
for k in range(8): tick(R.le(3) + .1 + k * .5)        # silencio incómodo: reloj
impact(R.wt('interrogatorio') - .9, .5)                   # foco de interrogatorio
impact(R.wt('calvo'), .35)
for a in (R.ls(5) + 1.2, R.ls(6) + 2.0, R.ls(7) + 1.0, R.ls(7) + 4.0): chirp(a)
def wr(path, x):
    x = np.clip(x, -1, 1); w = wave.open(path, 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((x * 32767).astype(np.int16).tobytes()); w.close()
wr('tmp/musica.wav', music * .5); wr('tmp/sfx.wav', sfx); wr('tmp/amb.wav', amb)
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', 'voz.wav', '-i', 'tmp/musica.wav', '-i', 'tmp/sfx.wav', '-i', 'tmp/amb.wav',
    '-filter_complex',
    '[0:a]asplit=2[v][vk];[1:a]volume=0.6[m];[m][vk]sidechaincompress=threshold=0.03:ratio=6:attack=20:release=300[md];'
    '[2:a]volume=0.8[s];[v][md][s][3:a]amix=inputs=4:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[out]',
    '-map', '[out]', '-ar', '48000', '-ac', '2', 'tmp/mezcla.wav'], check=True)
print('ok')
