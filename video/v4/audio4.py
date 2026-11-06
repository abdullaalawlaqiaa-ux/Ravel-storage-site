import numpy as np, wave, re
SR=44100; D=25.5; N=int(SR*D); t=np.arange(N)/SR; out=np.zeros(N)
BPM=120; beat=60/BPM
rng=np.random.default_rng(1)
def add(sig,start,gain=1.0):
    i=int(start*SR); j=min(N,i+len(sig)); 
    if i<N: out[i:j]+=sig[:j-i]*gain
def env(n,a,d): e=np.exp(-np.arange(n)/SR/d); k=int(a*SR); e[:k]*=np.linspace(0,1,k) if k else 1; return e
# kick
kn=int(.35*SR); kt=np.arange(kn)/SR
kick=np.sin(2*np.pi*(45*kt+ (120/ 25)*(1-np.exp(-kt*25))))*np.exp(-kt*9)
hat=rng.standard_normal(int(.05*SR)); hat=np.diff(hat,prepend=0)*env(len(hat),0,.012)
clap=rng.standard_normal(int(.18*SR))*env(int(.18*SR),0,.05)
# chords (Am F C G) as soft saw pads + bass
roots=[57,53,48,55]; 
def f(m): return 440*2**((m-69)/12)
def chord(r): return [r, r+(3 if r in (57,) else 4), r+7]
bar=beat*4
for b in range(int(D/bar)+1):
    r=roots[b%4]; s0=b*bar; n=int(bar*SR); tt=np.arange(n)/SR
    pad=sum(np.sin(2*np.pi*f(m+12)*tt+0.3*np.sin(2*np.pi*f(m+12)*1.003*tt)) for m in chord(r))
    pad*=np.minimum(1,tt/.08)*np.minimum(1,(bar-tt)/.1)*0.05
    add(pad,s0)
    for k in range(8):
        bn=int(beat/2*SR); bt=np.arange(bn)/SR
        bass=np.tanh(2*np.sin(2*np.pi*f(r-24)*bt))*np.exp(-bt*6)*0.18
        add(bass,s0+k*beat/2)
# drums: intro lighter
nb=int(D/beat)
for k in range(nb):
    st=k*beat
    if st<24.0 and not (6.0<=st<7.0) and st>=0.5: add(kick,st,.9)
    add(hat,st+beat/2,.12)
    if k%2==1 and st>4: add(clap,st,.10)
# whooshes at cuts
for c in [7,10,16,21]:
    n=int(.6*SR); w=rng.standard_normal(n); x=np.linspace(0,1,n)
    # simple rising lowpass via cumulative smoothing amount
    y=np.zeros(n); a=0.02+0.5*x**2; acc=0
    for i in range(n): acc+=a[i]*(w[i]-acc); y[i]=acc
    add(y*np.sin(np.pi*x)**2*0.9,c-.45)
    add(kick*1.0,c)
# pops on element entrances
pops=sorted({round(float(x),2) for x in re.findall(r'--d:([0-9.]+)s',open('v4.html').read())})
pops=[p for i,p in enumerate(pops) if i==0 or p-pops[i-1]>0.07]
pn=int(.12*SR); pt=np.arange(pn)/SR
pop=np.sin(2*np.pi*(900*pt+ -2500*pt**2))*np.exp(-pt*35)
for p in pops: add(pop,p,.16)
for c in [3.0]:
    add(kick,c,.7)
# ending fade
fade=np.ones(N); fl=int(1.5*SR); fade[-fl:]=np.linspace(1,0,fl); out*=fade
out=out/np.max(np.abs(out))*0.89
st=np.stack([out,out],1); data=(st*32767).astype(np.int16)
with wave.open('music4.wav','wb') as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(data.tobytes())
print('audio ok')
