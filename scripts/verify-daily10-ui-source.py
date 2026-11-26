"""Check page registration and bounded list invariants in the actual ArkTS source, not device rendering."""
from pathlib import Path
import hashlib,json,re
root=Path(__file__).resolve().parent.parent
source=root/'client/entry/src/main/ets/pages/Index.ets';text=source.read_text()
start=text.index(' private async backPage()');end=text.index('\n private ',start+1);back=text[start:end]
render=text[text.rindex(' build()'):]
checks=[]
for route,builder in [('leftovers','leftoverPage'),('trash','trashPage'),('dining-places','diningPlacesPage'),('daily-flow','dailyFlow'),('workspace','workspacePage'),('deduction','deductionPage'),('recipe-correction','correctionPage')]:
 assert re.search(r"this.page\s*===\s*['\"]"+route+r"['\"]\)\{\s*this\."+builder+r'\(\)',render),route
 assert 'this.'+builder+'()' not in back,route+' rendered from navigation method'
 checks.append(route+' is registered in build and not invoked during back navigation')
assert 'this.libraryMode?Math.max(0,this.recipeLimit-24):0' in text
checks.append('Library renders at most 24 recipe cards per explicit page')
assert 'sourceSize({width:312,height:312})' in text
checks.append('Recipe card decode requests a bounded thumbnail size')
assert 'accessibilityText(this.label+' in text and '.focusable(true)' in text
checks.append('Shared selection chips provide accessible selection descriptions and focus')
report={'passed':True,'checks':checks,'source_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'nativeDeviceVerified':False,'scope':'ArkTS source registration and resource bounds only; no rendered layout or device assertions'}
(root/'work/reports/daily10-ui-source.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print('PASS ArkTS routing/resource checks:',len(checks))
