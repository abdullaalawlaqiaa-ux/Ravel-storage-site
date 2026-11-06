v2=open('../v2/v2.tpl.html').read(); v3=open('../v3/v3.tpl.html').read()
syms=v2[v2.index('<symbol id="sofa"'):v2.index('</defs>')]
syms=syms.replace('#ecc988','#9fd0f5').replace('#d6aa5a','#8fc9f2').replace('#e0b46a','#a9d6f6').replace('#bf8f3e','#5fa9de')
head=v3[:v3.index('</style>')+len('</style>')]
kjs=v3[v3.index('async function initK'):v3.index("window.ready=initK().then(()=>window.setTime(0));")]+"window.ready=initK().then(()=>window.setTime(0));"
kjs=kjs.replace("'ـضاق'","'ـطويل'")
L='../v2/logo/'
body=open('v6.body.html').read().replace('{{SYMBOLS}}',syms).replace('{{KBAR_INIT}}',kjs)
s=(head+'\n'+body).replace('{{SCRIPT}}',open(L+'script.path').read()).replace('{{STORAGE}}',open(L+'storage.path').read())
assert '{{' not in s
open('v6.html','w').write(s)
