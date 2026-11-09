---
name: shorts-animados-2d
description: Crea shorts verticales animados en 2D (Remotion + SVG/Canvas2D) con sombras, personajes expresivos y coloridos, movimiento natural y sincronización labial en español. Versión 2D de shorts-animados-3d. Úsala cuando pidan un short/Reel/TikTok animado en 2D, dibujos animados con voz, personajes que hablan o labios sincronizados.
---

# Shorts animados 2D (Remotion + sincronización labial)

Versión 2D de `shorts-animados-3d` (Crea con LuisPa, basada en claude-animated-shorts de Mr omi, MIT).
Se conserva TODO el proceso que no depende del 3D: tema y datos, guion con gancho, voz con tiempos por palabra,
sonido, medición, render y arreglo de MP4. Mira esa skill para esas partes; aquí solo está lo que cambia.
Se cambia three.js por dibujo 2D (SVG o Canvas2D) dentro de Remotion. Sigue 1080x1920, 30 fps.

## Qué cambia respecto al 3D
| 3D | 2D |
|---|---|
| Cámara con `pos/look/fov` | Cámara 2D: `{f, x, y, zoom, rot}` con deslizamientos smootherstep; parallax por capas |
| Luces y sombreado 3D | Luz falsa: sombra de contacto, sombra proyectada, dos tonos y luz de borde |
| Cabezas de frijol 3D en atlas | Personajes en capas (rig 2D) con cara intercambiable |
| Tinta en post | Contorno ciruela grueso variable en el propio dibujo |

## Reglas del estilo 2D
- **Colorido:** paleta por escena de 5–6 colores saturados + 1 de acento. Fondos más suaves que los personajes para que
  el personaje destaque. Nunca grises apagados. Sombras con tinte frío (violeta/azul), nunca negro ni gris.
- **Sombras (3 capas, siempre):**
  1. Sombra de contacto: elipse oscura (opacidad .35, desenfoque 6 px) bajo los pies, que se achica al saltar.
  2. Sombra proyectada: la silueta del personaje aplastada (scaleY .25–.4) y torcida (skewX) hacia el lado contrario a la luz.
  3. Sombreado interno de dos tonos (cel): una forma oscura recortada dentro de cada pieza (`clipPath`) en el lado opuesto
     a la luz, más una línea de luz de borde fina en el lado de la luz.
- **Personajes expresivos:** cabeza grande (3 a 3.5 cabezas de alto), ojos grandes con brillo, cejas independientes.
  Librería mínima de caras: neutral, feliz, triste, enojado, sorprendido, asustado, pensando, gritando, burlón.
  Cada línea del guion tiene su cara; el cambio de cara cae 0–3 cuadros antes de la palabra clave.
  Parpadeo cada 0.5–2.3 s (3 cuadros), cejas que suben en preguntas y dato clave, pupilas que miran al objeto de la escena.
- **Movimiento natural (los 12 principios, resumidos):**
  - Anticipación: antes de saltar, agacharse 4–6 cuadros; antes de señalar, echar el brazo atrás.
  - Aplastar y estirar: en saltos y golpes, scaleY 1.15 / scaleX .9 al estirar y lo inverso al caer. Conserva el volumen.
  - Seguimiento y solape: pelo, orejas, capas, brazos y accesorios llegan 2–5 cuadros tarde (resorte amortiguado,
    no `linear`). Nada se mueve todo a la vez.
  - Easing siempre: entradas y salidas lentas (smootherstep). Prohibido `linear` salvo en rotaciones continuas.
  - Respiración: el torso sube y baja 2–3 px cada ~2 s aunque esté quieto; la cabeza se balancea ±1.5°.
  - Mientras habla, la cabeza se mueve con el ritmo de la voz (un cabeceo suave en cada sílaba acentuada) y las manos
    gesticulan. Un personaje que habla con el cuerpo congelado se ve muerto.
  - Arcos: las manos y la cabeza siguen curvas, no rectas.
  - La cámara nunca se queda quieta: zoom lento 1.00→1.06 en cada pausa. Meta: cámara en movimiento en más del 80 % de los cuadros.
- **Voz y subtítulos:** igual que en 3D (una voz pareja, 3.2–3.8 palabras/s, sin subtítulos en la versión principal).

