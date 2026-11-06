import subprocess, wave, json
from lines2 import L
M='vits-piper-ar_JO-kareem-medium/ar_JO-kareem-medium.onnx'
def dur(f):
    with wave.open(f) as w: return w.getnframes()/w.getframerate()
res=[]
for id,a,b,t in L:
    subprocess.run(['python3','-m','piper','-m',M,'-f',f'raw_{id}.wav','--length-scale','0.88','--sentence-silence','0'],input=t.encode(),check=True,capture_output=True)
    # trim silence at both ends
    subprocess.run(['ffmpeg','-loglevel','error','-y','-i',f'raw_{id}.wav','-af','silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse',f'trim_{id}.wav'],check=True)
    d=dur(f'trim_{id}.wav'); room=b-a; tempo=1.0
    if d>room: tempo=min(1.3,d/room)
    subprocess.run(['ffmpeg','-loglevel','error','-y','-i',f'trim_{id}.wav','-af',f'atempo={tempo:.3f}',f'{id}.wav'],check=True)
    nd=dur(f'{id}.wav'); res.append([id,a,nd])
    print(f"{id} room {room:.2f} dur {d:.2f} tempo {tempo:.2f} -> {nd:.2f} {'OVER' if nd>room+0.05 else ''}")
json.dump(res,open('fit2.json','w'))
