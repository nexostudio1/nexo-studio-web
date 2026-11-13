# Short 2D "Hombro con hombro" (psicología masculina) — cairo, 1080x1920 @30fps.
# Uso: python3 render.py                 -> out/video_mudo.mp4
#      python3 render.py fotos 30,200,400 -> out/foto_XXXX.png
import json, math, os, sys, subprocess, unicodedata
from multiprocessing import Pool
import cairo

W, H, FPS = 1080, 1920, 30
HERE = os.path.dirname(os.path.abspath(__file__))
D = json.load(open(os.path.join(HERE, 'palabras.json')))
TOTAL = D['total']; N = int(math.ceil(TOTAL * FPS)); LINEAS = D['lineas']
FONT = 'DejaVu Sans'

def wt(texto, n=1, end=False):
    k = 0
    for L in LINEAS:
        for w in L['words']:
            if texto.lower() == w['word'].lower().strip('¿?¡!.,:'):
                k += 1
                if k == n: return w['end'] if end else w['start']
    raise KeyError(texto)
def ls(i): return LINEAS[i]['start']
def le(i): return LINEAS[i]['end']

# ---------------------------------------------------------------- utilidades
def smoother(t):
    t = max(0.0, min(1.0, t)); return t * t * t * (t * (t * 6 - 15) + 10)
def lerp(a, b, t): return a + (b - a) * t
def hexc(h, a=1.0):
    h = h.lstrip('#')
    if len(h) == 3: h = ''.join(c * 2 for c in h)
    return (int(h[0:2], 16) / 255, int(h[2:4], 16) / 255, int(h[4:6], 16) / 255, a)
def src(ctx, h, a=1.0): ctx.set_source_rgba(*hexc(h, a))
def ellipse(ctx, cx, cy, rx, ry):
    ctx.save(); ctx.translate(cx, cy); ctx.scale(max(rx, .01), max(ry, .01)); ctx.arc(0, 0, 1, 0, 2 * math.pi); ctx.restore()
def rrect(ctx, x, y, w, h, r):
    ctx.new_sub_path()
    ctx.arc(x + w - r, y + r, r, -math.pi / 2, 0); ctx.arc(x + w - r, y + h - r, r, 0, math.pi / 2)
    ctx.arc(x + r, y + h - r, r, math.pi / 2, math.pi); ctx.arc(x + r, y + r, r, math.pi, 1.5 * math.pi)
    ctx.close_path()
def ink(ctx, w=6):
    ctx.set_source_rgb(0.05, 0.03, 0.06); ctx.set_line_width(w); ctx.set_line_join(cairo.LINE_JOIN_ROUND)
    ctx.set_line_cap(cairo.LINE_CAP_ROUND); ctx.stroke()
def fill_ink(ctx, color, w=6, a=1.0):
    src(ctx, color, a); ctx.fill_preserve(); ink(ctx, w)
def rng(seed):
    x = seed
    def r():
        nonlocal x
        x = (x * 1103515245 + 12345) & 0x7fffffff
        return x / 0x7fffffff
    return r
def center_text(ctx, s, cx, y):
    e = ctx.text_extents(s); ctx.move_to(cx - e.width / 2 - e.x_bearing, y); ctx.show_text(s)

# ---------------------------------------------------------------- escenas
SC_CHANGE = [(0.0, 'sofa'), (ls(2) - .1, 'cafe'), (ls(5) - .05, 'lago')]
XF = 6  # cuadros de fundido al cambiar de lugar
def scene_at(t):
    s = SC_CHANGE[0][1]
    for a, n in SC_CHANGE:
        if t >= a: s = n
    return s

# ---------------------------------------------------------------- sincronización labial (español)
MOUTH = {'REST': (0.0, 0.5, 0, 0), 'MBP': (0.0, 0.45, 0, 0), 'FV': (0.12, 0.55, 0, 1),
         'A': (1.0, 0.7, 0, .4), 'E': (.55, 1, 0, .7), 'I': (.3, 1, 0, .9), 'O': (.7, .3, .8, 0),
         'U': (.3, .1, 1, 0), 'TDLN': (.3, .6, 0, .8), 'SZ': (.2, .8, 0, 1), 'CH': (.25, .3, .6, .8), 'R': (.35, .5, .2, .3)}
def word_visemes(raw):
    w = unicodedata.normalize('NFD', raw.lower())
    w = unicodedata.normalize('NFC', ''.join(c for c in w if unicodedata.category(c) != 'Mn' or c == '̃'))
    w = ''.join(c for c in w if c.isalpha())
    out, i = [], 0
    while i < len(w):
        c = w[i]; n = w[i + 1] if i + 1 < len(w) else ''
        if c == 'c' and n == 'h': out.append('CH'); i += 2; continue
        if c == 'l' and n == 'l': out.append('I'); i += 2; continue
        if c == 'q' and n == 'u': out.append('TDLN'); i += 2; continue
        if c in 'mbpv': out.append('MBP')
        elif c == 'f': out.append('FV')
        elif c == 'a': out.append('A')
        elif c == 'e': out.append('E')
        elif c in 'iy': out.append('I')
        elif c == 'o': out.append('O')
        elif c in 'uw': out.append('U')
        elif c == 'c' and n not in ('e', 'i'): out.append('TDLN')
        elif c in 'szcxj': out.append('SZ')
        elif c in 'tdlnñgk': out.append('TDLN')
        elif c == 'r': out.append('R')
        i += 1
    return [v for k, v in enumerate(out) if k == 0 or v != out[k - 1]]
def lip_track(quien):
    track = ['REST'] * N
    for L in LINEAS:
        if L['quien'] != quien: continue
        for w in L['words']:
            vs = word_visemes(w['word'])
            if not vs: continue
            wts = [2 if v in 'AEIOU' else 1 for v in vs]; tot = sum(wts)
            f0 = max(0, round((w['start'] - 0.03) * FPS)); f1 = min(N, round((w['end'] - 0.03) * FPS)); acc = 0
            for v, k in zip(vs, wts):
                a = f0 + round((f1 - f0) * acc / tot); acc += k; b = f0 + round((f1 - f0) * acc / tot)
                for f in range(a, min(N, max(b, a + 1))): track[f] = v
    out, cur = [], list(MOUTH['REST'])
    for f in range(N):
        tgt = MOUTH[track[f]]; cur = [lerp(c, t, 0.6) for c, t in zip(cur, tgt)]
        if track[f] == 'MBP': cur[0] = 0.0
        out.append(tuple(cur))
    return out
def speaking(quien):
    s = [0.0] * N
    for L in LINEAS:
        if L['quien'] != quien: continue
        for f in range(max(0, int((L['start'] - .05) * FPS)), min(N, int((L['end'] + .1) * FPS))): s[f] = 1.0
    out, v = [], 0.0
    for f in range(N): v = lerp(v, s[f], 0.15); out.append(v)
    return out
def keyed(keys, table=None, k=0.2):
    """Pista por cuadro a partir de llaves (t, valor) con suavizado exponencial."""
    keys = sorted(keys, key=lambda x: x[0]); vals = []
    get = (lambda v: table[v]) if table else (lambda v: v if isinstance(v, tuple) else (v,))
    cur = list(get(keys[0][1]))
    for f in range(N):
        t = f / FPS; v = keys[0][1]
        for kt, kv in keys:
            if t >= kt: v = kv
        cur = [lerp(c, x, k) for c, x in zip(cur, get(v))]; vals.append(tuple(cur))
    return vals

# ---------------------------------------------------------------- expresiones
EXPR = {  # lid, brow(+triste/-enojado), raise, smile, pupil, asym, mouth_open_extra
    'neutral': (.12, 0, 0, .1, 1, 0, 0), 'sad': (.42, .45, .02, -.45, 1, 0, 0), 'bored': (.5, .1, 0, -.15, .95, 0, 0),
    'hopeful': (0, .25, .07, .45, 1.05, 0, 0), 'happy': (.18, .1, .05, .9, 1, 0, 0), 'warm': (.25, .15, .03, .6, 1, 0, 0),
    'awkward': (.15, .35, .06, -.2, .85, .06, 0), 'nervous': (-.1, .5, .12, -.35, .7, 0, 0), 'relaxed': (.35, .05, 0, .35, 1, 0, 0),
    'curious': (0, .2, .06, .15, 1, .1, 0), 'shock': (-.35, .45, .16, -.3, .55, 0, .8), 'rant': (.1, .3, .05, -.1, 1, 0, 0)}
