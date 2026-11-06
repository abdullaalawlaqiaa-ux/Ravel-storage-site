import re
v2=open('../v2/v2.tpl.html').read()
syms=''.join(l+'\n' for l in v2.splitlines() if '<symbol id=' in l or l.strip().startswith('<g><use href="#box"'))
# rack symbol spans two lines; keep whole block between first <symbol and last </symbol>
i=v2.index('<symbol id="sofa"'); j=v2.index('</defs>'); syms=v2[i:j]
syms=syms.replace('#ecc988','#9fd0f5').replace('#d6aa5a','#8fc9f2').replace('#e0b46a','#a9d6f6').replace('#bf8f3e','#5fa9de')
L='../v2/logo/'
s=open('v3.tpl.html').read().replace('{{SYMBOLS}}',syms).replace('{{SCRIPT}}',open(L+'script.path').read()).replace('{{STORAGE}}',open(L+'storage.path').read())
assert '{{' not in s
open('v3.html','w').write(s)
