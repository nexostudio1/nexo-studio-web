# Voz de guía (Piper, es_MX-claude-high) con ritmo por frase. Se puede sustituir por una toma de ElevenLabs
# con voz_elevenlabs.py (encaja cada frase en su hueco). Escribe public/voz/voz.wav y public/voz/frases.json.
import subprocess, wave, json, sys
import numpy as np
VOICE = sys.argv[1]
GAP = 0.1
SPEED = 0.86
# (texto, length_scale, pausa después en s); "||" separa frases (cada frase arranca en su cuadro del vídeo)
LINES = [
 [("¿Sabías que Australia le declaró la guerra a unos pájaros...", 0.9, 0.18), ("y perdió?", 1.0, 0)],
 [("Mil novecientos treinta y dos, oeste de Australia.", 0.88, 0.16), ("Veinte mil emús se están comiendo el trigo de los granjeros.", 0.86, 0)],
 [("El gobierno manda al mayor Meredith con dos soldados, dos ametralladoras...", 0.86, 0.1), ("y diez mil balas.", 0.95, 0)],
 [("Primer día: ven cincuenta emús.", 0.88, 0.14), ("Disparan...", 0.95, 0.12), ("y los emús salen corriendo, cada uno para un lado.", 0.84, 0)],
 [("Segundo intento: mil emús se acercan a beber a una presa.", 0.86, 0.12), ("Esta vez sí.", 0.95, 0.1), ("Abren fuego...", 0.95, 0.16), ("y la ametralladora se atasca.", 1.02, 0)],
 [("Por suerte, no hubo ni un soldado herido.", 0.88, 0.16), ("Por desgracia, tampoco muchos emús.", 0.92, 0)],
 [("Fíjate: un emú corre a unos cincuenta kilómetros por hora, más rápido que un coche por tu barrio.", 0.85, 0)],
 [("Meredith dijo que aguantaban las balas como si fueran tanques.", 0.86, 0.14), ("Al final gastó casi diez mil balas:", 0.88, 0.12), ("diez por cada emú.", 0.98, 0)],
 [("Y el trigo...", 1.0, 0.12), ("se lo siguieron comiendo ellos.", 0.9, 0.22), ("¿Tú en qué bando habrías estado?", 0.9, 0)],
]
def synth(t, ls):
    subprocess.run(["python3", "-m", "piper", "-m", VOICE, "--length-scale", str(round(ls * SPEED, 3)), "--noise-scale", "0.8", "--noise-w-scale", "1.05", "-f", "ph.wav"], input=t.encode(), check=True, capture_output=True)
    w = wave.open("ph.wav"); r = w.getframerate(); a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
    i = np.where(np.abs(a) > 0.01)[0]; return a[max(0, i[0] - 200): i[-1] + 400], r
out, info, t = [], [], 0.0
for L in LINES:
    t0 = t
    for txt, ls, pause in L:
        a, sr = synth(txt, ls); out += [a, np.zeros(int(pause * sr), np.float32)]; t += len(a) / sr + pause
    info.append({"text": " ".join(x[0] for x in L), "s": round(t0, 3), "e": round(t, 3), "f0": round(t0 * 30), "f1": round(t * 30)})
    out.append(np.zeros(int(GAP * sr), np.float32)); t += GAP
y = np.concatenate(out); y /= np.max(np.abs(y)) / 0.95
w = wave.open("public/voz/voz.wav", "wb"); w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((y * 32767).astype(np.int16).tobytes()); w.close()
json.dump(info, open("public/voz/frases.json", "w"), ensure_ascii=False, indent=1)
for x in info: print(x["f0"], x["f1"], x["text"][:60])
print("total", round(t, 2), "s")