E = {
    'tono': keyed([(0, 'sad'), (wt('quince') - .2, 'bored'), (ls(2), 'awkward'), (ls(3) - .1, 'nervous'),
                   (ls(5) + .3, 'relaxed'), (ls(6) - .1, 'rant'), (wt('calvo') - .1, 'sad'), (ls(7) + .1, 'relaxed'),
                   (wt('amigo') - .2, 'happy')], EXPR, .22),
    'beto': keyed([(0, 'warm'), (ls(2), 'curious'), (ls(3) + .1, 'awkward'), (ls(5) + .3, 'relaxed'),
                   (ls(6) + .4, 'warm'), (wt('calvo') - .1, 'shock'), (le(6) + .25, 'warm'), (wt('amigo') - .2, 'happy')], EXPR, .22),
}
LIP = {'tono': lip_track('tono'), 'beto': lip_track('beto')}
SPK = {'tono': speaking('tono'), 'beto': speaking('beto')}
def blink_track(seed):
    r = rng(seed); out = [0.0] * N; f = int(r() * 30)
    while f < N:
        for k, v in enumerate((.5, 1, 1, .5)):
            if f + k < N: out[f + k] = v
        f += int((0.6 + r() * 1.8) * FPS)
    return out
BLINK = {'tono': blink_track(7), 'beto': blink_track(31)}
# hacia dónde gira la cara (-1 izq .. 1 der) y la mirada (x, y)
TURN = {
    'tono': keyed([(0, 0.0), (ls(2), .55), (ls(3) - .05, .2), (ls(4), -.15), (ls(5), 0.0), (ls(6) + .2, .15),
                   (wt('trabajo'), 0.0), (wt('calvo'), .3), (ls(7) + .4, .45), (wt('amigo'), 0.0)], k=.15),
    'beto': keyed([(0, 0.0), (ls(2), -.55), (ls(5), 0.0), (ls(6) + .3, -.25), (wt('trabajo'), 0.0), (wt('calvo') - .1, -.5),
                   (ls(7) + .4, -.45), (wt('amigo'), 0.0)], k=.15)}
LOOK = {
    'tono': keyed([(0, (0, .9)), (wt('quince') - .3, (.2, .3)), (ls(2), (.7, 0)), (ls(3) - .1, (-.8, .4)), (ls(3) + .5, (.6, 0)),
                   (ls(4), (-.6, .7)), (ls(5), (0, .5)), (ls(6) + .2, (0, .3)), (wt('calvo'), (.6, -.3)), (ls(7) + .4, (.7, 0)),
                   (wt('amigo'), (0, 0))], k=.35),
    'beto': keyed([(0, (0, 0)), (ls(2), (-.8, 0)), (ls(5), (0, .4)), (ls(6) + .3, (-.4, .2)), (wt('calvo') - .1, (-.8, 0)),
                   (ls(7) + .4, (-.7, 0)), (wt('amigo'), (0, 0))], k=.35)}

# ---------------------------------------------------------------- brazos: objetivo de la mano con resorte + IK de dos huesos
POSES = {  # (ox, oy): mano relativa al centro del personaje (ox se refleja por lado) y a la altura del hombro
    'down': (88, 270), 'phR': (-12, 175), 'phL': (12, 182), 'table': (40, 235), 'cup': (-5, 180), 'out': (190, 140),
    'shrug': (170, 40), 'rodR': (-28, 228), 'rodL': (56, 222), 'chin': (-30, 20), 'knee': (70, 250), 'head': (60, -60),
    'wave': (165, -40)}
def arm_track(keys, osc=None, k=170.0, c=17.0):
    keys = sorted(keys, key=lambda x: x[0])
    def tgt(t):
        cur = keys[0][1]
        for kt, kp in keys:
            if t >= kt: cur = kp
        return POSES[cur]
    v, vel, out = list(tgt(0)), [0.0, 0.0], []
    for f in range(N):
        t = f / FPS; tg = tgt(t)
        for _ in range(4):
            dt = 1 / FPS / 4
            for i in range(2):
                a = k * (tg[i] - v[i]) - c * vel[i]; vel[i] += a * dt; v[i] += vel[i] * dt
        o = osc[f] if osc else 0
        out.append((v[0] + 26 * o * math.sin(t * 8.5), v[1] + 22 * o * math.sin(t * 8.5 + 1.3)))
    return out
ARMS = {
    'tono': (arm_track([(0, 'phL'), (ls(2) - .1, 'table'), (ls(3) - .05, 'table'), (ls(5) - .05, 'rodL')]),
             arm_track([(0, 'phR'), (ls(2) - .1, 'cup'), (ls(3) + .2, 'chin'), (ls(5) - .05, 'rodR'), (ls(6) + .05, 'out'),
                        (wt('calvo') - .15, 'head'), (le(6) + .2, 'rodR')], SPK['tono'])),
    'beto': (arm_track([(0, 'table'), (ls(2) + .3, 'out'), (le(2) + .1, 'table'), (ls(5) - .05, 'rodR')], SPK['beto']),
             arm_track([(0, 'cup'), (ls(5) - .05, 'rodL')])),
}

# ---------------------------------------------------------------- personajes
BASE = {
    'tono': dict(r=118, sw=72, hw=56, skin='#FFF3E8', shirt='#7DBBEA', tie='#F2C230', hair='#6B4226', La=150, Lf=140),
    'beto': dict(r=124, sw=80, hw=62, skin='#F3CFAE', shirt='#5DBB7A', tie=None, hair='#2B1E1A', La=152, Lf=142),
}
# posición por escena: x, cadera (asiento) y tipo de piernas
PLACE = {
    'sofa': {'tono': (540, 1300, 'sit')},
    'cafe': {'tono': (300, 1310, 'sit'), 'beto': (785, 1310, 'sit')},
    'lago': {'tono': (395, 1335, 'dangle'), 'beto': (700, 1335, 'dangle')},
}
LIGHT = {  # sombreado de cabeza: desplazamiento de la zona iluminada, opacidad de sombra, luz de borde
    'sofa': dict(off=(0, .22), sh=.32, rim='#7FE3FF', rim_a=(40, 140), wall=(0, -40, 1.12, .20)),
    'cafe': dict(off=(-.1, -.2), sh=.20, rim='#FFF1C9', rim_a=(200, 250), wall=(45, -15, 1.0, .15)),
    'lago': dict(off=(0, .35), sh=.34, rim='#FFC46B', rim_a=(185, 355), wall=None),
}
SHADOW = '#4B2E78'

def char_geo(name, scene):
    b = dict(BASE[name]); x, hy, legs = PLACE[scene][name]
    b.update(x=x, hy=hy, sy=hy - 280, head_y=hy - 425, legs=legs); return b

def head_pose(name, f, C):
    t = f / FPS; lip = LIP[name][f]; spk = SPK[name][f]
    br = 3 * math.sin(t * 2 * math.pi / (2.4 if name == 'tono' else 3.0))
    dy = -br - 5 * lip[0] * spk
    ex = E[name][f]
    if ex[6] > .2: dy -= 8 * ex[6]
    tilt = 2.4 * math.sin(t * 2.1) * spk + 1.2 * math.sin(t * .8 + (1 if name == 'tono' else 3))
    if scene_at(t) == 'sofa': tilt += 6; dy += 10  # cabizbajo mirando el teléfono
    return C['x'] + 3 * math.sin(t * 1.1) * spk + TURN[name][f][0] * 8, C['head_y'] + dy, tilt, br

