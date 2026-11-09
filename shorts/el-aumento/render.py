# Short 2D "El aumento" — dibujo con cairo, 1080x1920 @30fps.
# Uso: python3 render.py            -> out/video_mudo.mp4
#      python3 render.py fotos 30,200,400  -> out/foto_XXXX.png
import json, math, os, sys, subprocess
from multiprocessing import Pool
import cairo

W, H, FPS = 1080, 1920, 30
HERE = os.path.dirname(os.path.abspath(__file__))
D = json.load(open(os.path.join(HERE, 'palabras.json')))
TOTAL = D['total']
N = int(math.ceil(TOTAL * FPS))
LINEAS = D['lineas']
FONT = 'DejaVu Sans'

def wt(texto):
    """Tiempo de inicio de la primera palabra que contiene `texto`."""
    for L in LINEAS:
        for w in L['words']:
            if texto.lower() in w['word'].lower():
                return w['start']
    raise KeyError(texto)

def line_start(i): return LINEAS[i]['start']

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
    ctx.save(); ctx.translate(cx, cy); ctx.scale(rx, ry); ctx.arc(0, 0, 1, 0, 2 * math.pi); ctx.restore()
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

# ---------------------------------------------------------------- sincronización labial (español)
MOUTH = {  # open, wide, round, teeth
    'REST': (0.0, 0.5, 0, 0), 'MBP': (0.0, 0.45, 0, 0), 'FV': (0.12, 0.55, 0, 1),
    'A': (1.0, 0.7, 0, .4), 'E': (.55, 1, 0, .7), 'I': (.3, 1, 0, .9), 'O': (.7, .3, .8, 0),
    'U': (.3, .1, 1, 0), 'TDLN': (.3, .6, 0, .8), 'SZ': (.2, .8, 0, 1), 'CH': (.25, .3, .6, .8), 'R': (.35, .5, .2, .3)}

def word_visemes(raw):
    import unicodedata
    w = ''.join(c for c in unicodedata.normalize('NFD', raw.lower()) if unicodedata.category(c) != 'Mn' or c == '̃')
    w = unicodedata.normalize('NFC', w)
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
            f0 = max(0, round((w['start'] - 0.03) * FPS)); f1 = min(N, round((w['end'] - 0.03) * FPS))
            acc = 0
            for v, k in zip(vs, wts):
                a = f0 + round((f1 - f0) * acc / tot); acc += k; b = f0 + round((f1 - f0) * acc / tot)
                for f in range(a, min(N, max(b, a + 1))): track[f] = v
    # suavizado (sin saltos duros), pero m/b/p siempre cierran
    out, cur = [], list(MOUTH['REST'])
    for f in range(N):
        tgt = MOUTH[track[f]]
        cur = [lerp(c, t, 0.6) for c, t in zip(cur, tgt)]
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

# ---------------------------------------------------------------- expresiones
EXPR = {  # lid, brow(+triste/-enojado), raise, smile, pupil, asym(brow), mouth_open_extra
    'neutral':   (.12, 0, 0, .1, 1, 0, 0),
    'hopeful':   (0, .25, .07, .45, 1.05, 0, 0),
    'happy':     (.18, .1, .05, .9, 1, 0, 0),
    'smug':      (.48, -.1, 0, .55, .95, .12, 0),
    'annoyed':   (.52, -.32, 0, -.45, .95, 0, 0),
    'deadpan':   (.56, 0, 0, 0, .9, 0, 0),
    'determined': (.32, -.4, 0, -.25, 1, 0, 0),
    'shock':     (-.35, .45, .16, -.3, .55, 0, .8),
}
def expr_track(keys):
    keys = sorted(keys)
    vals, cur = [], list(EXPR[keys[0][1]])
    for f in range(N):
        t = f / FPS; name = keys[0][1]
        for kt, kn in keys:
            if t >= kt: name = kn
        cur = [lerp(c, x, 0.22) for c, x in zip(cur, EXPR[name])]
        vals.append(tuple(cur))
    return vals

E_TONO = expr_track([(0, 'hopeful'), (line_start(1), 'happy'), (wt('tareas') - .05, 'shock'),
                     (line_start(3) - .1, 'annoyed'), (wt('actitud'), 'deadpan'), (line_start(5) - .1, 'determined'),
                     (wt('Perfecto') + .1, 'hopeful'), (wt('tres') - .05, 'shock')])
E_BOSS = expr_track([(0, 'deadpan'), (line_start(1) - .1, 'happy'), (wt('tareas') - .3, 'smug'),
                     (line_start(5), 'deadpan'), (wt('Perfecto') - .1, 'happy'), (wt('entrena'), 'smug')])
LIP = {'tono': lip_track('tono'), 'ramirez': lip_track('ramirez')}
SPK = {'tono': speaking('tono'), 'ramirez': speaking('ramirez')}

def blink_track(seed):
    r = rng(seed); out = [0.0] * N; f = int(r() * 30)
    while f < N:
        for k, v in enumerate((.5, 1, 1, .5)):
            if f + k < N: out[f + k] = v
        f += int((0.6 + r() * 1.8) * FPS)
    return out
BLINK = {'tono': blink_track(7), 'ramirez': blink_track(31)}

# ---------------------------------------------------------------- poses de brazos con resorte (seguimiento natural)
POSES = {  # (hombro, codo) en grados; 0 = colgando, + = hacia afuera
    'down': (10, 6), 'out': (38, 62), 'raise': (65, 105), 'face': (22, 150), 'desk': (18, -72),
    'fist': (40, 140), 'hips': (42, -105), 'point': (70, 15), 'shrug': (55, -75)}

