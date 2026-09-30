import json,re,sys,itertools

def clean(s):
    t=str(s)
    t=re.sub(r'\$\$?.+?\$\$?','M',t,flags=re.S)   # math -> M
    t=re.sub(r'\d+','N',t)
    t=re.sub(r'\s+','',t)
    return t

def bigrams(t): return set(t[i:i+3] for i in range(len(t)-2))

path,label=sys.argv[1],sys.argv[2]
qs=json.load(open(path))['questions']
cl=[clean(q['question']) for q in qs]
bg=[bigrams(c) for c in cl]
pairs=[]
for i,j in itertools.combinations(range(len(qs)),2):
    if len(cl[i])<25 or len(cl[j])<25: continue
    a,b=bg[i],bg[j]
    if not a or not b: continue
    jac=len(a&b)/len(a|b)
    if jac>=0.62: pairs.append((jac,i+1,j+1))
pairs.sort(reverse=True)
print(f"# {label}: คู่ที่ 'ข้อความโจทย์' คล้ายกันมาก (>=0.62) — {len(pairs)} คู่")
for jac,i,j in pairs:
    print(f"{jac:.2f}  ข้อ {i} <-> {j}")
    print("   ",qs[i-1]['question'][:110].replace('\n',' '))
    print("   ",qs[j-1]['question'][:110].replace('\n',' '))