def arm_points(C, side, pose, br):
    sx = C['x'] + side * (C['sw'] - 8); sy = C['sy'] + 10 - br
    tx = C['x'] + side * pose[0]; ty = C['sy'] + pose[1]
    La, Lf = C['La'], C['Lf']; dx, dy = tx - sx, ty - sy; d = math.hypot(dx, dy)
    d = max(abs(La - Lf) + 1, min(d, (La + Lf) * .999)); a = math.atan2(dy, dx)
    B = math.acos(max(-1, min(1, (La * La + d * d - Lf * Lf) / (2 * La * d))))
    best = None
    for sgn in (1, -1):
        ex, ey = sx + La * math.cos(a + sgn * B), sy + La * math.sin(a + sgn * B)
        score = side * (ex - C['x']) + .3 * ey
        if best is None or score > best[0]: best = (score, ex, ey)
    ex, ey = best[1], best[2]
    hx, hy = ex + Lf * math.cos(math.atan2(ty - ey, tx - ex)), ey + Lf * math.sin(math.atan2(ty - ey, tx - ex))
    return (sx, sy), (ex, ey), (hx, hy)

def torso_path(ctx, C, br):
    x, sy, hy = C['x'], C['sy'] - br, C['hy']
    ctx.move_to(x - C['sw'], sy + 8); ctx.curve_to(x - C['sw'] + 4, sy - 4, x - C['sw'] + 20, sy - 6, x - C['sw'] + 30, sy - 6)
    ctx.line_to(x + C['sw'] - 30, sy - 6); ctx.curve_to(x + C['sw'] - 20, sy - 6, x + C['sw'] - 4, sy - 4, x + C['sw'], sy + 8)
    ctx.line_to(x + C['hw'], hy); ctx.line_to(x - C['hw'], hy); ctx.close_path()

def draw_head(ctx, name, f, C, scene, silhouette=False):
    r = C['r']; hx, hy, tilt, br = head_pose(name, f, C); L = LIGHT[scene]
    lid, brow, raise_, smile, pup, asym, mopen = E[name][f]
    lid = max(lid, BLINK[name][f]); turn = TURN[name][f][0]; lx, ly = LOOK[name][f]
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(math.radians(tilt))
    if silhouette:
        ctx.arc(0, 0, r * 1.06, 0, 2 * math.pi); ctx.fill(); ctx.restore(); return
    fx = turn * r * .2  # desplazamiento de la cara al girar (vista 3/4)
    # cabeza + sombreado de dos tonos según la luz de la escena
    ctx.arc(0, 0, r, 0, 2 * math.pi); src(ctx, C['skin']); ctx.fill_preserve(); ctx.save(); ctx.clip()
    src(ctx, SHADOW, L['sh']); ctx.paint()
    ctx.arc(L['off'][0] * r + fx * .3, L['off'][1] * r, r * .98, 0, 2 * math.pi); src(ctx, C['skin']); ctx.fill()
    if name == 'beto':  # barba corta
        ctx.arc(fx * .5, r * .05, r * 1.0, math.radians(20), math.radians(160)); ctx.arc_negative(fx * .5, r * .1, r * .62, math.radians(150), math.radians(30))
        ctx.close_path(); src(ctx, '#3A2A22', .55); ctx.fill()
    ctx.restore()
    ctx.arc(0, 0, r, 0, 2 * math.pi); ink(ctx, 7)
    ctx.arc(0, 0, r - 9, math.radians(L['rim_a'][0]), math.radians(L['rim_a'][1])); src(ctx, L['rim'], .9); ctx.set_line_width(6); ctx.stroke()
    # pelo
    if name == 'tono':
        ctx.move_to(-r * .98, -r * .2)
        for k in range(10):
            a = math.pi + math.pi * k / 9; rr = r * (1.08 if k % 2 else 1.0)
            ctx.line_to(rr * math.cos(a) * 1.02, rr * math.sin(a) - (6 if k % 2 else 0))
        ctx.line_to(r * .98, -r * .2)
        ctx.curve_to(r * .6, -r * .55, r * .3 + fx, -r * .35, r * .05 + fx, -r * .58)
        ctx.curve_to(-r * .2 + fx, -r * .4, -r * .55, -r * .62, -r * .98, -r * .2); ctx.close_path(); fill_ink(ctx, C['hair'], 6)
    else:  # rizos
        for k in range(11):
            a = math.pi * (1.02 + .96 * k / 10); rr = r * .93
            ctx.arc(rr * math.cos(a), rr * math.sin(a) - 4, r * .2, 0, 2 * math.pi); fill_ink(ctx, C['hair'], 5)
        ctx.arc(0, -r * .55, r * .55, math.pi, 2 * math.pi); ctx.close_path(); src(ctx, C['hair']); ctx.fill()
        for k in range(11):
            a = math.pi * (1.02 + .96 * k / 10); rr = r * .93
            ctx.arc(rr * math.cos(a), rr * math.sin(a) - 4, r * .2, 0, 2 * math.pi); src(ctx, C['hair']); ctx.fill()
    # ojos (el lejano se estrecha al girar)
    big = 1 + max(0, -lid) * .5
    for s in (-1, 1):
        squeeze = 1 - max(0, -s * turn) * .35
        cx, cy = s * r * .33 * (1 - abs(turn) * .15) + fx, -r * .05; rx, ry = r * .19 * big * squeeze, r * .25 * big
        ellipse(ctx, cx, cy, rx, ry); src(ctx, '#FFFFFF'); ctx.fill()
        ctx.save(); ellipse(ctx, cx, cy, rx, ry); ctx.clip()
        px, py = cx + lx * rx * .55, cy + ly * ry * .45 + 4
        ellipse(ctx, px, py, r * .11 * pup * squeeze, r * .14 * pup); src(ctx, '#111111'); ctx.fill()
        ctx.arc(px - r * .04, py - r * .04, r * .035, 0, 6.3); src(ctx, '#FFFFFF'); ctx.fill()
        if lid > 0:
            lyy = cy - ry + 2 * ry * min(1, lid)
            ctx.rectangle(cx - rx - 2, cy - ry - 2, 2 * rx + 4, lyy - (cy - ry) + 2); src(ctx, C['skin']); ctx.fill()
            ctx.move_to(cx - rx, lyy); ctx.line_to(cx + rx, lyy); ink(ctx, 6)
        ctx.restore(); ellipse(ctx, cx, cy, rx, ry); ink(ctx, 5)
        yb = -r * .43 - raise_ * r - (asym * r if s == 1 else 0) - max(0, -lid) * r * .1
        yi = yb - brow * r * .16; yo = yb + brow * r * .06
        ctx.move_to(cx - s * r * .2, yi); ctx.line_to(cx + s * r * .2 * squeeze, yo); ink(ctx, 10)
    # gota de sudor (incomodidad)
    if lid < .2 and brow > .3:
        k = (f % 40) / 40
        ctx.move_to(r * .78, -r * .5 + k * 40); ctx.curve_to(r * .7, -r * .32 + k * 40, r * .86, -r * .32 + k * 40, r * .78, -r * .5 + k * 40)
        ctx.arc(r * .78, -r * .36 + k * 40, r * .07, 0, math.pi); src(ctx, '#7FD0FF'); ctx.fill_preserve(); ink(ctx, 4)
    # boca
    o, wd, rd, th = LIP[name][f]
    o = o + mopen * (1 - SPK[name][f]); rd = max(rd, .55 * mopen * (1 - SPK[name][f]))
    mw = r * (.15 + .2 * wd) * (1 - .4 * rd) * (1 - abs(turn) * .15); mh = r * (.02 + .3 * o)
    my = r * .48; corner = -smile * r * .07; sk = asym * r * .4; mx = fx * 1.1
    if o < .06:
        ctx.move_to(mx - mw, my + corner + sk); ctx.curve_to(mx - mw * .4, my + smile * r * .1, mx + mw * .4, my + smile * r * .1, mx + mw, my + corner - sk); ink(ctx, 6)
    else:
        def mpath():
            ctx.move_to(mx - mw, my + corner + sk)
            ctx.curve_to(mx - mw * .5, my - mh * .45, mx + mw * .5, my - mh * .45, mx + mw, my + corner - sk)
            ctx.curve_to(mx + mw * .6, my + mh * 1.3, mx - mw * .6, my + mh * 1.3, mx - mw, my + corner + sk); ctx.close_path()
        mpath(); src(ctx, '#4A1525'); ctx.fill(); ctx.save(); mpath(); ctx.clip()
        if th > .2: ctx.rectangle(mx - mw, my - mh, 2 * mw, mh * (.35 + .25 * th)); src(ctx, '#FFFFFF'); ctx.fill()
        ellipse(ctx, mx, my + mh * .95, mw * .55, mh * .4); src(ctx, '#E0607A'); ctx.fill()
        ctx.restore(); mpath(); ink(ctx, 6)
    ctx.restore()

