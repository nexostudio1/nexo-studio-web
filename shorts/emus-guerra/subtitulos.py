# Subtítulos palabra a palabra encima del render: blancos, y las palabras clave "seleccionadas con el ratón"
# (rectángulo azul de selección que se arrastra de izquierda a derecha, con el cursor de texto en el borde).
# Uso: python subtitulos.py out/video_mudo.mp4 out/mezcla.wav out/short_ia_7_anos.mp4
import json, subprocess, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter

FPS, N, W, H = 30, 1452, 1080, 1920
WH = json.load(open("public/voz/palabras.json"))
# texto en pantalla por palabra (corrige lo que el reconocimiento oyó mal y une "10" + ".000"); "|" fuerza página nueva
FIX = {0: "¿Sabías", 11: "perdió?", 16: "20.000", 22: "trigo", 38: "10.000", 71: "abren fuego…", 90: "Fíjate:", 102: "que", 120: "gastó", 122: "10.000", 129: "Y", 100: "más", 101: "rápido", 128: "emú.",
       131: "trigo…", 132: "se", 137: "¿Tú", 141: "habrías", 142: "estado?", 57: "Segundo", 77: "Por", 85: "Por", 108: "Meredith"}
SKIP = {17, 39, 123}  # ".000" ya unido a su número
KEY = {122, 124, 6, 9, 11, 16, 18, 22, 31, 36, 38, 40, 44, 45, 51, 59, 60, 67, 75, 76, 84, 87, 96, 97, 98, 99, 104, 117, 125, 126, 127, 128, 136, 140}
NOBREAK = {128}
BREAK_BEFORE = {12, 26, 41, 57, 68, 77, 85, 90, 108, 118, 129, 137}
pages, cur = [], []
for i, w in enumerate(WH):
    if i in SKIP: continue
    txt = FIX.get(i, w["w"])
    if txt == "Emús" or txt == "Emús,": txt = txt.lower()
    e = WH[i + 1]["e"] if i + 1 in SKIP else w["e"]
    if cur and i not in NOBREAK and (i in BREAK_BEFORE or len(cur) >= 3 or cur[-1]["txt"][-1] in ".,?:…"): pages.append(cur); cur = []
    cur.append({"txt": txt, "s": w["s"] - 0.04, "e": e, "kw": i in KEY})
pages.append(cur)
for i, p in enumerate(pages):
    p_end = pages[i + 1][0]["s"] if i + 1 < len(pages) else min(N / FPS, p[-1]["e"] + 0.8)
    for w in p: w["page_end"] = p_end

FONT = ImageFont.truetype("/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf", 92)
SEL, SEL_EDGE = (52, 120, 246, 235), (150, 190, 255, 255)  # azul de selección del sistema
Y0, MAXW, GAP, LH = 1330, 960, 26, 122

def layout(words):
    lines, line, lw = [], [], 0
    for w in words:
        ww = FONT.getlength(w["txt"])
        if line and lw + GAP + ww > MAXW: lines.append(line); line, lw = [], 0
        line.append((w, ww)); lw += (GAP if len(line) > 1 else 0) + ww
    lines.append(line)
    out = []
    for li, line in enumerate(lines):
        tot = sum(x[1] for x in line) + GAP * (len(line) - 1); x = (W - tot) / 2; y = Y0 + li * LH - (len(lines) - 1) * LH / 2
        for w, ww in line: out.append((w, x, y, ww)); x += ww + GAP
    return out

def frame(t):
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    page = next((p for p in pages if p[0]["s"] <= t < p[0]["page_end"]), None)
    if page is None: return img
    lay = layout(page)
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0)); sd = ImageDraw.Draw(shadow)
    sel = Image.new("RGBA", (W, H), (0, 0, 0, 0)); sl = ImageDraw.Draw(sel)
    txt = Image.new("RGBA", (W, H), (0, 0, 0, 0)); td = ImageDraw.Draw(txt)
    cursor = None
    for i, (w, x, y, ww) in enumerate(lay):
        if t < w["s"]: continue
        k = min(1, (t - w["s"]) / 0.12)  # entrada: sube 14 px y aparece
        dy = 14 * (1 - k) ** 2; a = int(255 * k)
        asc, desc = FONT.getmetrics()
        if w["kw"]:
            # la selección se arrastra sobre la palabra en ~0.22 s; si la siguiente también es clave, cubre el espacio
            u = min(1, (t - w["s"]) / 0.22); u = 1 - (1 - u) ** 3
            nxt = lay[i + 1] if i + 1 < len(lay) else None
            joined = nxt is not None and nxt[0]["kw"] and abs(nxt[2] - y) < 1
            x0, x1 = x - 10, x + ww + (GAP if joined else 10)
            xr = x0 + (x1 - x0) * u
            top, bot = y - 6, y + asc + desc - 2
            sl.rectangle([x0, top, xr, bot], fill=SEL)
            if u < 1 or (not joined and t - w["s"] < 0.45): cursor = (xr, top - 4, bot + 4)
        sd.text((x + 4, y + 7 + dy), w["txt"], font=FONT, fill=(0, 0, 0, int(a * 0.55)))
        td.text((x, y + dy), w["txt"], font=FONT, fill=(255, 255, 255, a), stroke_width=0 if w["kw"] else 5, stroke_fill=(16, 10, 22, a))
    img.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(6)))
    img.alpha_composite(sel)
    img.alpha_composite(txt)
    if cursor:  # cursor de texto (I-beam) en el borde de la selección
        cx, c0, c1 = cursor; d = ImageDraw.Draw(img)
        for col, wd in (((0, 0, 0, 200), 7), ((255, 255, 255, 255), 3)):
            d.line([(cx, c0), (cx, c1)], fill=col, width=wd)
            d.line([(cx - 9, c0), (cx + 9, c0)], fill=col, width=wd); d.line([(cx - 9, c1), (cx + 9, c1)], fill=col, width=wd)
    return img

if __name__ == "__main__":
    vid, aud, out = sys.argv[1:4]
    ff = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-i", vid, "-f", "rawvideo", "-pix_fmt", "rgba", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
        "-i", aud, "-filter_complex", "[0:v][1:v]overlay=0:0:format=auto[v]", "-map", "[v]", "-map", "2:a:0",
        "-c:v", "libx264", "-preset", "slow", "-crf", "22", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-c:a", "aac", "-ac", "2", "-ar", "48000", "-b:a", "192k", "-shortest", out], stdin=subprocess.PIPE)
    for f in range(N): ff.stdin.write(frame(f / FPS).tobytes())
    ff.stdin.close(); ff.wait(); print("ok", out)
