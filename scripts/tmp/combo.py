import json,re,sys,itertools

def mskel(s):
    parts=re.findall(r'\$\$(.+?)\$\$|\$(.+?)\$', str(s), re.S)
    j='|'.join(a or b for a,b in parts)
    j=re.sub(r'\\(?:dfrac|frac|tfrac)','FRAC',j)
    j=re.sub(r'\\left|\\right|\\,|\;|\\!|\\ |\\quad','',j)
    j=re.sub(r'[{}\s]','',j).replace('\\times','*').replace('\\cdot','*').replace('\\div','/')
    j=re.sub(r'(?<![a-zA-Z\\])[a-zA-Z](?![a-zA-Z])','V',j)
    return re.sub(r'\d+','N',j)

def clean(s):
    t=re.sub(r'\$\$?.+?\$\$?','M',str(s),flags=re.S)
    t=re.sub(r'\d+','N',t); return re.sub(r'\s+','',t)
def bg(t): return set(t[i:i+3] for i in range(len(t)-2))

path,label=sys.argv[1],sys.argv[2]
qs=json.load(open(path))['questions']
ms=[mskel(q['question']) for q in qs]
cl=[clean(q['question']) for q in qs]
B=[bg(c) for c in cl]
out=[]
for i,j in itertools.combinations(range(len(qs)),2):
    if not ms[i] or ms[i]!=ms[j]: continue
    a,b=B[i],B[j]
    jac=len(a&b)/len(a|b) if a and b else 1.0
    out.append((jac,i+1,j+1))
out.sort(reverse=True)
print(f"# {label}: โครงนิพจน์เหมือนกัน {len(out)} คู่ (เรียงตามความคล้ายของข้อความ)")
for jac,i,j in out:
    print(f"{jac:.2f}  ข้อ {i} <-> {j}")
    print("    A:",qs[i-1]['question'][:120].replace('\n',' '))
    print("    B:",qs[j-1]['question'][:120].replace('\n',' '))