def draw_body(ctx, name, f, C, scene, silhouette=False):
    t = f / FPS; hx, hy, tilt, br = head_pose(name, f, C)
    def stick(pts, w=10):
        ctx.move_to(*pts[0])
        for p in pts[1:]: ctx.line_to(*p)
        if silhouette: ctx.set_line_width(w + 4); ctx.set_line_cap(cairo.LINE_CAP_ROUND); ctx.stroke()
        else: ink(ctx, w)
    def shoe(x, y):
        ellipse(ctx, x, y, 30, 14)
        if silhouette: ctx.fill()
        else: fill_ink(ctx, '#1B1B22', 4)
    x, hyp = C['x'], C['hy']
    if C['legs'] == 'sit':
        for s in (-1, 1):
            kx, ky = x + s * 48, hyp + 30; fy = hyp + 250
            stick([(x + s * 22, hyp - 4), (kx, ky), (kx + s * 4, fy)], 11); shoe(kx + s * 18, fy + 6)
    elif C['legs'] == 'dangle':  # piernas colgando del muelle, balanceándose
        for s in (-1, 1):
            sw = 16 * math.sin(t * 2.2 + (0 if s < 0 else 2.1) + (0 if name == 'tono' else 1.3))
            stick([(x + s * 24, hyp - 4), (x + s * 34, hyp + 30), (x + s * 34 + sw, hyp + 255)], 11); shoe(x + s * 46 + sw, hyp + 262)
    stick([(x, C['sy'] - 10), (hx, hy + C['r'] * .9)], 10)
    torso_path(ctx, C, br)
    if silhouette: ctx.fill()
    else:
        src(ctx, C['shirt']); ctx.fill_preserve(); ctx.save(); ctx.clip()
        ellipse(ctx, hx + 15, C['sy'] - 5, C['r'] * .75, 42); src(ctx, SHADOW, .28); ctx.fill()   # sombra de la cabeza sobre el pecho
        side = 1 if scene != 'lago' else 0
        if side: ctx.rectangle(x + C['sw'] * .35, C['sy'] - 40, 200, 600); src(ctx, SHADOW, .22); ctx.fill()
        else: ctx.rectangle(x - 200, C['sy'] - 40, 400, 600); src(ctx, SHADOW, .25); ctx.fill()   # contraluz
        for k in range(3):  # pliegues de la ropa
            yy = C['sy'] + 80 + k * 60; ctx.move_to(x - C['sw'] * .6, yy); ctx.curve_to(x - 20, yy + 10, x + 20, yy - 8, x + C['sw'] * .5, yy + 6)
            src(ctx, SHADOW, .12); ctx.set_line_width(5); ctx.stroke()
        y0 = C['sy'] + 4
        if C['tie']:
            tsw = 6 * math.sin(t * 2.0 - .6) * SPK[name][f]
            ctx.move_to(x - 13, y0); ctx.line_to(x + 13, y0); ctx.line_to(x + 8, y0 + 26); ctx.line_to(x - 8, y0 + 26); ctx.close_path(); fill_ink(ctx, C['tie'], 4)
            ctx.move_to(x - 8, y0 + 26); ctx.line_to(x + 8, y0 + 26); ctx.line_to(x + 20 + tsw, y0 + 175); ctx.line_to(x + tsw, y0 + 205); ctx.line_to(x - 20 + tsw, y0 + 175); ctx.close_path(); fill_ink(ctx, C['tie'], 4)
        else:  # camiseta con cuello redondo y bolsillo
            ctx.arc(x, y0 - 8, 36, 0, math.pi); ink(ctx, 5)
            rrect(ctx, x + 18, y0 + 70, 40, 44, 4); src(ctx, '#4AA067'); ctx.fill_preserve(); ink(ctx, 4)
        if C['tie']:
            for s in (-1, 1):
                ctx.move_to(x + s * 6, y0 - 8); ctx.line_to(x + s * 40, y0 - 8); ctx.line_to(x + s * 18, y0 + 30); ctx.close_path(); fill_ink(ctx, '#FFFFFF', 4)
        ctx.move_to(x - C['hw'], C['hy'] - 18); ctx.line_to(x + C['hw'], C['hy'] - 18); ink(ctx, 7)
        ctx.restore(); torso_path(ctx, C, br); ink(ctx, 7)
    L_, R_ = ARMS[name][0][f], ARMS[name][1][f]
    hands = {}
    for s, pose in ((-1, L_), (1, R_)):
        S, Ep, Hh = arm_points(C, s, pose, br); stick([S, Ep, Hh], 10); hands[s] = Hh
    # utilería en las manos
    if not silhouette: draw_props(ctx, name, f, C, scene, hands)
    for s in (-1, 1):
        ctx.arc(hands[s][0], hands[s][1], 15, 0, 2 * math.pi)
        if silhouette: ctx.fill()
        else: fill_ink(ctx, C['skin'], 5)

def draw_props(ctx, name, f, C, scene, hands):
    t = f / FPS
    if scene == 'sofa' and name == 'tono':  # teléfono con brillo frío
        px, py = (hands[-1][0] + hands[1][0]) / 2, (hands[-1][1] + hands[1][1]) / 2 - 12
        rrect(ctx, px - 30, py - 50, 60, 100, 10); fill_ink(ctx, '#1E2230', 5)
        rrect(ctx, px - 23, py - 42, 46, 80, 6); src(ctx, '#8FE8FF'); ctx.fill()
        ctx.save(); ctx.set_operator(cairo.OPERATOR_ADD)
        g = cairo.RadialGradient(px, py - 60, 10, px, py - 120, 330); g.add_color_stop_rgba(0, .35, .75, 1, .35); g.add_color_stop_rgba(1, .35, .75, 1, 0)
        ctx.set_source(g); ctx.arc(px, py - 120, 330, 0, 6.3); ctx.fill(); ctx.restore()
    if scene == 'lago':  # caña de pescar con hilo y corcho
        s = -1 if name == 'tono' else 1
        hx, hy = hands[-1] if name == 'tono' else hands[1]
        bend = 10 * math.sin(t * 1.7 + (0 if s < 0 else 1))
        tx, ty = hx + s * 330, hy - 470 + bend
        ctx.move_to(hx - s * 40, hy + 50); ctx.curve_to(hx + s * 120, hy - 200, tx - s * 60, ty + 40, tx, ty); ink(ctx, 9)
        ctx.move_to(hx - s * 40, hy + 50); ctx.curve_to(hx + s * 120, hy - 200, tx - s * 60, ty + 40, tx, ty)
        src(ctx, '#8A5A36'); ctx.set_line_width(5); ctx.stroke()
        bx, by = tx + s * 40, 1700 + 6 * math.sin(t * 2.4 + s)
        ctx.move_to(tx, ty); ctx.curve_to(tx + s * 30, ty + 300, bx, by - 300, bx, by - 14); src(ctx, '#FFFFFF', .85); ctx.set_line_width(2.5); ctx.stroke()
        ellipse(ctx, bx, by, 14, 18); fill_ink(ctx, '#E8463A', 4); ctx.rectangle(bx - 14, by, 28, 4); src(ctx, '#FFFFFF'); ctx.fill()
        for k in range(2):  # ondas del corcho
            rr = ((t * 30 + k * 25) % 50); ellipse(ctx, bx, by + 16, 20 + rr * 1.4, 5 + rr * .3)
            src(ctx, '#FFFFFF', .5 * (1 - rr / 50)); ctx.set_line_width(3); ctx.stroke()
    if scene == 'cafe' and ARMS[name][1][f][1] < 200 and ARMS[name][1][f][0] < 30:  # taza en la mano
        hx, hy = hands[1]
        rrect(ctx, hx - 22, hy - 46, 44, 52, 7); fill_ink(ctx, '#FFFFFF', 4)

