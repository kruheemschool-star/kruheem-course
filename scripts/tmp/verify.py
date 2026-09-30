import re, html as htmlmod, difflib, sys

def extract_lines(doc):
    t = re.sub(r'<img[^>]*>', '\n', doc)
    t = re.sub(r'<hr\s*/?>', '\n', t)
    t = re.sub(r'<br\s*/?>', '\n', t)
    t = re.sub(r'</(p|h1|h2|h3|div)>', '\n', t)
    t = re.sub(r'<[^>]+>', '', t)
    t = htmlmod.unescape(t)
    return [l.strip() for l in t.split('\n') if l.strip()]

old_path, new_path = sys.argv[1], sys.argv[2]
with open(old_path, encoding='utf-8') as f:
    OLD_CONTENT = f.read()
with open(new_path, encoding='utf-8') as f:
    NEW_CONTENT = f.read()

old_lines = extract_lines(OLD_CONTENT)
new_lines = extract_lines(NEW_CONTENT)
diff = list(difflib.unified_diff(old_lines, new_lines, lineterm=''))
if diff:
    print("FAIL — do not write to Firestore. Diff:")
    for d in diff[:100]:
        print(d)
    sys.exit(1)
else:
    print(f"PASS — {len(old_lines)} lines match exactly ({new_path})")