## Los cinco pilares del look (obligatorios en cada short)
### 1. Sombras dinámicas (pies, ropa y fondo)
- **Debajo de los pies:** elipse de contacto (opacidad .35, desenfoque 6 px). Al saltar se achica y se aclara según la altura; al caer se aplasta.
- **Sobre la ropa:** sombras de forma recortadas con `clipPath` dentro de cada pieza: la cabeza proyecta sombra en el cuello y el pecho,
  el brazo sobre el torso, el sombrero sobre la frente. Su dirección y color salen de la luz de la escena (`lights2d.ts`) y se mueven con la pose.
- **Detrás de los personajes:** sombra proyectada en el suelo y en la pared del fondo: la silueta aplastada (`flat`) y torcida (`skew`) hacia el lado
  contrario a la luz; cuanto más cerca de la pared, más nítida. Si pasa una luz móvil (faro, relámpago), la sombra gira con ella.
- Todas las sombras de una escena comparten una sola dirección (`shadowDir`).

### 2. Iluminación cinematográfica según la historia
Plantilla: `plantillas/lights2d.ts` (`MOODS`). Elige el tono por escena y cámbialo con un fundido cuando cambie la emoción.
| Historia | Tono | Luz |
|---|---|---|
| Alegría, comedia, infancia, día | `calido` | #FFD08A, sombras violeta |
| Final feliz, nostalgia | `atardecer` | sol bajo a contraluz, #FFB36B |
| Misterio, tristeza, soledad, tecnología | `azul` | #8FB8FF, sombras azul marino |
| Peligro, enojo, batalla, terror, tensión | `rojo` | #FF4A3D desde atrás/costado, sombras ciruela |
| Secretos, suspenso | `noche` | #6C8CFF, mucho contraste |
Capas de luz sobre el dibujo (de abajo a arriba): color base → sombra tintada (multiply) → luz principal (screen o overlay suave, solo lado iluminado)
→ luz de borde fina (rim) → viñeta ligera → destello opcional. Un contraste rojo/azul entre dos lados se ve cinematográfico en discusiones y persecuciones.
Nunca sombras negras o grises.

### 3. Fondos con profundidad
Mínimo 5 capas, cada una con su velocidad de parallax y desenfoque (`LAYERS`/`BLUR` en `plantillas/camera2d.ts`):
cielo (0.1) · fondo lejano (0.25, desenfoque 6 px, con neblina del color del horizonte) · plano medio (0.55) · suelo y personajes (1.0) ·
primer plano (1.5, desenfoque 12 px: hojas, postes, humo). Las capas lejanas más claras y con menos contraste (perspectiva atmosférica).
Partículas (polvo, brasas, nieve, luciérnagas) en dos capas con velocidades distintas.

### 4. Cámara animada
Plantilla: `plantillas/camera2d.ts` (`camAt`, `follow`, `shake`).
- **Zoom:** acercamiento lento en cada pausa (1.00 → 1.06) y golpe de zoom (1.0 → 1.15 en 4 cuadros) en el dato fuerte.
- **Seguimiento:** `follow` con retraso (lag 8): la cámara llega un poco tarde al personaje que camina o corre.
- **Vibración:** `shake` en impactos, golpes y gritos: cambia de signo cada cuadro y se apaga en 7.
- **Cambios de plano:** cortes solo en saltos grandes (general → primer plano → detalle); el resto, deslizamientos de 18–40 cuadros. Alterna plano general,
  medio y primer plano; en diálogo, plano/contraplano. Fundido de 6 cuadros solo si cambia el lugar o el tiempo.
- La cámara nunca queda quieta más de 12 cuadros.

### 5. Formato vertical 9:16 (Shorts, TikTok, Reels)
- Composición Remotion 1080x1920, 30 fps, duración ≤ 59 s (idealmente 20–45 s). Exporta H.264, CRF 16, AAC; opcional 1440x2560 con `--scale 1.3333`.
- Zona segura: deja libre ~150 px arriba y ~380 px abajo y ~120 px a los lados, donde las apps ponen su interfaz. Los personajes y cualquier cifra en el 60 % central.
- Encuadra pensando en vertical: personajes apilados en profundidad (uno delante y otro detrás), planos de cara y torso, composición alta, no panorámicas.
- Gancho en el primer segundo y bucle final → primer plano.

## Sincronización labial (la parte nueva)
Plantilla probada: `plantillas/lipsync.ts` (español, de grafemas a visemas, sin dependencias).
1. Saca `palabras.json` con tiempos por palabra (`[{word,start,end}]`, en segundos) y corrígelo a mano.
2. `buildTrack(words, 30, totalFrames)` da un visema por cuadro. La boca se adelanta ~1 cuadro al audio (ya viene en la plantilla).
   Con varios personajes, filtra las palabras de cada uno y arma una pista por personaje; los que escuchan quedan en `REST`.