def draw_character(ctx, name, f, scene):
    C = char_geo(name, scene); L = LIGHT[scene]
    if L['wall']:  # sombra proyectada en la pared detrás del personaje
        dx, dy, sc, a = L['wall']
        ctx.save(); ctx.rectangle(-600, -400, 2400, WALL_BOTTOM[scene] + 400); ctx.clip()
        ctx.translate(C['x'] + dx, C['hy'] + dy); ctx.scale(sc, sc); ctx.translate(-C['x'], -C['hy'])
        ctx.push_group(); src(ctx, '#2A1850'); draw_body(ctx, name, f, C, scene, True); draw_head(ctx, name, f, C, scene, True)
        ctx.pop_group_to_source(); ctx.paint_with_alpha(a); ctx.restore()
    # sombra de contacto
    if C['legs'] == 'sit': ellipse(ctx, C['x'], C['hy'] + 262, 120, 22); src(ctx, '#1E1438', .40); ctx.fill()
    else: ellipse(ctx, C['x'], C['hy'] + 6, 110, 18); src(ctx, '#2A1408', .45); ctx.fill()
    draw_body(ctx, name, f, C, scene)
    draw_head(ctx, name, f, C, scene)

# ---------------------------------------------------------------- escenarios
WALL_BOTTOM = {'sofa': 1330, 'cafe': 1300, 'lago': 0}

def par(ctx, cam, k, fn):
    ctx.save(); ctx.translate((cam[0] - 540) * (1 - k), (cam[1] - 1000) * (1 - k)); fn(); ctx.restore()

def scene_sofa(ctx, cam, t, f, front=False):
    if front:
        # cojín del asiento por delante de la cadera + brazos del sofá
        rrect(ctx, 250, 1285, 580, 70, 26); fill_ink(ctx, '#46508A', 7)
        rrect(ctx, 250, 1285, 580, 70, 26); ctx.save(); ctx.clip(); ctx.rectangle(250, 1325, 580, 40); src(ctx, SHADOW, .3); ctx.fill(); ctx.restore()
        for x in (175, 815):
            rrect(ctx, x, 1150, 90, 260, 36); fill_ink(ctx, '#3D467C', 7)
        ellipse(ctx, 870, 1630, 130, 16); src(ctx, '#0E0A20', .45); ctx.fill()  # caja de pizza vacía
        ctx.move_to(760, 1600); ctx.line_to(980, 1600); ctx.line_to(960, 1640); ctx.line_to(780, 1640); ctx.close_path(); fill_ink(ctx, '#D9B27C', 5)
        ctx.move_to(770, 1600); ctx.line_to(800, 1520); ctx.line_to(990, 1520); ctx.line_to(980, 1600); ctx.close_path(); fill_ink(ctx, '#C9A06A', 5)
        return
    g = cairo.LinearGradient(0, -200, 0, 1330); g.add_color_stop_rgb(0, .13, .16, .32); g.add_color_stop_rgb(1, .20, .24, .44)
    ctx.rectangle(-600, -400, 2400, 1730); ctx.set_source(g); ctx.fill()
    # ventana nocturna con luna y ciudad (parallax)
    x0, y0, x1, y1 = 600, 260, 1000, 780
    ctx.save(); ctx.rectangle(x0, y0, x1 - x0, y1 - y0); ctx.clip()
    g = cairo.LinearGradient(0, y0, 0, y1); g.add_color_stop_rgb(0, .05, .07, .2); g.add_color_stop_rgb(1, .2, .2, .45); ctx.set_source(g); ctx.paint()
    def moon(): ctx.arc(900, 360, 46, 0, 6.3); src(ctx, '#FFF6D6'); ctx.fill(); ctx.arc(918, 348, 40, 0, 6.3); src(ctx, '#141A3A', .0); ctx.fill()
    def city():
        r = rng(5); x = 560
        while x < 1060:
            w = 50 + r() * 60; h = 100 + r() * 240; top = y1 - h
            ctx.rectangle(x, top, w, h + 10); src(ctx, '#232A55'); ctx.fill()
            src(ctx, '#FFD27A', .9)
            for wy in range(int(top + 14), int(y1), 26):
                for wx in range(int(x + 8), int(x + w - 10), 20):
                    if r() > .7: ctx.rectangle(wx, wy, 8, 12); ctx.fill()
            x += w + 8
    par(ctx, cam, .2, moon); par(ctx, cam, .5, city); ctx.restore()
    ctx.rectangle(x0, y0, x1 - x0, y1 - y0); src(ctx, '#C8CCE0'); ctx.set_line_width(18); ctx.stroke()
    ctx.rectangle(x0 - 9, y0 - 9, x1 - x0 + 18, y1 - y0 + 18); ink(ctx, 5)
    ctx.move_to((x0 + x1) / 2, y0); ctx.line_to((x0 + x1) / 2, y1); src(ctx, '#C8CCE0'); ctx.set_line_width(12); ctx.stroke()
    # luz de luna en la pared
    ctx.save(); ctx.set_operator(cairo.OPERATOR_ADD)
    ctx.move_to(600, 780); ctx.line_to(1000, 780); ctx.line_to(820, 1330); ctx.line_to(330, 1330); ctx.close_path(); src(ctx, '#6C8CFF', .08); ctx.fill(); ctx.restore()
    # cuadro torcido
    ctx.save(); ctx.translate(250, 520); ctx.rotate(-.08); rrect(ctx, -110, -80, 220, 160, 6); fill_ink(ctx, '#2A2F55', 6)
    ctx.rectangle(-90, -60, 180, 120); src(ctx, '#3E4A80'); ctx.fill()
    ctx.move_to(-90, 40); ctx.line_to(-30, -20); ctx.line_to(20, 30); ctx.line_to(50, 0); ctx.line_to(90, 40); ctx.close_path(); src(ctx, '#56649E'); ctx.fill(); ctx.restore()
    # suelo
    g = cairo.LinearGradient(0, 1330, 0, 2300); g.add_color_stop_rgb(0, .22, .2, .36); g.add_color_stop_rgb(1, .12, .1, .22)
    ctx.rectangle(-600, 1330, 2400, 1000); ctx.set_source(g); ctx.fill(); ctx.move_to(-600, 1330); ctx.line_to(1800, 1330); ink(ctx, 6)
    ellipse(ctx, 540, 1640, 460, 90); src(ctx, '#3A3266'); ctx.fill_preserve(); ink(ctx, 5)  # alfombra
    # respaldo del sofá
    rrect(ctx, 210, 960, 660, 360, 50); fill_ink(ctx, '#4A5594', 7)
    for x in (225, 545): rrect(ctx, x, 985, 310, 300, 40); src(ctx, '#55609F'); ctx.fill_preserve(); ink(ctx, 4)
    for x in (300, 780): ctx.move_to(x, 1360); ctx.line_to(x - 10, 1420); ink(ctx, 10)