def pose_keys_to_track(keys, side_osc):
    keys = sorted(keys, key=lambda k: k[0])
    def tgt_at(t):
        cur = keys[0][1]
        for kt, kp in keys:
            if t >= kt: cur = kp
        return POSES[cur]
    vals, v, vel = [], list(tgt_at(0)), [0.0, 0.0]
    k, c, sub = 170.0, 17.0, 4
    for f in range(N):
        t = f / FPS; tg = tgt_at(t)
        for _ in range(sub):
            dt = 1 / FPS / sub
            for i in range(2):
                a = k * (tg[i] - v[i]) - c * vel[i]; vel[i] += a * dt; v[i] += vel[i] * dt
        osc = side_osc[f] if side_osc else 0
        vals.append((v[0] + 7 * osc * math.sin(t * 9.0), v[1] + 16 * osc * math.sin(t * 9.0 + 1)))
    return vals

def osc_from(spk, phase=0): return [s for s in spk]

T_R = pose_keys_to_track([(0, 'down'), (wt('Necesito') - .15, 'out'), (line_start(1), 'down'),
                          (wt('sueldo') - .2, 'shrug'), (line_start(4), 'down'), (wt('renuncio') - .2, 'fist'),
                          (line_start(6) + .2, 'down'), (wt('tres') - .25, 'face')], SPK['tono'])
T_L = pose_keys_to_track([(0, 'down'), (wt('Necesito') - .05, 'out'), (line_start(1), 'down'),
                          (wt('sueldo') - .15, 'shrug'), (line_start(4), 'hips'), (line_start(5), 'down'),
                          (wt('tres') - .2, 'face')], None)
B_R = pose_keys_to_track([(0, 'desk'), (line_start(1), 'out'), (line_start(2), 'desk'), (wt('aumento', ) if False else wt('partir'), 'raise'),
                          (line_start(3), 'desk'), (wt('sueldo') + 1.2, 'out'), (line_start(5), 'desk'),
                          (wt('Perfecto') - .1, 'out'), (wt('entrena') - .1, 'point'), (wt('reemplazar') + .3, 'desk')], SPK['ramirez'])
B_L = pose_keys_to_track([(0, 'desk'), (wt('Perfecto') - .1, 'out'), (wt('entrena'), 'desk')], None)

# ---------------------------------------------------------------- cámara: zoom, seguimiento, vibración y cambios de plano
SHOTS = {
    'WIDE': (575, 1050, 1.1), 'TONO_M': (365, 905, 1.42), 'TONO_CU': (335, 815, 1.95), 'TONO_XCU': (330, 790, 2.35),
    'BOSS_M': (775, 925, 1.42), 'BOSS_CU': (790, 840, 1.85)}
CAM = [  # (t, toma, modo, empuje de zoom por segundo, deslizamiento en s)
    (0.0, 'WIDE', 'cut', .018, 0), (2.1, 'TONO_M', 'glide', .02, 1.0),
    (line_start(1), 'BOSS_M', 'cut', .025, 0), (line_start(2), 'BOSS_CU', 'glide', .02, .9),
    (wt('tareas') - .02, 'TONO_CU', 'cut', .02, 0), (line_start(3), 'TONO_M', 'glide', .02, .5),
    (line_start(4), 'BOSS_CU', 'cut', .03, 0), (line_start(5), 'TONO_CU', 'cut', .035, 0),
    (line_start(6), 'WIDE', 'cut', .015, 0), (wt('tres') - .1, 'BOSS_M', 'glide', .02, .7),
    (line_start(7) - .05, 'TONO_XCU', 'cut', .03, 0)]
PUNCH = [(0.0, .14), (wt('tareas') - .02, .12), (wt('renuncio'), .06), (line_start(7) - .05, .16)]
SHAKE = [(wt('tareas') + .05, 16), (wt('renuncio') + .1, 12), (line_start(7), 20)]
CUTS = [c[0] for c in CAM if c[2] == 'cut']

def cam_track():
    out, prev = [], SHOTS['WIDE'] + (0.0,)
    seg_start_state = {}
    for f in range(N):
        t = f / FPS
        idx = max(i for i, c in enumerate(CAM) if t >= c[0])
        t0, shot, mode, push, gl = CAM[idx]
        cx, cy, z = SHOTS[shot]
        z *= 1 + push * (t - t0)
        rot = 0.6 * math.sin(t * 0.7)  # deriva suave: nunca quieta
        cx += 6 * math.sin(t * 0.9); cy += 4 * math.sin(t * 1.3)
        if mode == 'glide':
            if idx not in seg_start_state: seg_start_state[idx] = prev
            s = smoother((t - t0) / gl) if gl else 1
            p = seg_start_state[idx]
            cx, cy, z, rot = lerp(p[0], cx, s), lerp(p[1], cy, s), lerp(p[2], z, s), lerp(p[3], rot, s)
        for pt, amt in PUNCH:
            if t >= pt: z *= 1 + amt * math.exp(-(t - pt) * 7)
        sx = sy = sr = 0
        for st, amp in SHAKE:
            k = f - round(st * FPS)
            if 0 <= k < 8:
                e = 1 - k / 8; s = -1 if k % 2 else 1
                sx += s * amp * e; sy += -s * amp * .6 * e; sr += s * .9 * e
        prev = (cx, cy, z, rot)
        out.append((cx + sx / z, cy + sy / z, z, rot + sr))
    return out
CAMS = cam_track()

# ---------------------------------------------------------------- iluminación por tono de la historia
def mood_red(t):  # 0..1 rojo durante la renuncia
    a, b = line_start(5) - .1, line_start(6) - .3
    if t < a or t > b + .25: return 0.0
    return smoother((t - a) / .3) * (1 - smoother((t - b) / .25))

LIGHT_DIR = 1  # luz desde la ventana (izquierda) -> sombras a la derecha

