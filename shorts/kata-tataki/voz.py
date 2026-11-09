# Junta las frases de Piper en voz.wav y escribe tiempos.json (inicio/fin de cada frase y de cada trozo entre pausas)
import wave, json, numpy as np
SR=22050; GAP=0.14; START=0.55
def load(p):
    w=wave.open(p); a=np.frombuffer(w.readframes(w.getnframes()),np.int16).astype(np.float32)/32768; return a
def env(a,win=256):
    n=len(a)//win; return np.sqrt((a[:n*win].reshape(n,win)**2).mean(1)), win
out=[]; t=START; segs=[]
for i in range(1,10):
    a=load(f'voz/es_ES-davefx-medium_{i}.wav')
    e,win=env(a); th=0.012
    on=np.where(e>th)[0]; a=a[max(0,on[0]*win-400):min(len(a),(on[-1]+1)*win+800)]
    e,win=env(a)
    # trozos: pausas internas > 0.09 s
    quiet=e<th; chunks=[]; s=None; run=0
    for k,q in enumerate(quiet):
        if not q:
            if s is None: s=k
            run=0; last=k
        else:
            run+=1
            if s is not None and run*win/SR>0.09: chunks.append((s,last)); s=None
    if s is not None: chunks.append((s,len(e)-1))
    d=len(a)/SR
    segs.append({'i':i,'t0':round(t,3),'t1':round(t+d,3),'chunks':[[round(t+c0*win/SR,3),round(t+(c1+1)*win/SR,3)] for c0,c1 in chunks]})
    out.append((t,a)); t+=d+GAP
total=t-GAP+1.15
buf=np.zeros(int(total*SR)+1,np.float32)
for t0,a in out: buf[int(t0*SR):int(t0*SR)+len(a)]+=a
w=wave.open('out/voz.wav','wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(buf,-1,1)*32767).astype(np.int16).tobytes()); w.close()
json.dump({'total':round(total,3),'frames':int(np.ceil(total*30)),'segs':segs},open('tiempos.json','w'),indent=1)
print(round(total,2), int(np.ceil(total*30)))
for s in segs: print(s['i'], s['t0'], s['t1'], [round(c[0]*30) for c in s['chunks']])