def scene_cafe(ctx, cam, t, f, front=False):
    if front:
        # mesa redonda entre los dos (tapa las manos que están "sobre la mesa")
        ctx.move_to(540, 1250); ctx.line_to(540, 1590); ink(ctx, 16); ellipse(ctx, 540, 1600, 110, 18); fill_ink(ctx, '#3A2A22', 5)
        ellipse(ctx, 540, 1235, 265, 52); fill_ink(ctx, '#C88A52', 7)
        ellipse(ctx, 540, 1228, 245, 40); src(ctx, '#D99C62'); ctx.fill()
        for cx in (430, 655):  # tazas
            rrect(ctx, cx - 26, 1172, 52, 58, 8); fill_ink(ctx, '#FFFFFF', 4)
            for k in range(2):  # vapor
                yy = 1150 - ((t * 40 + k * 30) % 60)
                ctx.move_to(cx - 6 + k * 12, yy + 20); ctx.curve_to(cx - 16 + k * 12, yy + 10, cx + 4 + k * 12, yy, cx - 6 + k * 12, yy - 10)
                src(ctx, '#FFFFFF', .5); ctx.set_line_width(4); ctx.stroke()
        return
    ctx.rectangle(-600, -400, 2400, 1700); src(ctx, '#C9714A'); ctx.fill()
    r = rng(2)
    for row in range(-8, 48):  # ladrillos
        y = row * 34; off = 50 if row % 2 else 0
        for col in range(-8, 24):
            x = col * 100 + off
            rrect(ctx, x + 3, y + 3, 94, 28, 4); c = .92 + r() * .14
            ctx.set_source_rgba(.78 * c, .40 * c, .27 * c, 1); ctx.fill()
    ctx.rectangle(-600, 900, 2400, 400); src(ctx, '#5A3A2A'); ctx.fill(); ctx.move_to(-600, 900); ctx.line_to(1800, 900); ink(ctx, 5)
    for x in range(-600, 1800, 70): ctx.move_to(x, 905); ctx.line_to(x, 1300); src(ctx, '#4A2E20'); ctx.set_line_width(4); ctx.stroke()
    # pizarra del menú
    rrect(ctx, 360, 260, 360, 330, 12); fill_ink(ctx, '#2D3A33', 8)
    src(ctx, '#F4F1E8'); ctx.select_font_face(FONT, 0, 1); ctx.set_font_size(54); center_text(ctx, 'CAFÉ', 540, 345)
    ctx.set_font_size(26); ctx.select_font_face(FONT, 0, 0)
    for i, s in enumerate(('Americano ...... 2', 'Capuchino ...... 3', 'Charla incómoda .. 0')): center_text(ctx, s, 540, 410 + i * 50)
    # lámparas colgantes con conos de luz cálida
    for lx in (230, 850):
        ctx.move_to(lx, -100); ctx.line_to(lx, 120); ink(ctx, 4)
        ctx.move_to(lx - 70, 190); ctx.line_to(lx - 30, 120); ctx.line_to(lx + 30, 120); ctx.line_to(lx + 70, 190); ctx.close_path(); fill_ink(ctx, '#2F4A3E', 5)
        ellipse(ctx, lx, 192, 26, 10); src(ctx, '#FFF2B0'); ctx.fill()
        ctx.save(); ctx.set_operator(cairo.OPERATOR_ADD)
        ctx.move_to(lx - 60, 195); ctx.line_to(lx + 60, 195); ctx.line_to(lx + 300, 1300); ctx.line_to(lx - 300, 1300); ctx.close_path()
        g = cairo.LinearGradient(0, 195, 0, 1300); g.add_color_stop_rgba(0, 1, .85, .5, .22); g.add_color_stop_rgba(1, 1, .85, .5, 0); ctx.set_source(g); ctx.fill(); ctx.restore()
    # suelo de madera
    ctx.rectangle(-600, 1300, 2400, 1000); src(ctx, '#7A5236'); ctx.fill(); ctx.move_to(-600, 1300); ctx.line_to(1800, 1300); ink(ctx, 6)
    for k in range(10): yy = 1340 + k * 70; ctx.move_to(-600, yy); ctx.line_to(1800, yy); src(ctx, '#5E3E28'); ctx.set_line_width(4); ctx.stroke()
    # respaldos de las sillas
    for x in (300, 785):
        rrect(ctx, x - 105, 1020, 210, 300, 24); fill_ink(ctx, '#3A5A4A', 7)
        for k in range(3): ctx.move_to(x - 60 + k * 60, 1050); ctx.line_to(x - 60 + k * 60, 1290); ink(ctx, 5)
        rrect(ctx, x - 120, 1300, 240, 34, 10); fill_ink(ctx, '#2F4A3E', 6)

def scene_lago(ctx, cam, t, f, front=False):
    if front:
        # juncos en primer plano (parallax rápido)
        def reeds():
            for k, x in enumerate((-40, 0, 30, 1040, 1080, 1120)):
                sw = 10 * math.sin(t * 1.3 + k)
                ctx.move_to(x, 2100); ctx.curve_to(x + 5, 1900, x + sw, 1800, x + sw * 1.5, 1640 + (k % 3) * 40)
                ink(ctx, 14); ctx.move_to(x, 2100); ctx.curve_to(x + 5, 1900, x + sw, 1800, x + sw * 1.5, 1640 + (k % 3) * 40)
                src(ctx, '#2E4A2A'); ctx.set_line_width(8); ctx.stroke()
                ellipse(ctx, x + sw * 1.5, 1660 + (k % 3) * 40, 12, 40); fill_ink(ctx, '#5A3A22', 4)
        par(ctx, cam, 1.45, reeds); return
    # cielo de atardecer
    g = cairo.LinearGradient(0, -200, 0, 1150); g.add_color_stop_rgb(0, .45, .38, .62); g.add_color_stop_rgb(.55, .98, .62, .45); g.add_color_stop_rgb(1, 1, .82, .52)
    ctx.rectangle(-600, -400, 2400, 1600); ctx.set_source(g); ctx.fill()
    def sun():
        ctx.save(); ctx.set_operator(cairo.OPERATOR_ADD)
        g2 = cairo.RadialGradient(560, 930, 20, 560, 930, 520); g2.add_color_stop_rgba(0, 1, .85, .5, .6); g2.add_color_stop_rgba(1, 1, .6, .3, 0)
        ctx.set_source(g2); ctx.arc(560, 930, 520, 0, 6.3); ctx.fill(); ctx.restore()
        ctx.arc(560, 960, 120, 0, 6.3); src(ctx, '#FFE7A0'); ctx.fill()
    def clouds():
        for cx, cy, s in ((150, 420, 1.2), (820, 330, 1), (520, 560, .7)):
            x = cx + t * 6
            for dx, dy, rr in ((0, 0, 40), (50, -16, 52), (105, 0, 38)):
                ctx.arc(x + dx * s, cy + dy * s, rr * s, 0, 6.3); src(ctx, '#FFC8A8', .8); ctx.fill()
    def mountains():
        ctx.move_to(-600, 1060); pts = [(-300, 760), (0, 900), (250, 720), (480, 880), (760, 700), (1050, 860), (1400, 760), (1800, 1060)]
        for p in pts: ctx.line_to(*p)
        ctx.close_path(); src(ctx, '#8A5E8E'); ctx.fill()
    def trees():
        r = rng(11); x = -600
        while x < 1800:
            h = 120 + r() * 120; ctx.move_to(x, 1080); ctx.line_to(x + 40, 1080 - h); ctx.line_to(x + 80, 1080); ctx.close_path()
            src(ctx, '#4A3A5E'); ctx.fill(); x += 45 + r() * 30
        ctx.rectangle(-600, 1070, 2400, 30); src(ctx, '#4A3A5E'); ctx.fill()
    par(ctx, cam, .08, sun); par(ctx, cam, .15, clouds); par(ctx, cam, .25, mountains); par(ctx, cam, .45, trees)
    # lago con reflejo del sol
    g = cairo.LinearGradient(0, 1095, 0, 2300); g.add_color_stop_rgb(0, .95, .66, .52); g.add_color_stop_rgb(.4, .45, .42, .66); g.add_color_stop_rgb(1, .22, .26, .45)
    ctx.rectangle(-600, 1095, 2400, 1300); ctx.set_source(g); ctx.fill()
    for k in range(14):
        yy = 1110 + k * 22 + k * k * 2; w = 60 + k * 18; ph = math.sin(t * 2 + k) * 14
        ctx.move_to(560 - w / 2 + ph, yy); ctx.line_to(560 + w / 2 + ph, yy); src(ctx, '#FFE7A0', .7 - k * .04); ctx.set_line_width(6); ctx.stroke()
    # muelle: tablones y frente
    ctx.move_to(130, 1300); ctx.line_to(950, 1300); ctx.line_to(990, 1345); ctx.line_to(90, 1345); ctx.close_path(); fill_ink(ctx, '#B07A4A', 6)
    for k in range(9): xx = 150 + k * 95; ctx.move_to(xx, 1302); ctx.line_to(xx - 8, 1343); ink(ctx, 3)
    ctx.rectangle(90, 1345, 900, 50); fill_ink(ctx, '#7A5030', 6)
    for xx in (120, 540, 960): ctx.rectangle(xx - 18, 1395, 36, 230); fill_ink(ctx, '#5E3E24', 5)
    ctx.rectangle(90, 1345, 900, 50); src(ctx, SHADOW, .3); ctx.fill()
    for xx in (120, 540, 960):  # ondas en los postes
        rr = (t * 20) % 30; ellipse(ctx, xx, 1625, 30 + rr, 6 + rr * .2); src(ctx, '#FFFFFF', .4 * (1 - rr / 30)); ctx.set_line_width(3); ctx.stroke()

