import numpy as np, wave
SR=44100; D=38.0; N=int(SR*D); t=np.arange(N)/SR
L=np.zeros(N); R=np.zeros(N)
bpm=100; beat=60/bpm; bar=beat*4
def f(m): return 440*2**((m-69)/12)
def lp(x,a):  # one-pole lowpass
    y=np.empty_like(x); s=0.0
    for i in range(len(x)): s+=a*(x[i]-s); y[i]=s
    return y
def add(sig,start,pan=0.0,g=1.0):
    i=int(start*SR); j=min(N,i+len(sig)); 
    if i>=N: return
    L[i:j]+=sig[:j-i]*g*(1-pan)/1.0; R[i:j]+=sig[:j-i]*g*(1+pan)/1.0
# progression C G Am F  (midi roots)
prog=[(48,[60,64,67,72]),(43,[59,62,67,71]),(45,[60,64,69,72]),(41,[60,65,69,72])]
nbars=int(D/bar)+1
for b in range(nbars):
    root,ch=prog[b%4]; st=b*bar; n=int(bar*SR); tt=np.arange(n)/SR
    env=np.minimum(1,tt/0.4)*np.minimum(1,(bar-tt)/0.3)
    pad=sum(np.sin(2*np.pi*f(m)*tt*(1+d))for m in ch for d in(-0.003,0.003))/8
    add(pad*env*0.22,st,-0.1); add(pad*env*0.22,st,0.1)
    if b>=1:
        bs=np.sin(2*np.pi*f(root)*tt)+0.3*np.sin(2*np.pi*f(root)*2*tt)
        add(bs*env*0.28,st)
    # arpeggio plucks 8ths from bar 2
    if b>=2:
        for k in range(8):
            m=ch[[0,1,2,3,2,1,2,3][k]]+12; n2=int(0.35*SR); t2=np.arange(n2)/SR
            pl=(np.sin(2*np.pi*f(m)*t2)+0.25*np.sin(2*np.pi*f(m)*3*t2))*np.exp(-t2*9)
            add(pl*0.10,st+k*beat/2,0.35 if k%2 else -0.35)
# drums from 4s
nb=int(D/beat)
for k in range(nb):
    s=k*beat
    if s<4 or s>35.5: continue
    n=int(0.4*SR); tt=np.arange(n)/SR
    kick=np.sin(2*np.pi*(50+90*np.exp(-tt*30))*tt)*np.exp(-tt*7)
    add(kick*0.55,s)
    hn=int(0.06*SR); th=np.arange(hn)/SR
    hat=np.diff(np.random.randn(hn+1))*np.exp(-th*60)
    add(hat*0.05,s+beat/2,0.2)
    if k%2==1:
        sn=np.random.randn(int(0.2*SR))*np.exp(-np.arange(int(0.2*SR))/SR*22)
        add(lp(sn,0.35)*0.12,s)
# whooshes at cuts
for c in [4,9,14,20.5,26,31.5]:
    n=int(0.9*SR); tt=np.arange(n)/SR
    nz=np.random.randn(n); a=0.05+0.5*(tt/0.9)**2
    w=lp(nz,0.25)*np.sin(np.pi*tt/0.9)**2
    add(w*0.35,c-0.55,-0.3); add(lp(np.random.randn(n),0.25)*np.sin(np.pi*tt/0.9)**2*0.35,c-0.55,0.3)
# impacts
for s in [27.0,33.1,0.3]:
    n=int(1.5*SR); tt=np.arange(n)/SR
    boom=np.sin(2*np.pi*(40+60*np.exp(-tt*8))*tt)*np.exp(-tt*3)
    add(boom*0.6,s)
# ding/sparkle on feature pops
for i in range(6):
    s=20.5+1+i*0.32; n=int(0.5*SR); tt=np.arange(n)/SR
    add(np.sin(2*np.pi*f(84+[0,4,7,12,7,12][i])*tt)*np.exp(-tt*8)*0.07,s,0.3*(1 if i%2 else -1))
mix=np.stack([L,R],1)
fade=np.ones(N); fi=int(SR*0.5); fade[:fi]=np.linspace(0,1,fi); fo=int(SR*2.5); fade[-fo:]=np.linspace(1,0,fo)
mix*=fade[:,None]; mix/=np.max(np.abs(mix))*1.12
w=wave.open('music.wav','wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
w.writeframes((mix*32767).astype('<i2').tobytes()); w.close(); print('ok')
