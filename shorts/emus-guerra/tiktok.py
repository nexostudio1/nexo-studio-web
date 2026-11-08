# Montaje TikTok, paso 2: toma el render (out/video_mudo.mp4), lo re-cronometra con out/tiktok_mapa.json y le pone:
#  - gancho: el emú del final (al revés) con "ESTE PÁJARO LE GANÓ UNA GUERRA A AUSTRALIA" -> el bucle empalma solo
#  - zooms de golpe en las palabras fuertes, temblor en cada ráfaga, golpe + destello en el atasco
#  - subtítulos palabra a palabra con las palabras clave "seleccionadas con el ratón"
#  - reto final para comentarios: ¿EQUIPO SOLDADOS o EQUIPO EMÚ?
# Uso: python tiktok.py  ->  out/short_emus_tiktok.mp4 (1080x1920) y out/short_emus_tiktok_movil.mp4 (720x1280)
import json, subprocess, math, random
import numpy as np
from PIL import Image, ImageDraw
import subtitulos as SUB

M = json.load(open("out/tiktok_mapa.json"))
FPS, COLD, N = M["fps"], M["cold"], M["n_out"]
W, H = 1080, 1920
A_T = [a[0] for a in M["anchors"]]; A_F = [a[1] for a in M["anchors"]]
WD = M["words"]
src_of = lambda t: (1451 - int(round(t * FPS))) if t < COLD else int(round(float(np.interp(t, A_T, A_F))))
out_of = lambda f: float(np.interp(f, A_F, A_T))

# ---------------- subtítulos (palabras de la toma de ElevenLabs) ----------------
FIX = {16: "20.000", 46: "disparan…", 85: "emú", 115: "emú.", 123: "ellos.", 127: "bando", 89: "km", 10: "¿Y"}
SKIP = {17}
KEY = {6, 9, 11, 16, 18, 22, 31, 36, 38, 39, 40, 44, 45, 49, 57, 58, 62, 71, 72, 77, 80, 88, 89, 90, 91, 95, 106, 112, 113, 114, 115, 123, 127}
BREAK = {10, 12, 16, 26, 35, 41, 46, 47, 55, 63, 66, 68, 73, 78, 83, 92, 99, 105, 107, 112, 116, 119, 124}
NOBREAK = {115}
pages, cur = [], []
for i, w in enumerate(WD):
    if i in SKIP: continue
    txt = FIX.get(i, w["w"])
    if txt.lower().startswith("emús"): txt = txt.lower()
    e = WD[i + 1]["e"] if i + 1 in SKIP else w["e"]
    if cur and i not in NOBREAK and (i in BREAK or len(cur) >= 3 or cur[-1]["txt"][-1] in ".,?:…"): pages.append(cur); cur = []
    cur.append({"txt": txt, "s": w["s"] - 0.04, "e": e, "kw": i in KEY})
pages.append(cur)
for i, p in enumerate(pages):
    p_end = pages[i + 1][0]["s"] if i + 1 < len(pages) else N / FPS
    for w in p: w["page_end"] = min(p_end, p[-1]["e"] + 1.2)
SUB.pages = pages

# ---------------- textos grandes (gancho y reto final), con el mismo estilo de selección ----------------
BIG = SUB.ImageFont.truetype("/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf", 84)
def banner(img, lines, y0, t_in, t, sel_words):
    d = ImageDraw.Draw(img); k = min(1, max(0, (t - t_in) / 0.18)); s = 0.82 + 0.18 * (1 - (1 - k) ** 3)
    if k <= 0: return
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0)); ld = ImageDraw.Draw(layer)
    for li, line in enumerate(lines):
        words = line.split(" "); ws = [BIG.getlength(w) for w in words]; gap = 24
        tot = sum(ws) + gap * (len(words) - 1); x = (W - tot) / 2; y = y0 + li * 104
        for w, ww in zip(words, ws):
            if w in sel_words:
                u = min(1, max(0, (t - t_in - 0.15) / 0.25)); u = 1 - (1 - u) ** 3
                ld.rectangle([x - 10, y - 4, x - 10 + (ww + 20) * u, y + 100], fill=(52, 120, 246, 240))
                ld.text((x, y), w, font=BIG, fill=(255, 255, 255, 255))
            else:
                ld.text((x, y), w, font=BIG, fill=(255, 255, 255, 255), stroke_width=7, stroke_fill=(16, 10, 22, 255))
            x += ww + gap
    if s < 0.999:
        bb = layer.getbbox()
        if bb:
            c = layer.crop(bb); c = c.resize((max(1, int(c.width * s)), max(1, int(c.height * s))))
            layer = Image.new("RGBA", (W, H), (0, 0, 0, 0)); layer.alpha_composite(c, (int((bb[0] + bb[2]) / 2 - c.width / 2), int((bb[1] + bb[3]) / 2 - c.height / 2)))
    a = layer.split()[3].point(lambda v: int(v * k)); layer.putalpha(a)
    img.alpha_composite(layer)

