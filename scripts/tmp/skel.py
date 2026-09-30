import json,re,collections

def norm_exact(s): return re.sub(r'\s+','',str(s))

def skeleton(s):
    t=str(s)
    t=re.sub(r'\\(?:dfrac|frac)','FRAC',t)
    t=re.sub(r'\\left|\\right|\\,|\;|\\ ','',t)
    t=re.sub(r'(?<![a-zA-Z\\])[a-zA-Z](?![a-zA-Z])','V',t)
    t=re.sub(r'\d+','N',t)
    return re.sub(r'\s+','',t)

def analyze(path,label):
    d=json.load(open(path)); qs=d['questions']
    print(f"\n########## {label} — {d['title']} ({len(qs)} ข้อ)")
    byfull=collections.defaultdict(list); bystem=collections.defaultdict(list); byskel=collections.defaultdict(list)
    for i,q in enumerate(qs):
        kq=norm_exact(q['question'])
        byfull[kq+'||'+'|'.join(sorted(norm_exact(o) for o in q['options']))].append(i+1)
        bystem[kq].append(i+1)
        byskel[skeleton(q['question'])+'##'+'|'.join(sorted(skeleton(o) for o in q['options']))].append(i+1)
    ex=[v for v in byfull.values() if len(v)>1]
    st=[v for v in bystem.values() if len(v)>1]
    sk=[v for v in byskel.values() if len(v)>1]
    print(f"ซ้ำเป๊ะ: {sum(len(v)-1 for v in ex)} ข้อ  {ex}")
    print(f"โจทย์เหมือนเป๊ะ: {sum(len(v)-1 for v in st)} ข้อ {st}")
    print(f"ซ้ำโครง: {sum(len(v)-1 for v in sk)} ข้อ")
    for v in sorted(sk,key=lambda a:-len(a)): print("   ",v)

for p,l in [('m2-exponents.json','ม.2'),('m1-exponents.json','ม.1')]: analyze(p,l)
