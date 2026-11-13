# Genera la voz de cada línea con edge-tts y los tiempos por palabra (palabras.json).
import certifi, asyncio, json, subprocess, os
certifi.where = lambda: '/root/.ccr/ca-bundle.crt'  # proxy del entorno
import edge_tts

VOCES = {
    'narr':    dict(voice='es-MX-JorgeNeural',  rate='+16%', pitch='-2Hz'),
    'tono':    dict(voice='es-CO-GonzaloNeural', rate='+10%', pitch='+2Hz'),
    'beto':    dict(voice='es-US-AlonsoNeural', rate='+0%',  pitch='-4Hz'),
}
# Datos: Survey Center on American Life, "The State of American Friendship" (mayo 2021):
#   15 % de los hombres sin amigos cercanos (3 % en 1990).
# Geoffrey Greif, "Buddy System: Understanding Male Friendships" (2009):
#   amistades masculinas "hombro con hombro" (shoulder-to-shoulder) vs. "cara a cara".
GUION = [
    ('narr', 'En mil novecientos noventa, el tres por ciento de los hombres en Estados Unidos no tenía ni un amigo cercano. En dos mil veintiuno: el quince.'),
    ('narr', 'Y no es que no quieran hablar. Es cómo les preguntas.'),
    ('beto', 'Oye... ¿y cómo estás, de verdad?'),
    ('tono', 'Bien.'),
    ('narr', 'Cara a cara, mirándose a los ojos, se siente como un interrogatorio.'),
    ('narr', 'Pero siéntalos lado a lado, a pescar...'),
    ('tono', 'Pues mira, mi novia me dejó, odio mi trabajo y creo que me estoy quedando calvo.'),
    ('narr', 'Los psicólogos lo llaman amistad hombro con hombro. ¿Quieres saber cómo está tu amigo? Invítalo a pescar.'),
]
GAP = 0.18  # silencio entre líneas (s)

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
