# Música, ambiente y efectos sintetizados con numpy + mezcla final a -14 LUFS.
import numpy as np, subprocess, wave, math
import render as R

SR = 48000; T = R.TOTAL; n = int(T * SR)
t = np.arange(n) / SR
rnd = np.random.default_rng(3)

def env(length, a=.005, d=.3):
    x = np.arange(int(length * SR)) / SR
    return np.minimum(1, x / a) * np.exp(-x / d)
def put(buf, sig, at):
    i = int(at * SR)
    if i < 0: sig = sig[-i:]; i = 0
    j = min(len(buf), i + len(sig))
    if i < len(buf): buf[i:j] += sig[:j - i]
def lowpass(x, fc):
    a = math.exp(-2 * math.pi * fc / SR); y = np.zeros_like(x); s = 0.0
    for k in range(len(x)): s = (1 - a) * x[k] + a * s; y[k] = s
    return y

# --- música lo-fi suave (piano eléctrico + bajo + percusión ligera), 92 bpm
music = np.zeros(n); beat = 60 / 92
def note(f, dur, vol):
    x = np.arange(int(dur * SR)) / SR
    s = np.sin(2 * np.pi * f * x) + .35 * np.sin(4 * np.pi * f * x) * np.exp(-x * 6) + .1 * np.sin(6 * np.pi * f * x)
    return s * np.minimum(1, x / .01) * np.exp(-x / 1.1) * vol
chords = [[261.6, 329.6, 392.0, 493.9], [220.0, 261.6, 329.6, 392.0], [174.6, 220.0, 261.6, 329.6], [196.0, 246.9, 293.7, 349.2]]
bar = 0; tt = 0.0
while tt < T:
    ch = chords[bar % 4]
    for k, f in enumerate(ch): put(music, note(f, beat * 4, .07), tt + k * .012)
    put(music, note(ch[0] / 2, beat * 2, .12), tt); put(music, note(ch[0] / 2, beat * 2, .10), tt + beat * 2)
    for b in range(4):
        x = np.arange(int(.18 * SR)) / SR
        if b % 2 == 0: put(music, np.sin(2 * np.pi * (60 + 80 * np.exp(-x * 30)) * x) * np.exp(-x * 18) * .35, tt + b * beat)
        else: put(music, rnd.normal(0, 1, len(x)) * np.exp(-x * 25) * .05, tt + b * beat)
        put(music, rnd.normal(0, 1, int(.04 * SR)) * np.exp(-np.arange(int(.04 * SR)) / SR * 90) * .025, tt + b * beat + beat / 2)
    tt += beat * 4; bar += 1
music = lowpass(music, 3500)
# silencio dramático en la renuncia; vuelve con "Perfecto"
gate = np.ones(n)
a, b = R.line_start(5) - .15, R.wt('Perfecto') - .05
gate[(t > a) & (t < b)] = 0
gate = np.convolve(gate, np.ones(2400) / 2400, mode='same')
music *= gate

# --- ambiente de oficina
room = lowpass(rnd.normal(0, 1, n), 400) * .02

# --- efectos
sfx = np.zeros(n)
def whoosh(at, dur=.32, vol=.25):
    m = int(dur * SR); x = np.arange(m) / m
    s = lowpass(rnd.normal(0, 1, m), 2500) * np.sin(np.pi * x) ** 2 * vol
    put(sfx, s, at - dur * .6)
def impact(at, vol=.6):
    x = np.arange(int(.9 * SR)) / SR
    s = np.sin(2 * np.pi * (48 + 60 * np.exp(-x * 12)) * x) * np.exp(-x * 4) * vol
    s[:int(.02 * SR)] += rnd.normal(0, 1, int(.02 * SR)) * .3 * vol
    put(sfx, s, at)
for c in R.CUTS[1:]: whoosh(c)
impact(R.wt('tareas'), .55); impact(R.wt('renuncio') + .05, .7); impact(R.line_start(7), .8)
whoosh(.02, .25, .3); impact(.0, .35)
# riser de tensión antes de "tres"
a = R.wt('reemplazar') - .6; m = int(1.1 * SR); x = np.arange(m) / m
put(sfx, lowpass(rnd.normal(0, 1, m), 1800) * x ** 2 * .18, a)

def wr(path, x):
    x = np.clip(x, -1, 1); w = wave.open(path, 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((x * 32767).astype(np.int16).tobytes()); w.close()
wr('tmp/musica.wav', music * .5); wr('tmp/sfx.wav', sfx); wr('tmp/room.wav', room)
# mezcla: voz al frente, música baja ~8 dB bajo la voz (sidechain), efectos ~3 dB
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', 'voz.wav', '-i', 'tmp/musica.wav', '-i', 'tmp/sfx.wav', '-i', 'tmp/room.wav',
    '-filter_complex',
    '[0:a]asplit=2[v][vk];[1:a]volume=0.55[m];[m][vk]sidechaincompress=threshold=0.03:ratio=6:attack=20:release=300[md];'
    '[2:a]volume=0.75[s];[v][md][s][3:a]amix=inputs=4:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[out]',
    '-map', '[out]', '-ar', '48000', '-ac', '2', 'tmp/mezcla.wav'], check=True)
print('ok')
