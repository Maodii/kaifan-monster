"""Real SSE chunks and socket-disconnect cancellation, using no external model."""
import asyncio
import json
import socket
import sys
import unittest
from pathlib import Path
import httpx
import uvicorn
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app import create_app
from test_gateway import settings, AUTH


def chunk(text='', finish=None):
    return ('data: '+json.dumps({'choices':[{'delta':{'content':text},'finish_reason':finish}]},ensure_ascii=False)+'\n\n').encode()

class StreamTests(unittest.IsolatedAsyncioTestCase):
    async def test_genuine_chunks_utf8_and_complete_contract(self):
        closed=[]
        class Body(httpx.AsyncByteStream):
            async def __aiter__(self):
                data=chunk('先备菜。')+chunk('再开火。', 'stop')
                for byte in data:
                    yield bytes([byte])
            async def aclose(self): closed.append(True)
        def provider(req):
            body=json.loads(req.content)
            self.assertTrue(body['stream']);self.assertFalse(body['enable_thinking'])
            return httpx.Response(200,stream=Body())
        app=create_app(settings(),httpx.MockTransport(provider))
        async with app.router.lifespan_context(app):
            async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app),base_url='http://test') as client:
                response=await client.post('/v1/assist/stream',headers=AUTH,json={'prompt':'晚餐'})
                events=[json.loads(line) for line in response.text.splitlines()]
                self.assertEqual([e['text'] for e in events if e['type']=='delta'],['先备菜。','再开火。'])
                self.assertEqual(events[-1]['result']['text'],'先备菜。再开火。')
                self.assertEqual(response.headers['cache-control'],'no-store')
        self.assertTrue(closed)

    async def test_incomplete_and_timeout_close_provider(self):
        for slow in [False, True]:
            closed=[]
            class Body(httpx.AsyncByteStream):
                async def __aiter__(self):
                    yield chunk('部分回复')
                    if slow: await asyncio.sleep(1)
                async def aclose(self):closed.append(True)
            app=create_app(settings(timeout=.05),httpx.MockTransport(lambda r:httpx.Response(200,stream=Body())))
            async with app.router.lifespan_context(app):
                async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app),base_url='http://test') as client:
                    response=await client.post('/v1/assist/stream',headers=AUTH,json={'prompt':'晚餐'})
                    last=json.loads(response.text.splitlines()[-1])
                    self.assertEqual(last['result']['source'],'fallback')
                    if slow:self.assertEqual(last['result']['reason'],'timeout')
            self.assertTrue(closed)

    async def test_real_http_disconnect_closes_upstream_and_releases_slot(self):
        entered,closed=asyncio.Event(),asyncio.Event()
        class Body(httpx.AsyncByteStream):
            async def __aiter__(self):
                entered.set()
                yield chunk('第一段')
                await asyncio.sleep(10)
            async def aclose(self):closed.set()
        app=create_app(settings(concurrency=1),httpx.MockTransport(lambda r:httpx.Response(200,stream=Body())))
        sock=socket.socket();sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
        server=uvicorn.Server(uvicorn.Config(app,log_level='error',access_log=False,lifespan='on'))
        task=asyncio.create_task(server.serve(sockets=[sock]))
        try:
            for _ in range(100):
                if server.started:break
                await asyncio.sleep(.01)
            self.assertTrue(server.started)
            async with httpx.AsyncClient(base_url=f'http://127.0.0.1:{port}',timeout=2,trust_env=False) as client:
                async with client.stream('POST','/v1/assist/stream',headers=AUTH,json={'prompt':'晚餐'}) as response:
                    async for line in response.aiter_lines():
                        if line:
                            self.assertEqual(json.loads(line)['text'],'第一段');break
                await asyncio.wait_for(closed.wait(),2)
                # Another call is admitted, proving the concurrency slot was released.
                closed.clear()
                async with client.stream('POST','/v1/assist/stream',headers=AUTH,json={'prompt':'第二次晚餐'}) as response:
                    async for line in response.aiter_lines():
                        if line:
                            self.assertEqual(json.loads(line)['type'],'delta');break
                await asyncio.wait_for(closed.wait(),2)
        finally:
            server.should_exit=True
            await asyncio.wait_for(task,4)
            sock.close()