# ---------------------------------------------------------------- escenario
FLOOR_Y = 1265

def draw_window_content(ctx, cam, t):
    # el cielo y la ciudad se mueven más despacio que la pared (parallax)
    x0, y0, x1, y1 = 40, 250, 520, 1010
    ctx.save(); ctx.rectangle(x0, y0, x1 - x0, y1 - y0); ctx.clip()
    g = cairo.LinearGradient(0, y0, 0, y1); g.add_color_stop_rgb(0, .45, .72, .95); g.add_color_stop_rgb(1, .98, .86, .70)
    ctx.set_source(g); ctx.paint()
    def layer(k, fn):
        ctx.save(); ctx.translate((cam[0] - 565) * (1 - k), (cam[1] - 1010) * (1 - k)); fn(); ctx.restore()
    def clouds():
        for i, (cx, cy, s) in enumerate([(120, 360, 1), (380, 430, .8), (620, 330, 1.1)]):
            x = (cx + t * 8) % 700 - 60
            src(ctx, '#FFFFFF', .9)
            for dx, dy, r in ((0, 0, 34), (36, -12, 42), (78, 0, 32), (40, 14, 30)):
                ctx.arc(x + dx * s, cy + dy * s, r * s, 0, 2 * math.pi); ctx.fill()
    def far():
        r = rng(4); x = -40
        while x < 640:
            w = 50 + r() * 60; h = 180 + r() * 260
            ctx.rectangle(x, 1010 - 120 - h, w, h + 200); src(ctx, '#9FB3D1'); ctx.fill(); x += w + 6
    def near():
        r = rng(9); x = -60
        while x < 660:
            w = 70 + r() * 80; h = 120 + r() * 300; top = 1010 - 40 - h
            ctx.rectangle(x, top, w, h + 200); src(ctx, '#6F86AE'); ctx.fill_preserve(); ink(ctx, 3)
            src(ctx, '#FFE7A8', .85)
            for wy in range(int(top + 18), 1000, 30):
                for wx in range(int(x + 10), int(x + w - 12), 22):
                    if r() > .45: ctx.rectangle(wx, wy, 10, 14); ctx.fill()
            x += w + 14
    layer(.25, clouds); layer(.4, far); layer(.65, near)
    ctx.restore()
    # marco de la ventana
    src(ctx, '#FFFFFF'); ctx.set_line_width(22); ctx.rectangle(x0, y0, x1 - x0, y1 - y0); ctx.stroke()
    ctx.move_to((x0 + x1) / 2, y0); ctx.line_to((x0 + x1) / 2, y1); ctx.set_line_width(14); ctx.stroke()
    ctx.rectangle(x0 - 11, y0 - 11, x1 - x0 + 22, y1 - y0 + 22); ink(ctx, 5)
    ctx.rectangle(x0 + 11, y0 + 11, x1 - x0 - 22, y1 - y0 - 22); ink(ctx, 4)
    ctx.move_to((x0 + x1) / 2 - 7, y0 + 11); ctx.line_to((x0 + x1) / 2 - 7, y1 - 11); ink(ctx, 3)
    ctx.move_to((x0 + x1) / 2 + 7, y0 + 11); ctx.line_to((x0 + x1) / 2 + 7, y1 - 11); ink(ctx, 3)
    # alféizar
    ctx.rectangle(x0 - 30, y1 + 8, x1 - x0 + 60, 26); fill_ink(ctx, '#F4F1EA', 5)

