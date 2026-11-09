# Genera la voz de cada línea con edge-tts y los tiempos por palabra (palabras.json).
import certifi, asyncio, json, subprocess, os
certifi.where = lambda: '/root/.ccr/ca-bundle.crt'  # proxy del entorno
import edge_tts

VOCES = {
    'tono':    dict(voice='es-MX-JorgeNeural',  rate='+6%',  pitch='+4Hz'),
    'ramirez': dict(voice='es-US-AlonsoNeural', rate='-4%',  pitch='-8Hz'),
}
GUION = [
    ('tono',    'Jefe, llevo cinco años aquí. Necesito un aumento.'),
    ('ramirez', 'Claro, Toño. Te lo mereces.'),
    ('ramirez', 'A partir de hoy, te aumento... las tareas.'),
    ('tono',    '¿Y el sueldo?'),
    ('ramirez', 'El sueldo es una actitud.'),
    ('tono',    'Entonces renuncio.'),
    ('ramirez', 'Perfecto. Antes de irte, entrena a los tres que te van a reemplazar.'),
    ('tono',    '¿A los tres?'),
]
GAP = 0.22  # silencio entre líneas (s)

async def linea(i, quien, texto):
    v = VOCES[quien]
    c = edge_tts.Communicate(texto, v['voice'], rate=v['rate'], pitch=v['pitch'], boundary='WordBoundary')
    words = []
    with open(f'tmp/l{i}.mp3', 'wb') as f:
        async for ch in c.stream():
            if ch['type'] == 'audio': f.write(ch['data'])
            elif ch['type'] == 'WordBoundary':
                words.append({'word': ch['text'], 'start': ch['offset']/1e7, 'end': (ch['offset']+ch['duration'])/1e7})
    subprocess.run(['ffmpeg','-y','-loglevel','error','-i',f'tmp/l{i}.mp3','-ar','48000','-ac','1',f'tmp/l{i}.wav'], check=True)
    return words

def dur(p):
    return float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',p]).decode())

async def main():
    os.makedirs('tmp', exist_ok=True)
    lineas, t, lista = [], 0.35, []
    for i, (q, txt) in enumerate(GUION):
        w = await linea(i, q, txt)
        # recorta el silencio inicial de edge-tts para que las líneas vayan de corrido
        lead = max(0.0, w[0]['start'] - 0.04)
        d = dur(f'tmp/l{i}.wav')
        tail = w[-1]['end']
        for x in w: x['start'] += t - lead; x['end'] += t - lead
        lineas.append({'quien': q, 'texto': txt, 'start': t, 'end': t + (tail - lead), 'words': w,
                       'wav': f'tmp/l{i}.wav', 'trim': lead, 'len': tail - lead + 0.08})
        t += (tail - lead) + GAP
    json.dump({'total': t + 0.5, 'lineas': lineas}, open('palabras.json', 'w'), ensure_ascii=False, indent=1)
    # junta la voz: cada línea en su tiempo
    filt, ins = [], []
    for k, L in enumerate(lineas):
        ins += ['-i', L['wav']]
        ms = int(L['start']*1000)
        filt.append(f"[{k}:a]atrim={L['trim']}:{L['trim']+L['len']},asetpts=PTS-STARTPTS,afade=t=out:st={L['len']-0.05}:d=0.05,adelay={ms}[a{k}]")
    filt.append(''.join(f'[a{k}]' for k in range(len(lineas))) + f'amix=inputs={len(lineas)}:normalize=0,apad=whole_dur={t+0.5}[out]')
    subprocess.run(['ffmpeg','-y','-loglevel','error',*ins,'-filter_complex',';'.join(filt),'-map','[out]','-ar','48000','voz.wav'], check=True)
    print('total', round(t+0.5, 2), 's')

asyncio.run(main())
