# Mezcla: voz + cama sintetizada (drone grave que sube con el "ojo", impacto en cada AÑO, whoosh en cada cambio de toma).
import numpy as np, wave, sys
sr=wave.open("public/voz/voz.wav").getframerate(); F=30; dur=686/F
REW=(640,676); WINK=632
def rd(p):
    w=wave.open(p); a=np.frombuffer(w.readframes(w.getnframes()),dtype=np.int16).astype(np.float32)/32768; return a
voz=rd("public/voz/voz.wav"); n=int(dur*sr)+sr//2
y=np.zeros(n,dtype=np.float32); y[:len(voz)]+=voz[:n]*1.0
t=np.arange(n)/sr; rng=np.random.default_rng(3)
# sube con los años y se rebobina al final para que el bucle empalme
prog=np.clip(t/(606/F),0,1)*(1-np.clip((t-REW[0]/F)/((REW[1]-REW[0])/F),0,1))
drone=(np.sin(2*np.pi*(48+30*prog)*t)+0.5*np.sin(2*np.pi*(96+40*prog)*t+1)+0.3*np.sin(2*np.pi*(51+30*prog)*t))*(0.05+0.10*prog**1.5)
y+=drone*0.8
def hit(f,amp=0.5,freq=60):
    i=int(f/F*sr); L=int(0.9*sr); k=np.arange(L)/sr
    s=np.sin(2*np.pi*(freq*np.exp(-k*3))*k)*np.exp(-k*5)*amp
    s+=rng.standard_normal(L)*np.exp(-k*30)*amp*0.25
    y[i:i+L]+=s[:max(0,min(L,n-i))]
for f in (156,220,341,410): hit(f,0.55,70)
hit(0,0.25,50)
def whoosh(f,d=0.5,amp=0.18):
    i=int(f/F*sr); L=int(d*sr); k=np.linspace(0,1,L)
    nz=rng.standard_normal(L); b=np.convolve(nz,np.ones(40)/40,mode="same")
    y[i:i+L]+=(b*np.sin(np.pi*k)**2*amp)[:max(0,min(L,n-i))]
for f in (46,146,334,502): whoosh(f-8)
# lento: drone grave extra en la cámara lenta (años 7)
i0,i1=int(440/F*sr),int(552/F*sr); y[i0:i1]+=np.sin(2*np.pi*38*t[i0:i1])*0.12*np.sin(np.pi*np.linspace(0,1,i1-i0))
# rebobinado cómico: barrido de cinta hacia atrás (tono que sube muy rápido, entrecortado)
i0,i1=int(REW[0]/F*sr),int(REW[1]/F*sr); k=np.linspace(0,1,i1-i0)
fr=200+2600*k**1.6; ph=2*np.pi*np.cumsum(fr)/sr
y[i0:i1]+=(0.6*np.sin(ph)+0.4*np.sign(np.sin(ph*0.5)))*(0.5+0.5*np.sign(np.sin(2*np.pi*14*k*(1+k))))*np.sin(np.pi*k)*0.07
# guiño: un 'tic' corto y seco
i=int(WINK/F*sr); L=int(0.05*sr); kk=np.arange(L)/sr; y[i:i+L]+=np.sin(2*np.pi*1800*kk)*np.exp(-kk*120)*0.25
# normalización simple (~ -14 LUFS aprox. por pico/RMS) y limitador suave
y=np.tanh(y*1.3); y/=np.max(np.abs(y))/0.92
w=wave.open("out/mezcla.wav","wb"); w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((y*32767).astype(np.int16).tobytes()); w.close()
# volumen final: -14 LUFS integrados, pico real -1 dB
import subprocess, os
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", "out/mezcla.wav", "-af", "loudnorm=I=-14:TP=-1:LRA=11", "-ar", str(sr), "out/mezcla_n.wav"], check=True)
os.replace("out/mezcla_n.wav", "out/mezcla.wav")