def draw_room(ctx, cam, t):
    # pared
    g = cairo.LinearGradient(0, -200, 0, FLOOR_Y); g.add_color_stop_rgb(0, .95, .84, .66); g.add_color_stop_rgb(1, .91, .76, .58)
    ctx.rectangle(-600, -400, 2400, FLOOR_Y + 400); ctx.set_source(g); ctx.fill()
    # zócalo de madera
    ctx.rectangle(-600, FLOOR_Y - 190, 2400, 190); src(ctx, '#B98A5E'); ctx.fill_preserve(); ink(ctx, 5)
    for x in range(-600, 1800, 160):
        rrect(ctx, x + 18, FLOOR_Y - 170, 124, 150, 8); src(ctx, '#A87A50'); ctx.fill_preserve(); ink(ctx, 3)
    # moldura del techo
    ctx.rectangle(-600, -400, 2400, 420); src(ctx, '#F7EEDD'); ctx.fill(); ctx.move_to(-600, 20); ctx.line_to(1800, 20); ink(ctx, 5)
    ctx.rectangle(560, -60, 260, 40); src(ctx, '#FFFDF4'); ctx.fill_preserve(); ink(ctx, 4)  # lámpara
    draw_window_content(ctx, cam, t)
    # haz de luz de la ventana sobre la pared (luz cálida)
    ctx.save(); ctx.set_operator(cairo.OPERATOR_ADD)
    ctx.move_to(520, 260); ctx.line_to(1250, 520); ctx.line_to(1250, FLOOR_Y); ctx.line_to(520, 1010); ctx.close_path()
    g = cairo.LinearGradient(520, 0, 1250, 0); g.add_color_stop_rgba(0, 1, .78, .45, .16); g.add_color_stop_rgba(1, 1, .78, .45, 0)
    ctx.set_source(g); ctx.fill(); ctx.restore()
    # cuadro "EMPLEADO DEL MES" (con la foto del jefe)
    rrect(ctx, 905, 300, 230, 280, 6); fill_ink(ctx, '#7A4B2A', 6)
    ctx.rectangle(925, 320, 190, 200); fill_ink(ctx, '#DCE9F2', 4)
    ctx.arc(1020, 400, 48, 0, 2 * math.pi); fill_ink(ctx, '#FFF4EA', 4)
    for sx in (-1, 1): ellipse(ctx, 1020 + sx * 48, 398, 10, 18); fill_ink(ctx, '#9AA0A8', 3)
    ctx.arc(1003, 393, 6, 0, 6.3); src(ctx, '#111'); ctx.fill(); ctx.arc(1037, 393, 6, 0, 6.3); ctx.fill()
    ctx.move_to(1000, 420); ctx.curve_to(1010, 432, 1030, 432, 1040, 420); ink(ctx, 3)
    ctx.move_to(990, 448); ctx.line_to(1020, 520); ctx.line_to(1050, 448); ink(ctx, 3)
    src(ctx, '#FFFFFF'); ctx.select_font_face(FONT, 0, 1); ctx.set_font_size(19)
    for i, s in enumerate(('EMPLEADO', 'DEL MES')):
        e = ctx.text_extents(s); ctx.move_to(1020 - e.width / 2 - e.x_bearing, 542 + i * 22); ctx.show_text(s)
    # reloj
    ctx.arc(700, 190, 62, 0, 6.3); fill_ink(ctx, '#FFFFFF', 7)
    for k in range(12):
        a = k * math.pi / 6; ctx.move_to(700 + 48 * math.cos(a), 190 + 48 * math.sin(a)); ctx.line_to(700 + 55 * math.cos(a), 190 + 55 * math.sin(a)); ink(ctx, 4)
    a = t * 0.9 - math.pi / 2; ctx.move_to(700, 190); ctx.line_to(700 + 46 * math.cos(a), 190 + 46 * math.sin(a)); ink(ctx, 4)
    ctx.move_to(700, 190); ctx.line_to(700 + 30 * math.cos(-2.2), 190 + 30 * math.sin(-2.2)); ink(ctx, 6)
    # suelo (alfombra)
    g = cairo.LinearGradient(0, FLOOR_Y, 0, 2300); g.add_color_stop_rgb(0, .55, .55, .66); g.add_color_stop_rgb(1, .38, .38, .50)
    ctx.rectangle(-600, FLOOR_Y, 2400, 1200); ctx.set_source(g); ctx.fill()
    ctx.move_to(-600, FLOOR_Y); ctx.line_to(1800, FLOOR_Y); ink(ctx, 6)
    # luz de la ventana en el suelo
    ctx.save(); ctx.set_operator(cairo.OPERATOR_ADD)
    ctx.move_to(60, FLOOR_Y + 30); ctx.line_to(560, FLOOR_Y + 30); ctx.line_to(900, 1900); ctx.line_to(260, 1900); ctx.close_path()
    src(ctx, '#FFC070', .10); ctx.fill(); ctx.restore()
    # planta
    ctx.move_to(-10, FLOOR_Y + 40); ctx.line_to(110, FLOOR_Y + 40); ctx.line_to(95, FLOOR_Y + 190); ctx.line_to(5, FLOOR_Y + 190); ctx.close_path()
    fill_ink(ctx, '#C7643C', 5)
    sway = 3 * math.sin(t * 1.4)
    for k, (a, l) in enumerate(((-.9, 210), (-.5, 260), (-.15, 300), (.25, 250), (.6, 200), (-.3, 180))):
        bx, by = 50, FLOOR_Y + 40
        ex, ey = bx + l * math.sin(a) + sway * (k % 3), by - l * math.cos(a)
        ctx.move_to(bx, by); ctx.curve_to(bx + (ex - bx) * .2 - 40, by + (ey - by) * .5, ex - 30, ey + 40, ex, ey)
        ctx.curve_to(ex + 30, ey + 60, bx + (ex - bx) * .3 + 30, by + (ey - by) * .4, bx, by)
        fill_ink(ctx, '#3E9D5A' if k % 2 else '#4DB86C', 4)

def draw_desk(ctx):
    # sombra del escritorio en el suelo
    ellipse(ctx, 830, 1505, 300, 34); src(ctx, '#2A1E44', .35); ctx.fill()
    ctx.rectangle(545, 1215, 545, 290); fill_ink(ctx, '#A86F3F', 7)  # frente
    ctx.rectangle(545, 1215, 545, 290); ctx.save(); ctx.clip()
    ctx.rectangle(900, 1215, 200, 290); src(ctx, '#5A3570', .22); ctx.fill()  # lado en sombra
    ctx.rectangle(545, 1215, 545, 30); src(ctx, '#3A1E30', .25); ctx.fill(); ctx.restore()
    for x in (610, 770, 930):
        rrect(ctx, x, 1275, 130, 175, 6); fill_ink(ctx, '#B98050', 4)
        ctx.arc(x + 65, 1360, 7, 0, 6.3); fill_ink(ctx, '#E8C26A', 3)
    ctx.rectangle(525, 1180, 585, 40); fill_ink(ctx, '#C88A52', 7)  # tablero
    # placa "JEFE"
    ctx.move_to(610, 1182); ctx.line_to(760, 1182); ctx.line_to(745, 1140); ctx.line_to(625, 1140); ctx.close_path()
    fill_ink(ctx, '#2F2A36', 5)
    src(ctx, '#F2C230'); ctx.select_font_face(FONT, 0, 1); ctx.set_font_size(28)
    e = ctx.text_extents('JEFE'); ctx.move_to(685 - e.width / 2 - e.x_bearing, 1172); ctx.show_text('JEFE')
    # taza
    rrect(ctx, 990, 1095, 70, 88, 8); fill_ink(ctx, '#FFFFFF', 5)
    ctx.arc(1068, 1135, 20, -1.4, 1.4); ink(ctx, 7)
    src(ctx, '#D2353A'); ctx.set_font_size(30); ctx.move_to(1006, 1150); ctx.show_text('#1')