SCENES = {'sofa': scene_sofa, 'cafe': scene_cafe, 'lago': scene_lago}
CAST = {'sofa': ['tono'], 'cafe': ['tono', 'beto'], 'lago': ['tono', 'beto']}

# ---------------------------------------------------------------- cámara
SHOTS = {
    'S_WIDE': (540, 990, 1.05), 'S_CU': (540, 920, 1.75),
    'C_TWO': (540, 1060, 1.12), 'C_BETO': (765, 900, 1.6), 'C_TONO': (310, 880, 1.85), 'C_INT': (420, 950, 1.45),
    'L_WIDE': (545, 1080, 1.0), 'L_TWO': (548, 1050, 1.25), 'L_TONO': (420, 920, 1.6), 'L_END': (548, 1020, 1.08)}
CAM = [  # (t, toma, modo, empuje/s, deslizamiento s)
    (0.0, 'S_WIDE', 'cut', .028, 0), (ls(1) + .1, 'S_CU', 'glide', .02, 1.4),
    (ls(2) - .1, 'C_TWO', 'cut', .015, 0), (ls(2) + .9, 'C_BETO', 'glide', .02, .8), (ls(3) - .05, 'C_TONO', 'cut', .03, 0),
    (ls(4), 'C_INT', 'glide', .05, 1.2),
    (ls(5) - .05, 'L_WIDE', 'cut', .015, 0), (wt('pescar') - .3, 'L_TWO', 'glide', .02, 1.0), (ls(6) + .6, 'L_TONO', 'glide', .025, 1.2),
    (wt('calvo') - .05, 'L_TWO', 'cut', .02, 0), (ls(7) + .6, 'L_END', 'glide', .01, 3.0)]
PUNCH = [(0.0, .14), (wt('quince'), .10), (ls(3), .08), (wt('calvo'), .10)]
SHAKE = [(wt('quince') + .05, 10), (wt('calvo') + .05, 12)]
CUTS = [c[0] for c in CAM if c[2] == 'cut']

def cam_track():
    out, prev, st = [], SHOTS['S_WIDE'] + (0.0,), {}
    for f in range(N):
        t = f / FPS; idx = max(i for i, c in enumerate(CAM) if t >= c[0])
        t0, shot, mode, push, gl = CAM[idx]; cx, cy, z = SHOTS[shot]
        z *= 1 + push * (t - t0); rot = 0.6 * math.sin(t * 0.7); cx += 6 * math.sin(t * .9); cy += 4 * math.sin(t * 1.3)
        if mode == 'glide':
            st.setdefault(idx, prev); s = smoother((t - t0) / gl); p = st[idx]
            cx, cy, z, rot = lerp(p[0], cx, s), lerp(p[1], cy, s), lerp(p[2], z, s), lerp(p[3], rot, s)
        for pt, amt in PUNCH:
            if t >= pt: z *= 1 + amt * math.exp(-(t - pt) * 7)
        sx = sy = sr = 0
        for stt, amp in SHAKE:
            k = f - round(stt * FPS)
            if 0 <= k < 8:
                e = 1 - k / 8; s = -1 if k % 2 else 1; sx += s * amp * e; sy += -s * amp * .6 * e; sr += s * .9 * e
        prev = (cx, cy, z, rot); out.append((cx + sx / z, cy + sy / z, z, rot + sr))
    return out
CAMS = cam_track()

# ---------------------------------------------------------------- iluminación por momento
def interrogation(t):  # foco de interrogatorio sobre Toño
    a, b = wt('interrogatorio') - .9, ls(5) - .05
    if t < a or t >= b: return 0.0
    return smoother((t - a) / .35)

def world_to_screen(cam, p):
    cx, cy, z, rot = cam; x, y = (p[0] - cx) * z, (p[1] - cy) * z; a = math.radians(rot)
    return W / 2 + x * math.cos(a) - y * math.sin(a), H / 2 + x * math.sin(a) + y * math.cos(a)

def grade(ctx, scene, t, cam):
    if scene == 'sofa':
        ctx.save(); ctx.set_operator(cairo.OPERATOR_SOFT_LIGHT); src(ctx, '#3050C0', .45); ctx.paint(); ctx.restore()
    elif scene == 'cafe':
        g = cairo.LinearGradient(0, 0, W, H * .4); g.add_color_stop_rgba(0, 1, .8, .5, .25); g.add_color_stop_rgba(1, .4, .25, .5, .2)
        ctx.save(); ctx.set_operator(cairo.OPERATOR_SOFT_LIGHT); ctx.set_source(g); ctx.paint(); ctx.restore()
        m = interrogation(t)
        if m > 0:  # todo oscuro salvo un foco duro sobre Toño
            hx, hy = world_to_screen(cam, (300, 900))
            rg = cairo.RadialGradient(hx, hy, 160 * cam[2], hx, hy, 420 * cam[2])
            rg.add_color_stop_rgba(0, 0, 0, 0, 0); rg.add_color_stop_rgba(1, .03, .02, .06, .86 * m); ctx.set_source(rg); ctx.paint()
            ctx.save(); ctx.set_operator(cairo.OPERATOR_ADD)
            ctx.move_to(hx - 40 * cam[2], 0); ctx.line_to(hx + 40 * cam[2], 0); ctx.line_to(hx + 330 * cam[2], hy + 300 * cam[2]); ctx.line_to(hx - 330 * cam[2], hy + 300 * cam[2]); ctx.close_path()
            src(ctx, '#FFF3C0', .12 * m); ctx.fill(); ctx.restore()
    else:
        g = cairo.LinearGradient(0, 0, 0, H); g.add_color_stop_rgba(0, 1, .55, .35, .3); g.add_color_stop_rgba(1, .45, .3, .6, .3)
        ctx.save(); ctx.set_operator(cairo.OPERATOR_SOFT_LIGHT); ctx.set_source(g); ctx.paint(); ctx.restore()
    rg = cairo.RadialGradient(W / 2, H * .45, H * .3, W / 2, H * .5, H * .78)
    rg.add_color_stop_rgba(0, .1, .05, .15, 0); rg.add_color_stop_rgba(1, .1, .05, .15, .42); ctx.set_source(rg); ctx.paint()

# ---------------------------------------------------------------- textos
def text_box(ctx, lines, cx, y, size, pad=26):
    ctx.select_font_face(FONT, 0, 1); ctx.set_font_size(size)
    ws = [ctx.text_extents(s) for s in lines]
    w = max(e.x_advance for e in ws) + pad * 2; lh = size * 1.18; h = lh * len(lines) + pad * 1.2
    rrect(ctx, cx - w / 2, y, w, h, 22); src(ctx, '#FFFFFF', .97); ctx.fill(); src(ctx, '#111111')
    for i, (s, e) in enumerate(zip(lines, ws)): ctx.move_to(cx - e.x_advance / 2, y + pad * .6 + lh * (i + .82)); ctx.show_text(s)

