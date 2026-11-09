# Solo efectos de sonido (sin voz, sin música). Sintetizados con numpy.
import numpy as np, wave
SR=44100; FPS=30; DUR=14.0
N=int(SR*DUR); out=np.zeros(N)
rng=np.random.default_rng(7)
def t(d): return np.arange(int(SR*d))/SR
def put(x,f,g=1.0):
    i=int(f/FPS*SR); j=min(N,i+len(x)); 
    if i<N: out[i:j]+=x[:j-i]*g
def lp(x,fc):
    a=np.exp(-2*np.pi*fc/SR); y=np.zeros_like(x); s=0
    for i,v in enumerate(x): s=(1-a)*v+a*s; y[i]=s
    return y
def bp(x,lo,hi): return lp(x,hi)-lp(x,lo)
def noise(d): return rng.standard_normal(int(SR*d))
def env(n,a,r): 
    e=np.ones(n); na=int(a*SR); e[:na]=np.linspace(0,1,na); nr=int(r*SR); e[-nr:]=np.linspace(1,0,nr) if nr<=n else e[-nr:]; return e
# --- el CLIC (idéntico al inicio y al salto)
def click():
    x=t(0.12); c=np.zeros_like(x)
    c+=np.sin(2*np.pi*3600*x)*np.exp(-x*220)*0.9
    c+=np.sin(2*np.pi*1500*x)*np.exp(-x*140)*0.5
    c+=np.sin(2*np.pi*130*x)*np.exp(-x*60)*0.9
    n=noise(0.12); c+=n*np.exp(-x*900)*1.2
    return c
CLICK=click()
def thud(d=0.25,f0=90,g=1): x=t(d); return np.sin(2*np.pi*(f0*np.exp(-x*8)+35)*x)*np.exp(-x*18)*g+lp(noise(d),300)*np.exp(-x*40)*0.6*g
def pat(): x=t(0.08); return np.sin(2*np.pi*700*x)*np.exp(-x*70)*0.5+lp(noise(0.08),2500)*np.exp(-x*90)*0.4
def scrape(d=0.28): x=t(d); n=bp(noise(d),500,3500); return n*np.sin(np.pi*x/d)**1.5*(0.6+0.4*np.sin(2*np.pi*38*x))*0.7
def swish(d=0.15,up=True): x=t(d); n=bp(noise(d),900,5000); return n*np.sin(np.pi*x/d)*0.35
def creak(d=0.5,f0=420):
    x=t(d); f=f0*(1+0.35*np.sin(2*np.pi*3*x)+0.5*x/d); ph=2*np.pi*np.cumsum(f)/SR
    s=(np.sign(np.sin(ph))*0.5+np.sin(ph)*0.5); return bp(s,300,2500)*np.sin(np.pi*x/d)*0.35
def beep(f0,d=0.14): x=t(d); return np.sign(np.sin(2*np.pi*f0*x))*0.18*env(len(x),0.005,0.03)
def buzz(d=0.4): x=t(d); return np.sign(np.sin(2*np.pi*160*x))*0.22*(np.sin(2*np.pi*22*x)>0)*env(len(x),0.01,0.05)
def snore(period=84/FPS):
    d=period; x=t(d); n=noise(d)
    ins=bp(n,150,900)*np.exp(-((x-0.28*d)/0.12)**2)*0.5
    ex=(bp(n,80,500)*(1+0.6*np.sin(2*np.pi*34*x)))*np.exp(-((x-0.7*d)/0.2)**2)*0.9
    return ins+ex
def whoosh(d,f0=300,f1=6000): 
    x=t(d); n=noise(d); y=np.zeros_like(n); 
    for k in range(6):
        a=k/6; lo=f0*(f1/f0)**a; y+=bp(n,lo*0.7,lo*1.3)*np.sin(np.pi*np.clip((x/d-a*0.5)/0.6,0,1))
    return y*(x/d)**1.2*0.5
def riser(d): x=t(d); f=110*(9**(x/d)); ph=2*np.pi*np.cumsum(f)/SR; return (np.sin(ph)*0.5+np.sin(2*ph)*0.15)*(x/d)**2*0.35
# ambiente: zumbido de cuarto + grillos
x=np.arange(N)/SR
out+=0.015*np.sin(2*np.pi*60*x)+0.01*np.sin(2*np.pi*120*x)+lp(rng.standard_normal(N),180)*0.05
cr=np.zeros(N)
for s0 in np.arange(0.3,DUR,0.62):
    for b in range(3):
        i=int((s0+b*0.07)*SR); xx=t(0.045); cr[i:i+len(xx)]+=np.sin(2*np.pi*4300*xx)*np.sin(np.pi*xx/0.045)*0.03 if i+len(xx)<N else 0
out+=cr
# ronquidos (más fuertes en el plano del dueño)
for k in range(5):
    f0=-10+k*84; 
    if f0>=0: put(snore(),f0,1.0 if 30<f0<70 else 0.35)
    else: put(snore()[int(-f0/FPS*SR):],0,0.35)
# --- línea de tiempo (cuadros)
put(CLICK,2,1.0)
put(swish(0.2),3,0.4)
put(creak(0.9,260),40,0.8); put(pat(),44); put(pat(),54); put(creak(0.6,330),62,0.7)
put(buzz(0.35),66,0.9)
put(thud(0.3,110,0.9),84); put(beep(880,0.08),86,0.6)
for k in range(4):
    b=100+22*k; put(swish(0.18),b,0.7); put(pat(),b+9,0.8); put(scrape(0.3),b+9,0.9)
put(thud(0.22,100,0.7),188); put(pat(),198,1.0); put(pat(),200,0.9)
put(beep(440,0.13),206,0.8); put(beep(330,0.2),214,0.8)
put(creak(0.9,300),205,0.9); put(creak(0.5,380),226,0.7)
put(thud(0.3,95,0.9),236); put(pat(),246,0.7); put(pat(),252,0.7)
put(thud(0.3,120,1.0),262)
put(creak(0.5,250),320,0.5); put(creak(0.5,290),346,0.55)
put(riser(2.3),300,0.9)
put(CLICK,372,1.0)           # mismo clic que el inicial
put(whoosh(47/FPS),372,1.0)
out=np.clip(out,-1.5,1.5)
out/= max(1e-9,np.abs(out).max())*1.05
st=np.stack([out,out],1)
with wave.open('out/sfx.wav','wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st*32767).astype('<i2').tobytes())
print('ok')
