"""Index actual Cycles review images and source-bound status; does not invent acceptance."""
from pathlib import Path
import json,html,hashlib,os
from render_provenance import equivalence,selected_views
ROOT=Path(__file__).resolve().parents[2]
report=ROOT/'work/reports/lobby3d-cycles-production.json'
d=json.loads(report.read_text()) if report.exists() else {'status':'pending','renders':[]}
source=hashlib.sha256((ROOT/'art-source/lobby3d/detailed-spaces.blend').read_bytes()).hexdigest()
current=d.get('source_sha256')==source
scenes={'meals':'今日记餐','kitchen':'菜谱厨房','pantry':'我的冰箱','community':'餐桌广场','profile':'我的小怪'}
views=selected_views(d,[json.loads(p.read_text()) for p in sorted((ROOT/'work/reports').glob('lobby3d-cycles-refined-*.json'))])
batch_label={'cancelled_superseded':'旧源批次停止，关键视角已由修正版补充','complete':'完成','running':'渲染中'}.get(d['status'],d['status'])
items=[];valid_count=0;historical_count=0
for r,batch_source in views.values():
 p=ROOT/r['path']
 rendered=r.get('rendered_from_blend_sha256',batch_source);proof=equivalence(r['scene'],rendered,source)
 reuse=' · 当前源' if rendered==source else ' · 几何一致复用' if proof is not None else ' · 历史源审视图：非当前模型效果'
 if r.get('inspection_note'):reuse+=' · '+r['inspection_note']
 link=html.escape(os.path.relpath(p,ROOT/'work/reports'))
 if not p.exists():continue
 valid_count+=proof is not None;historical_count+=proof is None
 items.append(f'<article data-scene="{r["scene"]}" data-current="{str(proof is not None).lower()}" {"hidden" if proof is None else ""}><a href="{link}" target="_blank"><img loading="lazy" src="{link}" alt="{html.escape(r["view"])}"></a><p>{html.escape(r["view"])}</p><small>{r["samples"]} samples · {r["pixels"][0]}×{r["pixels"][1]} · {r["seconds"]:.0f}s{reuse}</small></article>')
page='''<!doctype html><html lang="zh"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>开饭小怪·模型细节检查</title><style>*{box-sizing:border-box}body{background:#f5efdf;color:#334e45;font:15px system-ui;margin:0;padding:28px}h1{font-size:28px}p{line-height:1.6}nav{display:flex;flex-wrap:wrap;gap:8px;position:sticky;top:0;background:#f5efdfed;padding:12px 0}button{border:1px solid #bbccba;background:#fff9ea;padding:10px 18px;border-radius:18px;color:inherit;font:inherit}button[aria-pressed=true]{background:#466b58;color:#fff}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px}article{background:#fffbf1;padding:12px;border-radius:14px;min-width:0}article img{width:100%;aspect-ratio:1.2;object-fit:contain}article p{overflow-wrap:anywhere;font-size:12px;margin:8px 0}small{font-size:11px;color:#7e7969}a{color:inherit}aside{padding:15px;background:#e6eada;border-radius:15px;max-width:900px}</style>'''
page+=f'<h1>开饭小怪 · 模型细节检查</h1><aside>以下为真实模型的 Cycles 离线检查图，不是手机实时截图。当前批次状态：{html.escape(batch_label)}，已完成 {len(items)} 个视角。当前或几何等价 {valid_count} 张；历史版本 {historical_count} 张（默认隐藏）。每张图分别标注当前、等价复用或历史源审视。不以渲染数量代替美术验收；点击图片可查看原始像素。</aside><p><label><input id="show-history" type="checkbox"> 包含历史问题审视图</label></p><nav><button data-filter="all" aria-pressed="true">全部</button>'
page+=''.join(f'<button data-filter="{k}">{v}</button>' for k,v in scenes.items())+'</nav><main>'+''.join(items)+'</main>'
page+='''<script>let filter='all';const historyControl=document.querySelector('#show-history');function apply(){document.querySelectorAll('article').forEach(x=>x.hidden=(filter!=='all'&&x.dataset.scene!==filter)||(!historyControl.checked&&x.dataset.current!=='true'))}document.querySelector('nav').onclick=e=>{const b=e.target.closest('button');if(!b)return;filter=b.dataset.filter;document.querySelectorAll('nav button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));apply()};historyControl.onchange=apply;</script></html>'''
(ROOT/'work/reports/lobby3d-art-review.html').write_text(page)
print('Indexed',len(items),'source matches',current,'status',d['status'])