3. 12 visemas: REST, MBP (labios cerrados: m, b, p, v), FV (dientes arriba sobre el labio de abajo), A, E, I, O, U,
   TDLN, SZ, CH, R. Cada uno tiene `open/wide/round/teeth` en `MOUTH`.
4. **No saltes de forma en forma**: interpola los 4 parámetros con un resorte (rigidez ~300, amortiguación ~25) o con
   promedio exponencial de 2 cuadros. Dibuja la boca con un solo `path` cuyos puntos salen de esos parámetros
   (comisuras por `wide`/`round`, labio superior e inferior por `open`, lengua y dientes visibles según `teeth` y `open`).
5. Reglas de calidad: MBP SIEMPRE se ve cerrada (es lo que más delata una mala sincronización); las vocales abren más que las
   consonantes; en silencios >0.25 s vuelve a REST con sonrisa o gesto, no con la boca abierta; los gritos agrandan `open` ×1.3.
6. Para mayor precisión se puede reemplazar el paso 2 por Rhubarb Lip Sync o un alineador forzado y mapear sus formas a los visemas.
7. **Revisión:** saca una tira de 30 cuadros de una frase con MBP y comprueba cuadro a cuadro que la boca se cierre en la m/b/p.

## Proceso
1. **Tema y datos / guion / voz** → pasos 1–3 de `shorts-animados-3d` (gancho en el primer segundo, bucle, ElevenLabs).
2. **Diseño de personajes.** Una hoja por personaje: silueta, paleta (piel, pelo, ropa, acento), 9 caras, 6 poses
   (neutral, camina, corre, señala, salta, cae). Dibujo en SVG por piezas (cabeza, torso, brazo×2, pierna×2, pelo,
   accesorio) con pivotes definidos en articulaciones. Contorno ciruela #241726, grosor 6 px (más fino en detalles).
3. **Escenas por capas** (de atrás hacia adelante): cielo, fondo lejano (desenfoque 6 px), fondo medio, suelo con
   textura pintada, personajes, primer plano (desenfoque 10 px, se mueve más rápido). El parallax usa factores 0.2 / 0.5 / 1 / 1.4.
4. **Plan de tomas** en `story.ts`: `SHOTS` con `{a, b, cam:[{f,x,y,zoom,rot,glide}], carasPorPersonaje}`; cuadros de
   cada palabra arriba del archivo; fundido `XFADE` de 6 cuadros solo si cambia el lugar.
5. **Animación.** Cada personaje es un componente `<Personaje pose cara boca />` que recibe valores calculados por cuadro con
   `spring()`/`interpolate()` de Remotion. Nunca uses CSS transitions (no se renderizan). Orden de trabajo: poses clave →
   solape de accesorios → parpadeo y respiración → boca (lipsync) → cámara.
6. **Sombras y luz** (ver reglas). Una dirección de luz fija por escena; todas las sombras apuntan al mismo lado.
7. **Post:** corrección de color suave (saturación +10 %, contraste +5 %), viñeta ligera, sin grano. Si hay desenfoque de campo, va antes del color.
8. **Sonido, medición y render** → pasos 8, 10 y 11 de `shorts-animados-3d`
   (`herramientas/medir_30fps.py`, `npx remotion render src/index.ts <Comp> out/video.mp4 --codec h264 --crf 16`).
9. **Revisión:** hojas de 60 cuadros, caras clave a tamaño completo y la tira de labios. Pregunta antes de rehacer si dicen solo «está raro».

## Trampas
- Boca que "tiembla": falta suavizado entre visemas.
- Todos los personajes con la misma energía: da a cada uno un ritmo de respiración, un tipo de gesto y un ángulo de cabeza propios.
- Sombras en direcciones distintas o sombra proyectada que no sigue al personaje al saltar.
- Contornos que cambian de grosor al hacer zoom: define el trazo con `vectorEffect="non-scaling-stroke"` o escala el grosor con el zoom.
- Muchos SVG con filtros a la vez ralentizan el render: pre-renderiza fondos fijos a PNG y usa `<Img>`.
- Piezas que se separan en las articulaciones: solapa 4–6 px y dibuja el brazo/pierna debajo del torso.
