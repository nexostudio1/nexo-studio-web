#!/bin/bash
# Render final + audio sin voz (efectos y música) -> la-renuncia-sin-voz.mp4
cd "$(dirname "$0")"
CH=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell
npx remotion render src/index.ts Renuncia out/video.mp4 --codec h264 --crf 17 --gl=swangle --concurrency=2 --timeout=300000 --browser-executable=$CH > out/render.log 2>&1 &&
ffmpeg -loglevel error -y -i out/video.mp4 -i out/mezcla_sin_voz.wav -map 0:v:0 -map 1:a:0 -c:v copy -af "loudnorm=I=-16:TP=-1.5:LRA=11" -c:a aac -b:a 192k -ar 44100 -t 40.833 la-renuncia-sin-voz.mp4 &&
echo LISTO > out/listo.txt
