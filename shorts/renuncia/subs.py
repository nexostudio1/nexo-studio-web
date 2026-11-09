# Subtítulos quemados: el guion en trozos de 1–3 palabras, sincronizados con tiempos.json -> out/subs.ass
import json, re
T = json.load(open('tiempos.json')); L = open('subs_trozos.txt').read().strip().split('\n')
def ts(s): return f"{int(s//3600)}:{int(s%3600//60):02d}:{s%60:05.2f}"
def chunks(line):
    return [c.strip() for c in line.split('|')]
def _old(line):
    w = line.split(); out = []; cur = []
    for x in w:
        cur.append(x)
        txt = ' '.join(cur)
        if len(cur) >= 3 or len(txt) > 13 or re.search(r'[.,:;…»]$', x): out.append(txt); cur = []
    if cur: out.append(' '.join(cur))
    return out
ev = []
for seg, line in zip(T['segs'], L):
    cs = chunks(line); t0, t1 = seg['t0'], seg['t1']
    wt = [len(c.replace(' ', '')) + 2 + (4 if re.search(r'[.:…]$', c) else 2 if c.endswith(',') else 0) for c in cs]
    tot = sum(wt); t = t0
    for c, w in zip(cs, wt):
        d = (t1 - t0) * w / tot; ev.append((t, t + d, c)); t += d
hdr = """[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 2

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,Inter Black,96,&H00FFFFFF,&H00FFFFFF,&H00261724,&H80000000,1,0,0,0,100,100,3,0,1,9,3,5,60,60,0

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
rows = []
for a, b, c in ev:
    f = a * 30
    y = 1745 if 268 <= f < 354 else 1470   # sobre la app del móvil, más abajo
    txt = c.replace('«', '“').replace('»', '”')
    hl = any(k in c.lower() for k in ['ya no', 'puedo más', 'veinte mil', 'cuarenta', 'nadie quiere', 'renuncie'])
    col = r'\c&H2F7AFF&' if hl else ''
    rows.append(f"Dialogue: 0,{ts(a)},{ts(b)},Cap,,0,0,0,,{{\\pos(540,{y})\\fscx80\\fscy80\\t(0,90,\\fscx100\\fscy100){col}}}{txt}")
open('out/subs.ass', 'w').write(hdr + '\n'.join(rows) + '\n')
print(len(rows), 'trozos'); print('\n'.join(f"{a:5.2f} {c}" for a, b, c in ev[:12]))
