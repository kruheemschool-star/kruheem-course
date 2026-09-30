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

base=json.load(open(sys.argv[1])); qs=[dict(q) for q in base['questions']]
rep=json.load(open(sys.argv[2]))['replace']
for pos,nq in rep.items(): qs[int(pos)-1]={**qs[int(pos)-1],**nq}
changed={int(p) for p in rep}

print(f"หลังแทน {len(rep)} ข้อ ในชุด {base['title']} ({len(qs)} ข้อ)")
gm=collections.defaultdict(list); gs=collections.defaultdict(list); gf=collections.defaultdict(list)
for i,q in enumerate(qs):
    m=maths(q['question'])
    if m: gm[m].append(i+1)
    gs[skel(q['question'])].append(i+1)
    gf[re.sub(r'\s+','',q['question'])+'||'+'|'.join(sorted(re.sub(r'\s+','',o) for o in q['options']))].append(i+1)
def show(g,label):
    d=[v for v in g.values() if len(v)>1]
    hit=[v for v in d if any(n in changed for n in v)]
    print(f"  {label}: ทั้งชุดเหลือ {sum(len(v)-1 for v in d)} ข้อ · เกี่ยวกับข้อที่เพิ่งแทน {hit}")
show(gf,'ซ้ำเป๊ะ (โจทย์+ตัวเลือก)')
show(gm,'นิพจน์ในโจทย์เหมือนกัน')
show(gs,'โครงโจทย์เหมือนกัน')
ci=collections.Counter(q['correctIndex'] for q in qs)
print("  การกระจายคำตอบ ก/ข/ค/ง:",[ci[i] for i in range(4)])
for pos,nq in sorted(rep.items(),key=lambda kv:int(kv[0])):
    e=nq['explanation']
    assert e.startswith(f"**คำตอบ: ข้อ {nq['correctIndex']+1}.**"), pos
    assert len(set(nq['options']))==4, pos
    assert e.count('$$')%2==0, pos
print("  หัวเฉลย/ตัวเลือก/สมการ: ผ่านครบ",len(rep),"ข้อ")