# ---------------- zooms, temblor, destellos ----------------
PUNCH = [WD[i]["s"] for i in (11, 16, 38, 46, 57, 71, 80, 88, 106, 112, 127)]
T_END = (N - 1) / FPS
FIRE = [(out_of(509), out_of(545)), (out_of(738), out_of(783))]
T_JAM = out_of(784)
def zoom_at(t):
    z = 1.0
    for p in PUNCH:
        d = t - p
        if d >= 0: z += 0.075 * (d / 0.09 if d < 0.09 else math.exp(-(d - 0.09) / 0.33))
    if t < COLD: z += 0.12 * (1 - t / COLD) ** 2              # el gancho se abre...
    z += 0.12 * max(0, (t - (T_END - 1.3)) / 1.3) ** 2          # ...y el final se cierra igual: bucle sin salto
    return min(z, 1.2)
def shake_at(t, k):
    a = 0.0
    for t0, t1 in FIRE:
        if t0 <= t < min(t1, T_JAM): a = 9
    if t >= T_JAM: a = max(a, 28 * math.exp(-(t - T_JAM) / 0.22))
    if a < 0.5: return 0, 0
    rnd = random.Random(k); return (1 if k % 2 else -1) * a * (0.6 + 0.4 * rnd.random()), a * (rnd.random() - 0.5)
def flash_at(t):
    f = 0.0
    for t0, amp in ((COLD, 0.55), (T_JAM, 0.6)):
        if 0 <= t - t0 < 0.1: f = max(f, amp * (1 - (t - t0) / 0.1))
    for t0, t1 in FIRE:  # chispazo suave en cada fogonazo
        if t0 <= t < min(t1, T_JAM) and int(t * FPS) % 3 == 0: f = max(f, 0.08)
    return f

# ---------------- cuadros ----------------
def reader(path):
    p = subprocess.Popen(["ffmpeg", "-loglevel", "error", "-i", path, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
    i = 0
    while True:
        b = p.stdout.read(W * H * 3)
        if len(b) < W * H * 3: return
        yield i, b; i += 1
tail = {}
for i, b in reader("out/video_mudo.mp4"):  # primera pasada: guardar los cuadros del final para el gancho
    if i >= 1451 - int(COLD * FPS) - 2: tail[i] = b
rd = reader("out/video_mudo.mp4"); cur_i, cur_b = next(rd)

enc = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
    "-i", "out/mezcla_tiktok.wav", "-map", "0:v", "-map", "1:a", "-c:v", "libx264", "-preset", "medium", "-crf", "21", "-pix_fmt", "yuv420p",
    "-movflags", "+faststart", "-c:a", "aac", "-ac", "2", "-ar", "48000", "-b:a", "192k", "-shortest", "out/short_emus_tiktok.mp4"], stdin=subprocess.PIPE)
for k in range(N):
    t = k / FPS; j = src_of(t)
    if t < COLD: b = tail[j]
    else:
        while cur_i < j: cur_i, cur_b = next(rd)
        b = cur_b
    img = Image.frombuffer("RGB", (W, H), b, "raw", "RGB", 0, 1)
    z = zoom_at(t); dx, dy = shake_at(t, k)
    if dx or dy: z = max(z, 1.04)
    if z > 1.0005 or dx or dy:
        cw, ch = W / z, H / z; cx, cy = W / 2 + dx, H / 2 + dy
        img = img.crop((cx - cw / 2, cy - ch / 2, cx + cw / 2, cy + ch / 2)).resize((W, H), Image.BILINEAR)
    img = img.convert("RGBA")
    fl = flash_at(t)
    if fl > 0: img = Image.blend(img, Image.new("RGBA", (W, H), (255, 250, 235, 255)), fl)
    if t < COLD + 1.0: banner(img, ["ESTE PÁJARO", "LE GANÓ UNA GUERRA", "A AUSTRALIA"], 880, -0.5, t, {"PÁJARO"})
    if t > A_T[-2] + 1.2: banner(img, ["¿EQUIPO SOLDADOS", "O EQUIPO EMÚ?"], 930, WD[124]["s"], t, {"EMÚ?"})
    if t >= COLD or True: img.alpha_composite(SUB.frame(t))
    enc.stdin.write(img.convert("RGB").tobytes())
enc.stdin.close(); enc.wait()
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", "out/short_emus_tiktok.mp4", "-vf", "scale=720:1280", "-c:v", "libx264", "-preset", "slow", "-crf", "27",
    "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-c:a", "copy", "out/short_emus_tiktok_movil.mp4"], check=True)
print("ok", N, "cuadros")
