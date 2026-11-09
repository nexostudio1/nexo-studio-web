# Shorts para YouTube — reglas de producción

Flujo fijo. No reanalizar el proyecto: partir siempre de `videos/caso-pioz/` como base.

## Base reutilizable (`videos/caso-pioz/`)
- `render.js`: captura con Playwright → `build/video_mudo.mp4`. No tocar. `--stills t1,t2` para pruebas.
- `escena.html`: motor Canvas 2D. Reutilizar tal cual: `drawPhone` (chat genérico censurado), `bust` (personaje),
  `walker`, `house`, `nightSky`, `moon`, `stampText`, `drawCap` (subtítulos palabra a palabra), `post`, `renderAt`.
- `audio.py`: música y efectos sintetizados + voz por frases (`voice.segments` en `timeline.json`) con ducking.
- `timeline.json`: escenas, subtítulos (`caps`), efectos (`sfx`) y voz. Es lo que más cambia entre vídeos.

## Vídeo nuevo
1. Copiar la carpeta base a `videos/<nombre>/`; escribir `timeline.json` y solo las escenas nuevas.
2. Guion para ElevenLabs (números en letra, `<break>` en cambios de escena, ~2–3 palabras/s). La voz la genera el usuario.
3. Voz: cortar con `silencedetect`, una frase por escena, música −8 dB bajo la voz, −14 LUFS.
4. Comprobar fotogramas en UNA sola hoja de contactos; corregir solo lo que falle; un único render final.
5. Entregar `<nombre>.mp4` (versiones `-v2`, `-v3` sin pisar) y resumir en cinco líneas como máximo.

## Estilo
- Vertical 1080×1920, 30 fps. 2D ilustrado con sombras (sombra proyectada y de contacto en personajes y objetos).
- Gancho en el primer segundo; final que invite a comentar o a una parte 2.
- Subtítulos Anton en mayúsculas, palabra clave en ámbar, a ~73 % de altura.
- Casos reales: hechos contrastados con fuentes, sin imágenes ni mensajes reales, sin violencia, personajes sin rostro.
- Sin logos ni marcas. MP4 < 100 MB.
