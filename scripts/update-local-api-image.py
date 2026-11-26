"""Rebuild app-only layers from verified unchanged local dependencies; no remote base pull."""
from pathlib import Path
import subprocess,tarfile,io,json,hashlib
root=Path(__file__).resolve().parent.parent
old=subprocess.check_output(['docker','run','--rm','--entrypoint','cat','shiku-api:local','/app/package.json'])
assert json.loads(old)==json.loads((root/'backend/package.json').read_text()),'Dependency manifest differs; full build required'
recipe=b'FROM shiku-api:local\nCOPY --chown=node:node dist /app/dist\nCOPY --chown=node:node migrations /app/migrations\nCOPY --chown=node:node admin /app/admin\n'
with io.BytesIO() as context:
 with tarfile.open(fileobj=context,mode='w',format=tarfile.USTAR_FORMAT) as archive:
  info=tarfile.TarInfo('Dockerfile');info.size=len(recipe);archive.addfile(info,io.BytesIO(recipe))
  for name in ['dist','migrations','admin']:archive.add(root/'backend'/name,arcname=name)
 context.seek(0)
 proc=subprocess.run(['docker','build','--network=none','--pull=false','-f','Dockerfile','-t','shiku-api:local','-'],input=context.read(),stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=180)
 (root/'work/reports/next20-container-build.log').write_bytes(proc.stdout)
 print('App layer rebuild exit',proc.returncode)
 if proc.returncode:print(proc.stdout.decode(errors='replace')[-3000:]);raise SystemExit(proc.returncode)
