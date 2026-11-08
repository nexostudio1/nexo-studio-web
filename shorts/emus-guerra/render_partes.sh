#!/bin/bash
# Renderiza el short en 3 partes y las une (cada parte se guarda: si una falla, se relanza solo esa).
cd "$(dirname "$0")"; export TMPDIR=${TMPDIR:-/tmp/rt}; mkdir -p out/partes
i=0
for r in 0-483 484-967 968-1451; do
  i=$((i+1)); [ -s out/partes/p$i.mp4 ] && continue
  npx remotion render src/index.ts GuerraEmus out/partes/p$i.mp4 --frames=$r --codec h264 --crf 16 --concurrency=2 --timeout=300000 --gl=swangle --browser-executable=/opt/pw-browsers/chromium --muted > /tmp/rt/emu_parte$i.log 2>&1 || { echo FALLO parte $i; exit 1; }
  echo OK parte $i
done
printf "file 'p1.mp4'\nfile 'p2.mp4'\nfile 'p3.mp4'\n" > out/partes/lista.txt
ffmpeg -y -loglevel error -f concat -safe 0 -i out/partes/lista.txt -c copy out/video_mudo.mp4 && echo UNIDO
