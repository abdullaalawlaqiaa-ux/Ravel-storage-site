import numpy as np, wave
SR=44100; D=17.0; N=int(SR*D); out=np.zeros(N); rng=np.random.default_rng(7)
def add(sig,start,g=1.0):
    i=int(start*SR); j=min(N,i+len(sig))
    if i<N and j>i: out[i:j]+=sig[:j-i]*g
def lp(x,a):
    y=np.zeros_like(x); acc=0.0
    A=np.broadcast_to(np.asarray(a,dtype=float),x.shape)
    for i in range(len(x)): acc+=A[i]*(x[i]-acc); y[i]=acc
    return y
f=lambda m:440*2**((m-69)/12)
# calm pad + soft piano plucks, 84 BPM, Cmaj7 Am7 Fmaj7 G6
beat=60/84; bar=4*beat
ch=[[48,52,55,59],[45,48,52,55],[41,45,48,52],[43,47,50,52]]
for b in range(int(D/bar)+1):
    c=ch[b%4]; n=int(bar*SR); tt=np.arange(n)/SR
    pad=sum(np.sin(2*np.pi*f(m+12)*tt)*(.6+.4*np.sin(2*np.pi*.3*tt)) for m in c)
    pad*=np.minimum(1,tt/.6)*np.minimum(1,(bar-tt)/.6)*.028; add(pad,b*bar)
    for k,m in enumerate([c[0]+24,c[2]+24,c[3]+24,c[1]+24,c[2]+24,c[3]+24,c[1]+36,c[2]+24]):
        pn=int(1.4*SR); pt=np.arange(pn)/SR
        pl=(np.sin(2*np.pi*f(m)*pt)+.3*np.sin(4*np.pi*f(m)*pt))*np.exp(-pt*3.2)*.05
        add(pl,b*bar+k*beat/2)
# soft kick on downbeats during the montage only
kn=int(.3*SR);kt=np.arange(kn)/SR;kick=np.sin(2*np.pi*(50*kt+2*(1-np.exp(-kt*22))))*np.exp(-kt*10)
for k in range(int(4/beat),int(12/beat)+1): add(kick,k*beat,.35 if k%2==0 else .18)
# shutter rattle 0–3.3 s
n=int(3.4*SR);x=rng.standard_normal(n);tt=np.arange(n)/SR
r=lp(x,.25)*(0.5+0.5*np.sign(np.sin(2*np.pi*22*tt)))*np.minimum(1,tt/.1)*np.minimum(1,(3.4-tt)/.4)*.22
add(r,0); add(lp(rng.standard_normal(int(.25*SR)),.08)*np.exp(-np.arange(int(.25*SR))/SR*14)*.8,3.3)
def thud(g): n=int(.25*SR);t=np.arange(n)/SR;return (np.sin(2*np.pi*90*t)*np.exp(-t*25)+lp(rng.standard_normal(n),.15)*np.exp(-t*30)*.6)*g
add(thud(.6),4.95)
n=int(1.4*SR);t=np.arange(n)/SR;add(lp(rng.standard_normal(n),.05)*np.exp(-t*1.8)*(1+.3*np.sin(2*np.pi*12*t))*.5,6.3)
for k in range(5): add(np.sin(2*np.pi*(2400+k*300)*np.arange(int(.08*SR))/SR)*np.exp(-np.arange(int(.08*SR))/SR*60)*.05,6.4+k*.12)
add(thud(.35),9.2)
n=int(.9*SR);t=np.arange(n)/SR;add(lp(rng.standard_normal(n),.3)*np.sin(np.pi*t/.9)*.12,10.2)
# padlock click + glint shimmer
n=int(.06*SR);t=np.arange(n)/SR;add(rng.standard_normal(n)*np.exp(-t*120)*.9,15.48);add(np.sin(2*np.pi*3200*t)*np.exp(-t*80)*.4,15.49)
n=int(.9*SR);t=np.arange(n)/SR;add(sum(np.sin(2*np.pi*fr*t) for fr in (2093,2637,3136))*np.sin(np.pi*t/.9)*.03,15.95)
# whooshes on cuts
for c in [4,6,8,10,12,15]:
    n=int(.35*SR);w=rng.standard_normal(n);x=np.linspace(0,1,n);add(lp(w,.03+.4*x**2)*np.sin(np.pi*x)**2*.35,c-.25)
fade=np.ones(N);fl=int(1.2*SR);fade[-fl:]=np.linspace(1,0,fl);out*=fade
out=out/np.max(np.abs(out))*.89
d=(np.stack([out,out],1)*32767).astype(np.int16)
with wave.open('music8.wav','wb') as w: w.setnchannels(2);w.setsampwidth(2);w.setframerate(SR);w.writeframes(d.tobytes())
print('ok')
