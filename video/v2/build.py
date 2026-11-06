import sys
L='logo/'
s=open('v2.tpl.html').read().replace('{{SCRIPT}}',open(L+'script.path').read()).replace('{{STORAGE}}',open(L+'storage.path').read()).replace('{{WA}}',sys.argv[1] if len(sys.argv)>1 else '05X XXX XXXX')
open('v2.html','w').write(s)
