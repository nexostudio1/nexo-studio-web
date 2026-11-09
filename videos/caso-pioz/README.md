# El chat del horror (Pioz, 2016) — short vertical 9:16, 62 s

Short ilustrado para YouTube Shorts sobre un caso real con sentencia firme.
Contado con contención: sin imágenes reales, sin mensajes reales del chat, sin violencia en pantalla.
La interfaz de chat es genérica (ninguna marca).

- **Vídeo final:** `caso-pioz.mp4` (1080×1920, 30 fps, H.264 + AAC, −14 LUFS)
- **Escenas:** `escena.html` (Canvas 2D) · **Tiempos, subtítulos y efectos:** `timeline.json`
- **Sonido:** `audio.py` (sintetizado, sin samples externos)

## Hechos usados (contrastados con prensa)

- Crimen: 17 de agosto de 2016, Pioz (Guadalajara). Cuatro víctimas de la misma familia, dos de ellas menores.
- El autor, de 19 años, lo fue contando por chat a un amigo en Brasil.
- Los cuerpos se hallaron un mes después (17–18 de septiembre) tras avisar los vecinos del olor.
- Las imágenes llegaron a un tercero, que las entregó a la policía brasileña.
- El autor se entregó el 19 de octubre de 2016.
- Tribunal Supremo, mayo de 2020: tres penas de prisión permanente revisable más 25 años.

## Regenerar

```bash
python3 audio.py && node render.js
ffmpeg -i build/video_mudo.mp4 -i build/audio.wav -map 0:v -map 1:a -c:v libx264 -preset slow -crf 22 \
  -maxrate 6000k -bufsize 12000k -pix_fmt yuv420p -af "loudnorm=I=-14:TP=-1.5:LRA=11" \
  -c:a aac -b:a 192k -movflags +faststart -shortest caso-pioz.mp4
```