def draw_chair_back(ctx):
    # sillón ejecutivo de cuero café con capitoné (ancho, para que no parezca pelo)
    rrect(ctx, 585, 700, 410, 520, 46); fill_ink(ctx, '#7A3E26', 7)
    rrect(ctx, 610, 725, 360, 470, 34); src(ctx, '#8E4A2C'); ctx.fill()
    ctx.rectangle(860, 700, 140, 520); src(ctx, SHADOW, .25); ctx.fill()
    for yy in range(760, 1160, 70):
        for xx in range(640, 960, 64):
            ctx.arc(xx + (32 if (yy // 70) % 2 else 0), yy, 6, 0, 6.3); src(ctx, '#5A2A18'); ctx.fill()
    rrect(ctx, 585, 700, 410, 520, 46); ink(ctx, 7)

def draw_foreground(ctx, cam):
    # respaldo de silla en primer plano: se desplaza más rápido (parallax > 1)
    k = 1.45
    ctx.save(); ctx.translate(-(cam[0] - 565) * (k - 1), -(cam[1] - 1010) * (k - 1))
    rrect(ctx, -120, 1640, 420, 560, 90); fill_ink(ctx, '#2C2F38', 9)
    rrect(ctx, -90, 1670, 360, 520, 70); src(ctx, '#363A45'); ctx.fill()
    ctx.move_to(-60, 1700); ctx.curve_to(60, 1680, 160, 1690, 250, 1720); src(ctx, '#5A6070', .6); ctx.set_line_width(10); ctx.stroke()
    ctx.restore()

# ---------------------------------------------------------------- personajes
CHARS = {
    'tono': dict(x=330, r=118, head_y=760, sy=905, hy=1185, feet=1560, sw=72, hw=56, skin='#FFF3E8',
                 shirt='#7DBBEA', tie='#F2C230', jacket=None, hair='#6B4226', La=150, Lf=135),
    'ramirez': dict(x=790, r=130, head_y=790, sy=945, hy=1240, feet=None, sw=92, hw=84, skin='#FFF0E2',
                    shirt='#FFFFFF', tie='#D2353A', jacket='#5A5F6B', hair='#A3A8B0', La=150, Lf=140),
}
SHADOW = '#4B2E78'

def arm_points(C, side, pose):
    sx = C['x'] + side * (C['sw'] - 8); sy = C['sy'] + 10
    a1 = math.radians(pose[0]) * side; a2 = a1 + math.radians(pose[1]) * side
    ex = sx + C['La'] * math.sin(a1); ey = sy + C['La'] * math.cos(a1)
    hx = ex + C['Lf'] * math.sin(a2); hy = ey + C['Lf'] * math.cos(a2)
    return (sx, sy), (ex, ey), (hx, hy)

def torso_path(ctx, C, br):
    x, sy, hy = C['x'], C['sy'] - br, C['hy']
    ctx.move_to(x - C['sw'], sy + 8); ctx.curve_to(x - C['sw'] + 4, sy - 4, x - C['sw'] + 20, sy - 6, x - C['sw'] + 30, sy - 6)
    ctx.line_to(x + C['sw'] - 30, sy - 6); ctx.curve_to(x + C['sw'] - 20, sy - 6, x + C['sw'] - 4, sy - 4, x + C['sw'], sy + 8)
    ctx.line_to(x + C['hw'], hy); ctx.line_to(x - C['hw'], hy); ctx.close_path()

def head_pose(name, f):
    C = CHARS[name]; t = f / FPS
    lip = LIP[name][f]; spk = SPK[name][f]
    br = 3 * math.sin(t * 2 * math.pi / (2.3 if name == 'tono' else 2.9))  # respiración
    dy = -br - 5 * lip[0] * spk
    tilt = (2.2 * math.sin(t * 2.1) * spk + 1.2 * math.sin(t * .8 + (1 if name == 'tono' else 3)))
    ex = (E_TONO if name == 'tono' else E_BOSS)[f]
    if ex[6] > .2: dy -= 8 * ex[6]  # sobresalto: la cabeza se echa atrás
    dx = 3 * math.sin(t * 1.1) * spk
    return C['x'] + dx, C['head_y'] + dy, tilt, br

def draw_head(ctx, name, f, silhouette=False):
    C = CHARS[name]; r = C['r']
    hx, hy, tilt, br = head_pose(name, f)
    ex = (E_TONO if name == 'tono' else E_BOSS)[f]
    lid, brow, raise_, smile, pup, asym, mopen = ex
    lid = max(lid, BLINK[name][f])
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(math.radians(tilt))
    if silhouette:
        ctx.arc(0, 0, r * 1.05, 0, 2 * math.pi); ctx.fill(); ctx.restore(); return
    if name == 'ramirez':  # pelo canoso de los lados (por detrás de la cabeza)
        for s in (-1, 1):
            ellipse(ctx, s * r * .9, -r * .08, r * .2, r * .36); fill_ink(ctx, C['hair'], 6)
    # cabeza con sombreado de dos tonos (luz desde la izquierda)
    ctx.arc(0, 0, r, 0, 2 * math.pi); src(ctx, C['skin']); ctx.fill_preserve(); ctx.save(); ctx.clip()
    src(ctx, SHADOW, .20); ctx.paint()
    ctx.arc(-r * .2, -r * .12, r * 1.0, 0, 2 * math.pi); src(ctx, C['skin']); ctx.fill()
    ctx.restore()
    ctx.arc(0, 0, r, 0, 2 * math.pi); ink(ctx, 7)
    # luz de borde
    ctx.arc(0, 0, r - 9, math.radians(150), math.radians(215)); src(ctx, '#FFFFFF', .9); ctx.set_line_width(5); ctx.stroke()
    if name == 'tono':  # pelo despeinado
        ctx.move_to(-r * .98, -r * .2)
        n = 9
        for k in range(n + 1):
            a = math.pi + math.pi * k / n
            rr = r * (1.08 if k % 2 else 1.0)
            ctx.line_to(rr * math.cos(a) * (1.02), rr * math.sin(a) - (6 if k % 2 else 0))
        ctx.line_to(r * .98, -r * .2)
        ctx.curve_to(r * .6, -r * .55, r * .3, -r * .35, r * .05, -r * .58)
        ctx.curve_to(-r * .2, -r * .4, -r * .55, -r * .62, -r * .98, -r * .2)
        ctx.close_path(); fill_ink(ctx, C['hair'], 6)
        ctx.move_to(-r * .5, -r * .85); ctx.curve_to(-r * .3, -r * .75, -r * .1, -r * .8, r * .1, -r * .9); src(ctx, '#8A5A36'); ctx.set_line_width(6); ctx.stroke()
    else:  # calvo con brillo
        ctx.arc(-r * .25, -r * .62, r * .22, math.radians(200), math.radians(300)); src(ctx, '#FFFFFF'); ctx.set_line_width(8); ctx.stroke()
    # ojos
    look = (8 if name == 'tono' else -8) * pup
    big = 1 + max(0, -lid) * .5
    for s in (-1, 1):
        cx, cy = s * r * .33, -r * .05; rx, ry = r * .19 * big, r * .25 * big
        ellipse(ctx, cx, cy, rx, ry); src(ctx, '#FFFFFF'); ctx.fill()
        ctx.save(); ellipse(ctx, cx, cy, rx, ry); ctx.clip()
        ellipse(ctx, cx + look, cy + 6, r * .11 * pup, r * .14 * pup); src(ctx, '#111111'); ctx.fill()
        ctx.arc(cx + look - r * .04, cy - r * .03, r * .035, 0, 6.3); src(ctx, '#FFFFFF'); ctx.fill()
        if lid > 0:
            ly = cy - ry + 2 * ry * min(1, lid)
            ctx.rectangle(cx - rx - 2, cy - ry - 2, 2 * rx + 4, ly - (cy - ry) + 2); src(ctx, C['skin']); ctx.fill()
            ctx.move_to(cx - rx, ly); ctx.line_to(cx + rx, ly); ink(ctx, 6)
        ctx.restore()
        ellipse(ctx, cx, cy, rx, ry); ink(ctx, 5)
        # cejas
        yb = -r * .43 - raise_ * r - (asym * r if s == 1 else 0) - max(0, -lid) * r * .1
        yi = yb - brow * r * .16; yo = yb + brow * r * .06
        ctx.move_to(s * r * .12, yi); ctx.line_to(s * r * .52, yo); ink(ctx, 11 if name == 'ramirez' else 9)
    # boca: forma por visema + gesto de la expresión
    o, wd, rd, th = LIP[name][f]
    o = o + mopen * (1 - SPK[name][f]); rd = max(rd, .55 * mopen * (1 - SPK[name][f]))
    mw = r * (.15 + .2 * wd) * (1 - .4 * rd); mh = r * (.02 + .3 * o)
    my = r * .48; corner = -smile * r * .07; sk = asym * r * .4
    if o < .06:
        ctx.move_to(-mw, my + corner + sk); ctx.curve_to(-mw * .4, my + smile * r * .1, mw * .4, my + smile * r * .1, mw, my + corner - sk)
        ink(ctx, 6)
    else:
        def mpath():
            ctx.move_to(-mw, my + corner + sk)
            ctx.curve_to(-mw * .5, my - mh * .45, mw * .5, my - mh * .45, mw, my + corner - sk)
            ctx.curve_to(mw * .6, my + mh * 1.3, -mw * .6, my + mh * 1.3, -mw, my + corner + sk)
            ctx.close_path()
        mpath(); src(ctx, '#4A1525'); ctx.fill()
        ctx.save(); mpath(); ctx.clip()
        if th > .2: ctx.rectangle(-mw, my - mh, 2 * mw, mh * (.35 + .25 * th)); src(ctx, '#FFFFFF'); ctx.fill()
        ellipse(ctx, 0, my + mh * .95, mw * .55, mh * .4); src(ctx, '#E0607A'); ctx.fill()
        ctx.restore(); mpath(); ink(ctx, 6)
    ctx.restore()

def draw_body(ctx, name, f, silhouette=False):
    C = CHARS[name]; t = f / FPS
    hx, hy, tilt, br = head_pose(name, f)
    poses = {'tono': (T_L[f], T_R[f]), 'ramirez': (B_L[f], B_R[f])}[name]
    def stick(points, w=10):
        ctx.move_to(*points[0])
        for p in points[1:]: ctx.line_to(*p)
        if silhouette: ctx.set_line_width(w + 4); ctx.set_line_cap(cairo.LINE_CAP_ROUND); ctx.stroke()
        else: ink(ctx, w)
    # piernas
    if C['feet']:
        sway = 4 * math.sin(t * 1.2)
        for s in (-1, 1):
            stick([(C['x'] + s * 24, C['hy'] - 5), (C['x'] + s * 40 + sway, C['feet'])], 11)
            ellipse(ctx, C['x'] + s * 56 + sway, C['feet'] + 6, 32, 14)
            if silhouette: ctx.fill()
            else: fill_ink(ctx, '#1B1B22', 4)
    # cuello
    stick([(C['x'], C['sy'] - 10), (hx, hy + C['r'] * .9)], 10)
    # torso (camisa / saco) con sombras sobre la ropa
    torso_path(ctx, C, br)
    if silhouette: ctx.fill()
    else:
        src(ctx, C['jacket'] or C['shirt']); ctx.fill_preserve(); ctx.save(); ctx.clip()
        if C['jacket']:
            ctx.move_to(C['x'] - 38, C['sy'] - 8); ctx.line_to(C['x'] + 38, C['sy'] - 8); ctx.line_to(C['x'], C['sy'] + 150); ctx.close_path()
            src(ctx, C['shirt']); ctx.fill()
        # sombra que la cabeza proyecta sobre el pecho
        ellipse(ctx, hx + 18, C['sy'] - 5, C['r'] * .75, 42); src(ctx, SHADOW, .28); ctx.fill()
        # lado opuesto a la luz más oscuro
        ctx.rectangle(C['x'] + C['sw'] * .35, C['sy'] - 40, 200, 600); src(ctx, SHADOW, .22); ctx.fill()
        # corbata (se balancea con un poco de retraso)
        tsw = 6 * math.sin(t * 2.0 - .6) * SPK[name][f]
        x = C['x']; y0 = C['sy'] + 4
        ctx.move_to(x - 13, y0); ctx.line_to(x + 13, y0); ctx.line_to(x + 8, y0 + 26); ctx.line_to(x - 8, y0 + 26); ctx.close_path(); fill_ink(ctx, C['tie'], 4)
        ctx.move_to(x - 8, y0 + 26); ctx.line_to(x + 8, y0 + 26); ctx.line_to(x + 20 + tsw, y0 + 175); ctx.line_to(x + tsw, y0 + 205); ctx.line_to(x - 20 + tsw, y0 + 175); ctx.close_path()
        fill_ink(ctx, C['tie'], 4)
        if name == 'tono':
            for k in range(4):
                yy = y0 + 55 + k * 38; ctx.move_to(x - 14 + tsw * .5, yy + 8); ctx.line_to(x + 14 + tsw * .5, yy - 4); src(ctx, '#B8861A'); ctx.set_line_width(5); ctx.stroke()
        # cuello de la camisa
        for s in (-1, 1):
            ctx.move_to(x + s * 6, y0 - 8); ctx.line_to(x + s * 40, y0 - 8); ctx.line_to(x + s * 18, y0 + 30); ctx.close_path(); fill_ink(ctx, '#FFFFFF', 4)
        if C['jacket']:
            for s in (-1, 1):
                ctx.move_to(x + s * 40, C['sy'] - 6); ctx.line_to(x + s * 6, C['sy'] + 150); ink(ctx, 5)
        else:
            ctx.move_to(C['x'] - C['hw'], C['hy'] - 18); ctx.line_to(C['x'] + C['hw'], C['hy'] - 18); ink(ctx, 7)  # cinturón
        ctx.restore()
        torso_path(ctx, C, br); ink(ctx, 7)
    # brazos
    for s, pose in ((-1, poses[0]), (1, poses[1])):
        S, E, Hh = arm_points(C, s, pose)
        S = (S[0], S[1] - br)
        stick([S, E, Hh], 10)
        ctx.arc(Hh[0], Hh[1], 15, 0, 2 * math.pi)
        if silhouette: ctx.fill()
        else: fill_ink(ctx, C['skin'], 5)

def draw_character(ctx, name, f):
    C = CHARS[name]
    # sombra proyectada en la pared, detrás del personaje (luz desde la izquierda)
    ctx.save(); ctx.rectangle(-600, -400, 2400, FLOOR_Y + 400); ctx.clip()
    ctx.translate(C['x'], FLOOR_Y); ctx.transform(cairo.Matrix(1, 0, -0.18, 1, 0, 0)); ctx.translate(-C['x'] + 70, -FLOOR_Y + 10)
    ctx.push_group(); src(ctx, '#3A2260', 1); draw_body(ctx, name, f, True); src(ctx, '#3A2260', 1); draw_head(ctx, name, f, True)
    ctx.pop_group_to_source(); ctx.paint_with_alpha(.16); ctx.restore()
    # sombra de contacto bajo los pies
    if C['feet']:
        ellipse(ctx, C['x'] + 25, C['feet'] + 14, 135, 26); src(ctx, '#2A1E44', .38); ctx.fill()
    draw_body(ctx, name, f)
    draw_head(ctx, name, f)

# ---------------------------------------------------------------- textos
def text_box(ctx, lines, cx, y, size, pad=26):
    ctx.select_font_face(FONT, 0, 1); ctx.set_font_size(size)
    ws = [ctx.text_extents(s) for s in lines]
    w = max(e.x_advance for e in ws) + pad * 2; lh = size * 1.18; h = lh * len(lines) + pad * 1.2
    rrect(ctx, cx - w / 2, y, w, h, 22); src(ctx, '#FFFFFF', .97); ctx.fill()
    src(ctx, '#111111')
    for i, (s, e) in enumerate(zip(lines, ws)):
        ctx.move_to(cx - e.x_advance / 2, y + pad * .6 + lh * (i + .82)); ctx.show_text(s)

KEYWORDS = {'aumento', 'tareas', 'sueldo', 'actitud', 'renuncio', 'tres', 'reemplazar'}

def caption(ctx, t):
    for L in LINEAS:
        if not (L['start'] - .1 <= t <= L['end'] + .25): continue
        ws = L['words']; chunks = [ws[i:i + 3] for i in range(0, len(ws), 3)]
        if len(chunks) > 1 and len(chunks[-1]) == 1: chunks[-2] += chunks.pop()
        cur = chunks[0]
        for ch in chunks:
            if t >= ch[0]['start'] - .08: cur = ch
        ctx.select_font_face(FONT, 0, 1); size = 74; ctx.set_font_size(size)
        toks = []
        for k, w in enumerate(cur):
            s = w['word'].upper()
            if L['texto'].endswith('?') and cur is chunks[-1] and k == len(cur) - 1: s += '?'
            if L['texto'].startswith('¿') and cur is chunks[0] and k == 0: s = '¿' + s
            toks.append((s, w))
        space = ctx.text_extents(' ').x_advance * 2.2
        widths = [ctx.text_extents(s).x_advance for s, _ in toks]
        total = sum(widths) + space * (len(toks) - 1)
        if total > 900: size = 74 * 900 / total; ctx.set_font_size(size); widths = [ctx.text_extents(s).x_advance for s, _ in toks]; space *= size / 74; total = 900
        x = W / 2 - total / 2; y = 1430
        pop = 1.0
        for (s, w), wdt in zip(toks, widths):
            active = w['start'] - .05 <= t
            now = w['start'] - .05 <= t <= w['end'] + .05
            col = '#FF3B6B' if w['word'].lower().strip('¿?') in KEYWORDS else ('#FFD400' if now else '#FFFFFF')
            if not active: col = '#FFFFFF'
            sc = 1.12 if now else 1.0
            ctx.save(); ctx.translate(x + wdt / 2, y); ctx.scale(sc, sc); ctx.translate(-wdt / 2, 0)
            ctx.move_to(0, 0); ctx.text_path(s)
            ctx.set_line_join(cairo.LINE_JOIN_ROUND); src(ctx, '#000000'); ctx.set_line_width(14); ctx.stroke_preserve()
            src(ctx, col); ctx.fill(); ctx.restore()
            x += wdt + space
        return

LABELS = [('tono', 'Toño (empleado)', 0.3, 3.6, (330, 1250)), ('ramirez', 'Ramírez (jefe)', line_start(1), line_start(1) + 2.6, (800, 1110))]

def world_to_screen(cam, p):
    cx, cy, z, rot = cam
    x, y = (p[0] - cx) * z, (p[1] - cy) * z
    a = math.radians(rot)
    return W / 2 + x * math.cos(a) - y * math.sin(a), H / 2 + x * math.sin(a) + y * math.cos(a)

# ---------------------------------------------------------------- cuadro completo
def frame(f):
    t = f / FPS; cam = CAMS[f]
    surf = cairo.ImageSurface(cairo.FORMAT_ARGB32, W, H); ctx = cairo.Context(surf)
    ctx.save()
    ctx.translate(W / 2, H / 2); ctx.rotate(math.radians(cam[3])); ctx.scale(cam[2], cam[2]); ctx.translate(-cam[0], -cam[1])
    draw_room(ctx, cam, t)
    draw_chair_back(ctx)
    draw_character(ctx, 'ramirez', f)
    draw_desk(ctx)
    draw_character(ctx, 'tono', f)
    draw_foreground(ctx, cam)
    ctx.restore()
    # iluminación cinematográfica: cálida desde la ventana, roja en la tensión
    g = cairo.LinearGradient(0, 0, W, H * .4)
    g.add_color_stop_rgba(0, 1, .78, .45, .22); g.add_color_stop_rgba(1, .30, .22, .55, .22)
    ctx.save(); ctx.set_operator(cairo.OPERATOR_SOFT_LIGHT); ctx.set_source(g); ctx.paint(); ctx.restore()
    m = mood_red(t)
    if m > 0:
        ctx.save(); ctx.set_operator(cairo.OPERATOR_SOFT_LIGHT); src(ctx, '#FF3020', .55 * m); ctx.paint(); ctx.restore()
        ctx.save(); ctx.set_operator(cairo.OPERATOR_MULTIPLY); src(ctx, '#FFB0A0', .25 * m); ctx.paint(); ctx.restore()
    rg = cairo.RadialGradient(W / 2, H * .45, H * .3, W / 2, H * .5, H * .78)
    rg.add_color_stop_rgba(0, .1, .05, .15, 0); rg.add_color_stop_rgba(1, .1, .05, .15, .42)
    ctx.set_source(rg); ctx.paint()
    # textos (pantalla)
    text_box(ctx, ['Cuando le pides un aumento', 'a tu jefe'], W / 2, 175, 58)
    for name, txt, a, b, wp in LABELS:
        if a <= t <= b:
            al = min(1, (t - a) / .2, (b - t) / .2)
            x, y = world_to_screen(cam, wp)
            ctx.push_group(); text_box(ctx, [txt], x, y, 40, 18); ctx.pop_group_to_source(); ctx.paint_with_alpha(al)
    caption(ctx, t)
    return surf

def render_range(args):
    a, b, path = args
    p = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'bgra', '-s', f'{W}x{H}', '-r', str(FPS),
                          '-i', '-', '-c:v', 'libx264', '-crf', '16', '-preset', 'medium', '-pix_fmt', 'yuv420p', path], stdin=subprocess.PIPE)
    for f in range(a, b):
        s = frame(f); s.flush(); p.stdin.write(bytes(s.get_data()))
    p.stdin.close(); p.wait()
    return path

if __name__ == '__main__':
    os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
    if len(sys.argv) > 1 and sys.argv[1] == 'fotos':
        for f in map(int, sys.argv[2].split(',')):
            frame(f).write_to_png(os.path.join(HERE, 'out', f'foto_{f:04d}.png'))
        sys.exit()
    parts = 4; step = math.ceil(N / parts)
    jobs = [(i * step, min(N, (i + 1) * step), os.path.join(HERE, 'out', f'seg{i}.mp4')) for i in range(parts)]
    with Pool(parts) as pool: segs = pool.map(render_range, jobs)
    lst = os.path.join(HERE, 'out', 'segs.txt')
    open(lst, 'w').write(''.join(f"file '{s}'\n" for s in segs))
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', os.path.join(HERE, 'out', 'video_mudo.mp4')], check=True)
    print('frames', N)
