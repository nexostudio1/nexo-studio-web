# Montaje TikTok, paso 1: mapa de tiempos.
# La voz de ElevenLabs manda: cada toma del render empieza 0.1 s antes de su frase (el vídeo se acelera o frena
# por tramos para encajar). Delante va un gancho de 1.2 s con el emú del final (los últimos cuadros al revés),
# así el último cuadro del vídeo es igual al primero y el bucle empalma solo.
# Escribe out/tiktok_mapa.json y public/voz/voz_tiktok.wav
import json, subprocess
import numpy as np

FPS, SR, SRC_LAST = 30, 48000, 1451
W = json.load(open("public/voz/elevenlabs/palabras_original.json"))
FRASES = [0, 12, 26, 41, 55, 73, 83, 99, 116]          # primera palabra de cada frase (índices en W)
SHOT0 = [0, 126, 296, 445, 618, 815, 959, 1124, 1323]   # cuadro del render donde empieza su toma
PADS = {6: 0.5, 7: 0.3, 8: 0.5}                          # pausa extra ANTES de la frase k (s)
COLD = 1.2                                              # gancho

raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", "public/voz/elevenlabs/original.mp3", "-ar", str(SR), "-ac", "1", "-f", "f32le", "-"], capture_output=True, check=True).stdout
el = np.frombuffer(raw, dtype=np.float32)
cuts = []  # (tiempo en la toma original donde se mete la pausa, segundos)
for k, pad in PADS.items():
    i = FRASES[k]; cuts.append(((W[i - 1]["e"] + W[i]["s"]) / 2, pad))
def el2out(t):
    return t + sum(p for c, p in cuts if c < t)
parts, last = [], 0
for c, p in sorted(cuts):
    parts += [el[int(last * SR):int(c * SR)], np.zeros(int(p * SR), np.float32)]; last = c
parts.append(el[int(last * SR):])
voz = np.concatenate(parts)
v_end = el2out(W[-1]["e"])
tend = v_end + 0.7
anchors = [[COLD, 0]] + [[round(el2out(W[FRASES[k]]["s"]) - 0.1, 3), SHOT0[k]] for k in range(1, 9)] + [[round(tend, 3), SRC_LAST]]
# cifras: «9.860» en «diez mil balas» (palabra 109) y «986» en «diez por cada emú» (palabra 112)
anchors += [[round(el2out(W[109]['s']) - 0.05, 3), 1249], [round(el2out(W[112]['s']) - 0.05, 3), 1283]]
anchors.sort()
n_out = int(round(tend * FPS)) + 1
voz = np.concatenate([voz, np.zeros(max(0, int(n_out / FPS * SR) - len(voz)), np.float32)])[: int(n_out / FPS * SR)]
voz /= np.max(np.abs(voz)) / 0.95
import wave
w = wave.open("public/voz/voz_tiktok.wav", "wb"); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((voz * 32767).astype(np.int16).tobytes()); w.close()
words = [{"w": x["w"], "s": round(el2out(x["s"]), 3), "e": round(el2out(x["e"]), 3)} for x in W]
json.dump({"fps": FPS, "cold": COLD, "n_out": n_out, "anchors": anchors, "words": words}, open("out/tiktok_mapa.json", "w"), ensure_ascii=False, indent=0)
for (t0, f0), (t1, f1) in zip(anchors, anchors[1:]):
    print(f"salida {t0:6.2f}-{t1:6.2f}s  render {f0:4d}-{f1:4d}  velocidad x{(f1 - f0) / FPS / (t1 - t0):.2f}")
print("cuadros de salida:", n_out, f"({n_out / FPS:.1f} s)")
