import asyncio
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import httpx
from app import create_app, Settings

class RuntimeTests(unittest.IsolatedAsyncioTestCase):
    async def test_hot_config_concurrency_and_last_good(self):
        value=json.loads(Path('infra/runtime-config.json').read_text())
        with tempfile.TemporaryDirectory() as folder, patch.dict(os.environ, RUNTIME_CONFIG_FILE=folder+'/config.json'):
            path=Path(folder)/'config.json'
            path.write_text(json.dumps(value))
            unlimited = False
            async def upstream(request):
                await asyncio.sleep(.03)
                self.assertEqual('max_tokens' in json.loads(request.content),not unlimited)
                return httpx.Response(200,json={'choices':[{'message':{'content':'蒸鸡蛋'},'finish_reason':'stop'}]})
            app=create_app(Settings(enabled=True,allow_outbound=True,token='x'*32,base_url='https://example.test',api_key='test',model='mock'),httpx.MockTransport(upstream))
            async with app.router.lifespan_context(app), httpx.AsyncClient(transport=httpx.ASGITransport(app=app),base_url='http://test',headers={'Authorization':'Bearer '+'x'*32}) as client:
                async def batch():
                    return await asyncio.gather(*[client.post('/v1/assist',json={'prompt':'鸡蛋怎么蒸'}) for _ in range(12)])
                responses=await batch()
                self.assertTrue(all(r.status_code==200 and r.json()['source']=='model' for r in responses))
                value['ai'].update(limitsEnabled=True,maxConcurrency=1,globalMinute=100)
                next_path=Path(folder)/'next';next_path.write_text(json.dumps(value));next_path.replace(path)
                responses=await batch()
                self.assertEqual(sum(r.json().get('source')=='model' for r in responses),1)
                unlimited = True
                responses=await asyncio.gather(*[client.post('/v1/assist',json={'prompt':'鸡蛋怎么蒸','unlimited':True}) for _ in range(12)])
                self.assertTrue(all(r.json()['source']=='model' for r in responses))
                path.write_text('{invalid')
                metric=(await client.get('/metrics')).json()
                self.assertTrue(metric['runtime']['ai']['limitsEnabled'])
                self.assertEqual(metric['runtime']['ai']['maxConcurrency'],1)
