#!/bin/bash
# Versión con la voz de ElevenLabs: voz encajada + efectos por debajo + subtítulos con los tiempos de la voz
cd "$(dirname "$0")"
python3 voz_encaje.py && TIEMPOS=tiempos_voz.json SUBS_OUT=out/subs_voz.ass python3 subs.py &&
ffmpeg -loglevel error -y -i out/voz_encajada.wav -i out/mezcla_sin_voz.wav -filter_complex \
 "[0:a]aresample=44100,loudnorm=I=-16:TP=-2:LRA=9,aresample=44100,asplit=2[v][vk];[1:a]aresample=44100,volume=0.42[s];[s][vk]sidechaincompress=threshold=0.03:ratio=4:attack=15:release=250[sd];[v][sd]amix=inputs=2:normalize=0:duration=longest,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=44100,apad,atrim=0:45.467[a]" \
 -map "[a]" -ar 44100 out/mezcla_con_voz.wav &&
ffmpeg -loglevel error -y -i out/video.mp4 -i out/mezcla_con_voz.wav -map 0:v:0 -map 1:a:0 \
 -vf "scale=w='trunc(1080*(1+0.16*pow(max(0\,1-t/0.45)\,2))/2)*2':h=-2:eval=frame,crop=1080:1920,ass=out/subs_voz.ass" \
 -c:v libx264 -crf 17 -preset medium -c:a aac -b:a 192k -t 45.467 kata-tataki-con-voz.mp4 && echo LISTO
