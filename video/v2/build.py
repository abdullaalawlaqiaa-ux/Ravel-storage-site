import sys
L='logo/'
s=open('v2.tpl.html').read().replace('{{SCRIPT}}',open(L+'script.path').read()).replace('{{STORAGE}}',open(L+'storage.path').read()).replace('{{WA}}',sys.argv[1]).replace('{{STRETCH}}',sys.argv[2])
open(sys.argv[3],'w').write(s)
