# Subtítulos palabra a palabra encima del render: blancos, y las palabras clave "seleccionadas con el ratón"
# (rectángulo azul de selección que se arrastra de izquierda a derecha, con el cursor de texto en el borde).
# Uso: python subtitulos.py out/video_mudo.mp4 out/mezcla.wav out/short_ia_7_anos.mp4
import json, subprocess, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter

FPS, N, W, H = 30, 686, 1080, 1920
WH = json.load(open("public/voz/palabras_whisper.json"))
# (texto, primer índice whisper, último índice whisper, palabra clave)  ·  "|" = nueva página
TOK = [
    ("Olvida", 0, 0, 0), ("a", 1, 1, 0), ("los", 2, 2, 0), "|", ("robots", 3, 3, 1), ("asesinos", 4, 4, 1), "|",
    ("La", 5, 5, 0), ("inteligencia", 6, 6, 0), ("artificial", 7, 7, 0), "|", ("no", 8, 8, 0), ("necesita", 9, 9, 0), ("balas", 10, 10, 1), "|",
    ("Le", 11, 11, 0), ("bastan", 12, 12, 0), ("7", 13, 13, 1), ("años", 14, 14, 1), "|",
    ("Año", 15, 15, 0), ("1:", 16, 16, 0), ("te", 17, 17, 0), ("quita", 18, 18, 0), "|", ("las", 19, 19, 0), ("tareas", 20, 20, 1), ("pequeñas", 21, 21, 1), "|",
    ("Año", 22, 22, 0), ("3:", 23, 23, 0), ("tu", 24, 24, 0), ("empleo", 25, 25, 1), "|",
    ("El", 26, 26, 0), ("FMI", 27, 27, 0), ("ve", 28, 28, 0), ("expuesto", 29, 29, 0), "|", ("el", 30, 30, 0), ("40 %", 31, 32, 1), ("del", 33, 33, 0), ("mundo", 34, 34, 0), "|",
    ("Año", 35, 35, 0), ("5:", 36, 36, 0), "|", ("decide", 37, 37, 0), ("qué", 38, 38, 1), ("ves", 39, 39, 1), "|", ("y", 40, 40, 0), ("qué", 41, 41, 1), ("crees", 42, 42, 1), "|",
    ("Año", 43, 43, 0), ("7.", 44, 44, 0), "|", ("Nadie", 45, 45, 0), ("la", 46, 46, 0), ("apaga", 47, 47, 1), "|", ("porque", 48, 48, 0), ("nadie", 49, 49, 0), ("sabe", 50, 50, 0), "|",
    ("vivir", 51, 51, 0), ("sin", 52, 52, 1), ("ella", 53, 53, 1), "|",
    ("Por", 54, 54, 0), ("suerte,", 55, 55, 0), "|", ("aún", 56, 56, 0), ("hay", 57, 57, 0), ("tiempo", 58, 58, 1), "|",
    ("Por", 59, 59, 0), ("desgracia,", 60, 60, 0), "|", ("nadie", 61, 61, 0), ("lo", 62, 62, 0), ("toma", 63, 63, 0), ("en", 64, 64, 1), ("serio", 65, 65, 1), "|",
    ("Ah…", 66, 66, 0), "|", ("y", 67, 67, 0), ("la", 68, 68, 0), ("IA", 69, 69, 1), "|", ("me", 70, 70, 0), ("pide", 71, 71, 0), "|",
    ("que", 72, 72, 0), ("te", 73, 73, 0), ("diga", 74, 74, 0), ("algo:", 75, 75, 1),
]
pages, cur = [], []
for t in TOK:
    if t == "|": pages.append(cur); cur = []
    else: cur.append({"txt": t[0], "s": WH[t[1]]["s"] - 0.04, "e": WH[t[2]]["e"], "kw": bool(t[3])})
pages.append(cur)
for i, p in enumerate(pages):  # cada página se queda hasta que empieza la siguiente (o 0.5 s tras su última palabra)
    p_end = pages[i + 1][0]["s"] if i + 1 < len(pages) else N / FPS
    for w in p: w["page_end"] = min(p_end, p[-1]["e"] + 0.6) if i + 1 == len(pages) else p_end

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
        "-c:v", "libx264", "-preset", "slow", "-crf", "22", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-c:a", "aac", "-b:a", "160k", "-shortest", out], stdin=subprocess.PIPE)
    for f in range(N): ff.stdin.write(frame(f / FPS).tobytes())
    ff.stdin.close(); ff.wait(); print("ok", out)