def outlined(ctx, s, x, y, size, col, stroke=14):
    ctx.select_font_face(FONT, 0, 1); ctx.set_font_size(size); ctx.move_to(x, y); ctx.text_path(s)
    ctx.set_line_join(cairo.LINE_JOIN_ROUND); src(ctx, '#000000'); ctx.set_line_width(stroke); ctx.stroke_preserve(); src(ctx, col); ctx.fill()

KEYWORDS = {'tres', 'quince', 'amigo', 'hablar', 'preguntas', 'bien', 'interrogatorio', 'pescar', 'calvo', 'hombro', 'dejó'}

def caption(ctx, t):
    for L in LINEAS:
        if not (L['start'] - .1 <= t <= L['end'] + .25): continue
        ws = L['words']; chunks = [ws[i:i + 3] for i in range(0, len(ws), 3)]
        if len(chunks) > 1 and len(chunks[-1]) == 1: chunks[-2] += chunks.pop()
        cur = chunks[0]
        for ch in chunks:
            if t >= ch[0]['start'] - .08: cur = ch
        size = 72; ctx.select_font_face(FONT, 0, 1); ctx.set_font_size(size)
        toks = [w['word'].upper() for w in cur]
        if L['texto'].rstrip('.').endswith('?') and cur is chunks[-1]: toks[-1] += '?'
        widths = [ctx.text_extents(s).x_advance for s in toks]; space = ctx.text_extents(' ').x_advance * 2.8
        total = sum(widths) + space * (len(toks) - 1)
        if total > 920:
            k = 920 / total; size *= k; ctx.set_font_size(size); widths = [w * k for w in widths]; space *= k; total = 920
        x = W / 2 - total / 2; y = 1450
        for s, w, wd in zip(toks, cur, widths):
            now = w['start'] - .05 <= t <= w['end'] + .05; active = t >= w['start'] - .05
            base = w['word'].lower().strip('¿?¡!.,:')
            col = ('#FF3B6B' if base in KEYWORDS else '#FFD400') if (now or (active and base in KEYWORDS)) else '#FFFFFF'
            sc = 1.08 if now else 1.0
            ctx.save(); ctx.translate(x + wd / 2, y); ctx.scale(sc, sc); outlined(ctx, s, -wd / 2, 0, size, col); ctx.restore()
            x += wd + space
        return

def stat_overlay(ctx, t):
    # 1990: 3 %  ->  2021: 15 %  (arriba, sin tapar caras)
    a = wt('noventa') - .1; b = wt('veintiuno') - .2; end = ls(1) + .2
    if t < a or t > end: return
    al = min(1, (t - a) / .2)
    def card(x, year, val, col, pop):
        ctx.save(); ctx.translate(x, 395); ctx.scale(pop, pop)
        rrect(ctx, -170, -70, 340, 210, 26); src(ctx, '#FFFFFF', .95 * al); ctx.fill()
        ctx.select_font_face(FONT, 0, 1); ctx.set_font_size(40); src(ctx, '#333333', al); center_text(ctx, year, 0, -15)
        outlined(ctx, '', 0, 0, 10, '#000')
        ctx.set_font_size(96); e = ctx.text_extents(val); outlined(ctx, val, -e.width / 2 - e.x_bearing, 105, 96, col, 10)
        ctx.restore()
    p1 = 1 + .25 * math.exp(-(t - a) * 9)
    card(300 if t >= b else 540, '1990', '3 %', '#3AA0FF', p1)
    if t >= b:
        k = min(1, (t - b) / .7); val = int(round(3 + 12 * smoother(k)))
        p2 = 1 + .3 * math.exp(-(t - wt('quince')) * 9) if t >= wt('quince') else 1
        card(780, '2021', f'{val} %', '#FF3B6B', p2)
        ctx.select_font_face(FONT, 0, 1); outlined(ctx, '→', 505, 485, 80, '#FFFFFF', 10)
    ctx.select_font_face(FONT, 0, 1); ctx.set_font_size(30)
    s = 'hombres sin un amigo cercano (EE. UU.)'; e = ctx.text_extents(s)
    rrect(ctx, W / 2 - e.width / 2 - 20, 560, e.width + 40, 54, 16); src(ctx, '#111111', .75 * al); ctx.fill()
    src(ctx, '#FFFFFF', al); center_text(ctx, s, W / 2, 598)

def source_tag(ctx, t):
    if ls(7) <= t:
        ctx.select_font_face(FONT, 0, 0); ctx.set_font_size(26); src(ctx, '#FFFFFF', .85)
        center_text(ctx, 'Fuente: G. Greif, "Buddy System" (2009)', W / 2, 1560)
    elif t < ls(2) - .1:
        ctx.select_font_face(FONT, 0, 0); ctx.set_font_size(26); src(ctx, '#FFFFFF', .8)
        center_text(ctx, 'Fuente: Survey Center on American Life (2021)', W / 2, 1560)

# ---------------------------------------------------------------- cuadro
def draw_world(ctx, scene, f, cam):
    t = f / FPS
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(math.radians(cam[3])); ctx.scale(cam[2], cam[2]); ctx.translate(-cam[0], -cam[1])
    SCENES[scene](ctx, cam, t, f)
    for name in CAST[scene]: draw_character(ctx, name, f, scene)
    SCENES[scene](ctx, cam, t, f, front=True)
    if scene == 'cafe' and interrogation(t) > 0:  # lámpara de interrogatorio que baja
        y = lerp(-300, 520, smoother((t - (wt('interrogatorio') - .9)) / .4))
        ctx.move_to(300, -400); ctx.line_to(300, y - 60); ink(ctx, 5)
        ctx.move_to(240, y); ctx.line_to(275, y - 60); ctx.line_to(325, y - 60); ctx.line_to(360, y); ctx.close_path(); fill_ink(ctx, '#2A2A30', 5)
        ellipse(ctx, 300, y + 2, 50, 12); src(ctx, '#FFF9D0'); ctx.fill()
    ctx.restore()
    grade(ctx, scene, t, cam)

def frame(f):
    t = f / FPS; cam = CAMS[f]
    surf = cairo.ImageSurface(cairo.FORMAT_ARGB32, W, H); ctx = cairo.Context(surf)
    scene = scene_at(t); draw_world(ctx, scene, f, cam)
    for k, (tc, name) in enumerate(SC_CHANGE[1:], 1):  # fundido corto al cambiar de lugar
        fc = round(tc * FPS)
        if fc <= f < fc + XF:
            prev = SC_CHANGE[k - 1][1]
            ctx.push_group(); draw_world(ctx, prev, fc - 1, CAMS[fc - 1]); ctx.pop_group_to_source()
            ctx.paint_with_alpha(1 - (f - fc + 1) / (XF + 1))
    text_box(ctx, ['Por qué los hombres no hablan', 'de sus problemas'], W / 2, 170, 54)
    stat_overlay(ctx, t); caption(ctx, t); source_tag(ctx, t)
    return surf

def render_range(args):
    a, b, path = args
    p = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'bgra', '-s', f'{W}x{H}', '-r', str(FPS),
                          '-i', '-', '-c:v', 'libx264', '-crf', '16', '-preset', 'medium', '-pix_fmt', 'yuv420p', path], stdin=subprocess.PIPE)
    for f in range(a, b):
        s = frame(f); s.flush(); p.stdin.write(bytes(s.get_data()))
    p.stdin.close(); p.wait(); return path

if __name__ == '__main__':
    os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
    if len(sys.argv) > 1 and sys.argv[1] == 'fotos':
        for f in map(int, sys.argv[2].split(',')): frame(f).write_to_png(os.path.join(HERE, 'out', f'foto_{f:04d}.png'))
        sys.exit()
    parts = 4; step = math.ceil(N / parts)
    jobs = [(i * step, min(N, (i + 1) * step), os.path.join(HERE, 'out', f'seg{i}.mp4')) for i in range(parts)]
    with Pool(parts) as pool: segs = pool.map(render_range, jobs)
    lst = os.path.join(HERE, 'out', 'segs.txt'); open(lst, 'w').write(''.join(f"file '{s}'\n" for s in segs))
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', os.path.join(HERE, 'out', 'video_mudo.mp4')], check=True)
    print('frames', N)
