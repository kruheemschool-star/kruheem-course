import json,re,collections,sys

def maths(s):
    t=str(s)
    parts=re.findall(r'\$\$(.+?)\$\$|\$(.+?)\$', t, re.S)
    segs=[a or b for a,b in parts]
    j='|'.join(segs)
    j=re.sub(r'\\(?:dfrac|frac|tfrac)','FRAC',j)
    j=re.sub(r'\\left|\\right|\\,|\;|\\!|\\ |\\quad','',j)
    j=re.sub(r'[{}\s]','',j)
    j=j.replace('\\times','*').replace('\\cdot','*').replace('\\div','/')
    return j

def analyze(path,label):
    d=json.load(open(path)); qs=d['questions']
    print(f"\n########## {label} ({len(qs)} ข้อ)")
    g=collections.defaultdict(list)
    for i,q in enumerate(qs):
        m=maths(q['question'])
        if m: g[m].append(i+1)
    dups=sorted([ (k,v) for k,v in g.items() if len(v)>1],key=lambda a:a[1][0])
    print(f"[นิพจน์ในโจทย์เหมือนกันเป๊ะ] ซ้ำ {sum(len(v)-1 for _,v in dups)} ข้อ / {len(dups)} กลุ่ม")
    for k,v in dups: print("   ",v,"|",k[:80])

for p,l in [('m2-exponents.json','ม.2 สมบัติของเลขยกกำลัง'),('m1-exponents.json','ม.1 เลขยกกำลัง')]: analyze(p,l)
