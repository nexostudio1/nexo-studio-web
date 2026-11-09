# Subtítulos blancos; las palabras clave se «seleccionan» con el ratón (recuadro azul que crece + puntero) -> out/subs.ass
import json, re
from PIL import ImageFont
T = json.load(open('tiempos2.json')); L = open('subs_trozos.txt').read().strip().split('\n')
FONT = ImageFont.truetype('/usr/share/fonts/opentype/inter/Inter-Black.otf', 79.3)  # calibrado contra libass a 96
SP = 3
def width(s): return FONT.getlength(s) + SP * len(s) if s else 0
KEYS = ['echar a la gente', 'sin despedirla', 'casi imposible', 'los jueces', 'Tanaka', '“kata-tataki”', 'golpecito', 'mirar el móvil', '“voluntariamente”',
        'buen trabajo', 'compañeros', 'el siguiente', 'come solo', 'expulsión', 'nada que hacer', 'se rinda', 'el móvil', 'pagando']
def ts(s): return f"{int(s//3600)}:{int(s%3600//60):02d}:{s%60:05.2f}"
ev = []
for seg, line in zip(T['segs'], L):
    cs = [c.strip() for c in line.split('|')]; t0, t1 = seg['t0'], seg['t1']
    wt = [len(c.replace(' ', '')) + 2 + (4 if re.search(r'[.:…]$', c) else 2 if c.endswith(',') else 0) for c in cs]
    tot = sum(wt); t = t0
    for c, w in zip(cs, wt):
        d = (t1 - t0) * w / tot; ev.append((t, t + d, c.replace('«', '“').replace('»', '”'))); t += d
hdr = """[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 2

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,Inter Black,96,&H00FFFFFF,&H00FFFFFF,&H00261724,&H80000000,1,0,0,0,100,100,3,0,1,8,3,5,0,0,0
Style: Box,Arial,20,&H00FF7B2F,&H00FF7B2F,&H00FF7B2F,&H00000000,0,0,0,0,100,100,0,0,1,0,0,7,0,0,0
Style: Ptr,Arial,20,&H00FFFFFF,&H00FFFFFF,&H00000000,&H64000000,0,0,0,0,100,100,0,0,1,3,2,7,0,0,0

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
rows = []
ARROW = 'm 0 0 l 0 44 l 11 34 l 19 52 l 27 48 l 19 31 l 33 31'
for a, b, c in ev:
    f = a * 30
    y = 1500
    K = min(1.0, 960 / width(c))   # si no cabe, letra más pequeña
    pop = rf'\fscx{86*K:.0f}\fscy{86*K:.0f}\t(0,80,\fscx{100*K:.0f}\fscy{100*K:.0f})'
    rows.append(f"Dialogue: 1,{ts(a)},{ts(b)},Cap,,0,0,0,,{{\\pos(540,{y}){pop}}}{c}")
    k = next((k for k in KEYS if k in c), None)
    if not k: continue
    W = width(c) * K; left = 540 - W / 2; i = c.index(k)
    x1 = left + width(c[:i]) * K - 10; x2 = left + (width(c[:i + len(k)]) - SP) * K + 10
    y1, y2 = y - 62 * K, y + 58 * K
    s0, s1 = 120, 120 + int(min(380, 22 * len(k)))   # ms: la selección se arrastra de izquierda a derecha
    box = f"m 0 0 l {x2 - x1:.0f} 0 l {x2 - x1:.0f} {y2 - y1:.0f} l 0 {y2 - y1:.0f}"
    rows.append(f"Dialogue: 0,{ts(a)},{ts(b)},Box,,0,0,0,,{{\\pos({x1:.0f},{y1:.0f})\\clip({x1:.0f},{y1:.0f},{x1 + 1:.0f},{y2:.0f})\\t({s0},{s1},\\clip({x1:.0f},{y1:.0f},{x2:.0f},{y2:.0f}))\\p1}}{box}")
    rows.append(f"Dialogue: 2,{ts(a)},{ts(b)},Ptr,,0,0,0,,{{\\move({x1:.0f},{y2 - 14:.0f},{x2:.0f},{y2 - 14:.0f},{s0},{s1})\\p1}}{ARROW}")
open('out/subs.ass', 'w').write(hdr + '\n'.join(rows) + '\n')
print(len(ev), 'trozos,', sum(1 for r in rows if ',Box,' in r), 'seleccionados')
