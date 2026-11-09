# Caso 3:17 — short vertical (9:16, 75 s)

Documental criminal ilustrado, en sepia, azul oscuro y negro. No hay sangre, ni violencia, ni caras reales, ni logos.

- **Vídeo final:** `caso-317.mp4` (1080×1920, 30 fps, H.264 + AAC, −14 LUFS)
- **Escenas:** `escena.html`, todas dibujadas con Canvas 2D
- **Tiempos de escenas, textos y efectos:** `timeline.json`
- **Música y efectos:** `audio.py`, sintetizados con numpy y scipy, sin samples externos
- **Fuentes:** `fonts/`, todas con licencia OFL (Playfair Display, Special Elite, Homemade Apple y Caveat)

## Escaleta

| Tiempo | Escena | Texto en pantalla |
|---|---|---|
| 0–14 s | Taller de relojería, reloj parado a las 3:17 | «3:17», «Caso cerrado» (sello) |
| 14–25 s | Caja con el mismo reloj, mujer joven de espaldas en silueta | «20 años después» |
| 25–33 s | Nota manuscrita: «El reloj no se paró solo. Ábrelo.» | «No fue el corazón» |
| 33–42 s | Mecanismo abierto con las agujas dobladas | «Las agujas fueron forzadas» |
| 42–50 s | Libreta del taller con la anotación «3:17 — R.M.» | «R.M.» |
| 50–57 s | Lupa sobre la cuerda; en el tambor aparece grabado «R.M.» | — |
| 57–66 s | Siluetas de dos personas discutiendo en el taller; el reloj de pared se para a las 3:17 | «La coartada era falsa» |
| 66–75 s | El reloj vuelve a funcionar | «¿Parte 2?» |

## Volver a generarlo

```bash
python3 audio.py                     # crea build/audio.wav
node render.js                       # crea build/video_mudo.mp4 (usa el Chromium de Playwright)
ffmpeg -i build/video_mudo.mp4 -i build/audio.wav -map 0:v -map 1:a \
  -c:v libx264 -preset slow -crf 23 -tune grain -maxrate 4500k -bufsize 9000k -pix_fmt yuv420p \
  -af "loudnorm=I=-14:TP=-1.5:LRA=11" -c:a aac -b:a 192k -movflags +faststart -shortest caso-317.mp4
node render.js --stills 1,30,60      # fotogramas sueltos en stills/ para revisar
```
