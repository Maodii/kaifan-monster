"""Inventory UI scrolling containers and add native elastic edge feedback when absent."""
import re,json
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent

def mask_strings(s):
 out=list(s);i=0
 while i<len(s):
  if s.startswith('//',i):
   j=s.find('\n',i);j=len(s) if j<0 else j
  elif s.startswith('/*',i):
   j=s.find('*/',i+2);j=len(s) if j<0 else j+2
  elif s[i] in "'\"`":
   q=s[i];j=i+1
   while j<len(s):
    if s[j]=='\\':j+=2;continue
    if s[j]==q:j+=1;break
    j+=1
  else:i+=1;continue
  for k in range(i,j):
   if out[k]!='\n':out[k]=' '
  i=j
 return ''.join(out)

def containers(s):
 m=mask_strings(s);rows=[]
 for match in re.finditer(r'\b(Scroll|Grid)\s*\(',m):
  pos=m.index('(',match.start());depth=1;pos+=1
  while depth:
   depth+=(m[pos]=='(')-(m[pos]==')');pos+=1
  while m[pos].isspace():pos+=1
  if m[pos]!='{':continue
  depth=1;pos+=1
  while depth:
   depth+=(m[pos]=='{')-(m[pos]=='}');pos+=1
  # Inspect only this node's attribute chain, not the next UI sibling.
  end=pos
  while end<len(m):
   next_attr=re.match(r'\s*\.\w+\s*\(',m[end:])
   if not next_attr:break
   end+=next_attr.end();depth=1
   while depth and end<len(m):
    depth+=(m[end]=='(')-(m[end]==')');end+=1
  attrs=s[pos:end]
  rows.append((match.group(1),match.start(),pos,attrs))
 return rows

if __name__=='__main__':
 rows=[]
 for p in (ROOT/'client/entry/src/main/ets/pages').glob('*.ets'):
  s=p.read_text();items=containers(s);inserts=[]
  for kind,start,end,attrs in items:
   # Fixed calendar grids do not scroll and should not bounce; all Scroll nodes and template picker Grid do.
   fixed=kind=='Grid' and ('.rowsTemplate(' in attrs or 'this.calendar' in s[start:end] or 'this.homeMonth' in s[start:end])
   if not fixed and '.edgeEffect(' not in attrs:inserts.append(end)
   rows.append({'file':str(p.relative_to(ROOT)),'line':s.count('\n',0,start)+1,'type':kind,'fixedCalendar':fixed})
  for pos in reversed(inserts):s=s[:pos]+'.edgeEffect(EdgeEffect.Spring, { alwaysEnabled: true })'+s[pos:]
  if inserts:p.write_text(s)
 report={'containers':rows,'count':len(rows),'policy':'Native Spring edge feedback; always enabled for short content; fixed calendars excluded'}
 (ROOT/'work/reports/harmony-precheck-v0918-scroll-inventory.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'containers':len(rows),'scrolling':sum(not x['fixedCalendar'] for x in rows)}))
