import json,re,collections,sys

def maths(s):
    parts=re.findall(r'\$\$(.+?)\$\$|\$(.+?)\$', str(s), re.S)
    j='|'.join(a or b for a,b in parts)
    j=re.sub(r'\\(?:dfrac|frac|tfrac)','FRAC',j)
    j=re.sub(r'\\left|\\right|\\,|\;|\\!|\\ |\\quad','',j)
    j=re.sub(r'[{}\s]','',j)
    return j.replace('\\times','*').replace('\\cdot','*').replace('\\div','/')

def skel(s):
    t=str(s)
    t=re.sub(r'\\(?:dfrac|frac|tfrac)','FRAC',t)
    t=re.sub(r'\\left|\\right|\\,|\;|\\!|\\ ','',t)
    t=re.sub(r'[{}]','',t)
    t=re.sub(r'(?<![a-zA-Z\\])[a-zA-Z](?![a-zA-Z])','V',t)
    t=re.sub(r'\d+','N',t)
    return re.sub(r'\s+','',t)

path,label=sys.argv[1],sys.argv[2]
d=json.load(open(path)); qs=d['questions']
gm=collections.defaultdict(list); gs=collections.defaultdict(list)
for i,q in enumerate(qs):
    m=maths(q['question'])
    if m: gm[m].append(i+1)
    gs[skel(q['question'])].append(i+1)
groups=[]
for k,v in gm.items():
    if len(v)>1: groups.append(('MATH-เหมือนเป๊ะ',v))
for k,v in gs.items():
    if len(v)>1 and not any(set(v)==set(g[1]) for g in groups): groups.append(('SKEL-โครงเดียวกัน',v))
groups.sort(key=lambda g:g[1][0])
print(f"# {label} — {d['title']} ({len(qs)} ข้อ) : {len(groups)} กลุ่มต้องสงสัย")
for kind,v in groups:
    print(f"\n===== [{kind}] ข้อ {v}")
    for n in v:
        q=qs[n-1]
        print(f"  ข้อ {n} (ci={q.get('correctIndex')}) {q['question'][:160]}")
        for j,o in enumerate(q['options']):
            print(f"      {'*' if j==q.get('correctIndex') else ' '}{j}) {o}")
