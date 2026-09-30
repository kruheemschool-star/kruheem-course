import json,re,collections

def skel_stem(s, drop_vars=True):
    t=str(s)
    t=re.sub(r'\\(?:dfrac|frac|tfrac)','FRAC',t)
    t=re.sub(r'\\left|\\right|\\,|\;|\\!|\\ ','',t)
    t=re.sub(r'\{|\}','',t)
    if drop_vars: t=re.sub(r'(?<![a-zA-Z\\])[a-zA-Z](?![a-zA-Z])','V',t)
    t=re.sub(r'\d+','N',t)
    t=re.sub(r'\s+','',t)
    return t

def analyze(path,label):
    d=json.load(open(path)); qs=d['questions']
    print(f"\n########## {label} ({len(qs)} ข้อ)")
    g=collections.defaultdict(list)
    for i,q in enumerate(qs): g[skel_stem(q['question'])].append(i+1)
    dups=sorted([v for v in g.values() if len(v)>1],key=lambda a:(a[0]))
    print(f"โครงโจทย์ซ้ำ: {sum(len(v)-1 for v in dups)} ข้อ, {len(dups)} กลุ่ม")
    for v in dups:
        print("   ",v,"|", qs[v[0]-1]['question'][:90].replace("\n"," "))

for p,l in [('m2-exponents.json','ม.2 สมบัติของเลขยกกำลัง'),('m1-exponents.json','ม.1 เลขยกกำลัง')]: analyze(p,l)
