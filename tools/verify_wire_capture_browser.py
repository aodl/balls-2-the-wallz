#!/usr/bin/env python3
"""Disposable real HTTP/browser capture regression; content replay, NOT IC authentication."""
import argparse
import contextlib
import hashlib
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import shutil
import subprocess
import tarfile
import threading
import time
import traceback
from wire_capture import WireCapture

ROOT = Path(__file__).resolve().parents[1]
FIXTURE_SHA = 'a41c1dae50bfe4d61e2f4a06b2987c696421b264577db08513db94f81fb7d33b'


def main():
    ap=argparse.ArgumentParser();ap.add_argument('--output',type=Path,required=True);a=ap.parse_args();out=a.output.resolve();out.mkdir(parents=True,exist_ok=False)
    fixture=ROOT/'tests/fixtures/capture-wire-v5.tar.gz';assert hashlib.sha256(fixture.read_bytes()).hexdigest()==FIXTURE_SHA
    data=out/'fixture';data.mkdir()
    with tarfile.open(fixture)as tar:
        for member in tar.getmembers():assert member.isfile()and Path(member.name).name==member.name
        tar.extractall(data,filter='data')
    manifest=json.loads((data/'manifest.json').read_text())
    for name,entry in manifest['files'].items():assert hashlib.sha256((data/name).read_bytes()).hexdigest()==entry['sha256']
    packets={i:(data/f'{i:04}.cbor').read_bytes()for i in range(81)}
    methods={i:manifest['files'][f'{i:04}.cbor']['method']for i in packets}
    class Handler(BaseHTTPRequestHandler):
        protocol_version='HTTP/1.1'
        def log_message(self,*args):pass
        def do_GET(self):
            body=b'<html><script>globalThis.__dtrLive={heads:[80]};globalThis.aborters={};globalThis.fetchErrors=[];</script></html>'
            self.send_response(200);self.send_header('Content-Length',str(len(body)));self.send_header('Content-Type','text/html');self.end_headers();self.wfile.write(body)
        def do_POST(self):
            self.rfile.read(int(self.headers['Content-Length']));_,mode,idtext,_=self.path.split('/');i=int(idtext);body=packets[i]
            if mode=='malformed'and i==0:body=b'not-cbor'
            self.send_response(200);self.send_header('Content-Type','application/cbor');self.send_header('Content-Length',str(len(body)+(100 if mode=='incomplete'and i==0 else 0)));self.end_headers()
            with contextlib.suppress(BrokenPipeError,ConnectionResetError):
                half=min(64,len(body));self.wfile.write(body[:half]);self.wfile.flush()
                if mode in ['timeout','cancel','abort_scope']and i==0:time.sleep(2)
                elif mode=='delayed'and i in [0,1,80]:time.sleep(.8)
                if mode=='incomplete'and i==0:self.close_connection=True;return
                self.wfile.write(body[half:]);self.wfile.flush()
    server=ThreadingHTTPServer(('127.0.0.1',0),Handler);thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
    report={'qualification':'Capture lifecycle fixture only; expired preserved wire content is not new IC authentication or a historical gate PASS.','checks':[],'status':'IN_PROGRESS','fixture_sha256':FIXTURE_SHA}
    def save():
        (out/'results.json').write_text(json.dumps(report,indent=2)+'\n')
    def run_gate(case,expect_success):
        shutil.copyfile(data/'initial-world.bin',case/'initial-world.bin')
        for script,args in [('capture_million_history.mjs',[str(case)]),('replay_s14.mjs',[str(case/'history.json'),str(case/'replay.json')])]:
            with(case/(script+'.log')).open('w')as log:r=subprocess.run(['node','tools/'+script,*args],cwd=ROOT,stdout=log,stderr=subprocess.STDOUT)
            if script.startswith('capture'):
                assert (r.returncode==0)==expect_success,(case,script)
                if not expect_success:return
            else:assert r.returncode==0,(case,script)
    try:
        from playwright.sync_api import sync_playwright
        with sync_playwright()as pw:
            browser=pw.chromium.launch(headless=True,chromium_sandbox=True);assert browser.version=='153.0.8010.12';report['browser_version']=browser.version;report['sandbox']=True
            scenarios=[('delayed',list(range(81)),True),('incomplete',[0],False),('cancel',[0],False),('timeout',[0],False),('malformed',list(range(81)),True),('missing',[i for i in range(81)if i!=17],True),('close_before_fence',[0],False),('abort_scope',[0],False)]
            for mode,ids,expect_capture in scenarios:
                case=out/mode;case.mkdir();context=browser.new_context();page=context.new_page();page.goto(f'http://127.0.0.1:{server.server_port}/')
                capture=WireCapture(page,case/'wire-catalogs',max_packets=4096,max_bytes=128*1024*1024,timeout_seconds=.2 if mode=='timeout'else 10)
                page.evaluate('''items=>{for(const {id,method,mode}of items){const controller=new AbortController();aborters[id]=controller;fetch('/'+mode+'/'+id+'/query',{method:'POST',body:method+':'+id,signal:controller.signal}).then(r=>r.arrayBuffer()).catch(e=>fetchErrors.push(String(e)));}}''',[{'id':i,'method':methods[i],'mode':'normal'if mode in ['missing','close_before_fence']else mode}for i in ids])
                deadline=time.monotonic()+15
                while capture.sequence<len(ids)and time.monotonic()<deadline:page.wait_for_timeout(10)
                assert capture.sequence==len(ids),(mode,capture.sequence)
                if mode=='cancel':page.evaluate('aborters[0].abort()')
                if mode=='close_before_fence':context.close()
                final_error=None;began=time.monotonic()
                try:
                    if mode=='abort_scope':
                        with contextlib.ExitStack()as finalizers:
                            finalizers.push(capture)
                            raise SystemExit(143)
                    else:capture.finish(lambda:page.evaluate('globalThis.__dtrLive.heads.at(-1)'))
                except (Exception,SystemExit)as e:final_error=str(e)
                elapsed=time.monotonic()-began
                assert (final_error is None)==expect_capture,(mode,final_error)
                if mode=='timeout':assert elapsed<1.5,(mode,elapsed)
                if mode=='abort_scope':
                    assert final_error=='143'and not capture.pending
                    assert page.evaluate('1+1')==2  # driver/context still alive after bounded abort
                    assert (case/'wire-catalogs/0000.cbor').read_bytes()==packets[0]
                    assert capture.finalization['status']=='FAIL'and capture.fence is None
                if expect_capture:
                    assert not capture.pending
                    if mode=='delayed':
                        assert capture.peak_pending>=2,capture.peak_pending
                        assert capture.finalization['pending_at_fence'],capture.finalization
                    # New post-fence responses cannot append to the capture.
                    if mode!='delayed':
                        count=capture.sequence;page.evaluate("fetch('/normal/0/query',{method:'POST',body:'observation_bundle:late'}).catch(()=>{})");page.wait_for_timeout(20);assert capture.sequence==count
                with contextlib.suppress(Exception):context.close()
                index=capture.index([]);(case/'wire-index.json').write_text(json.dumps(index,indent=2)+'\n')
                if expect_capture:
                    assert index['errors']==[]
                    assert [p['sequence']for p in index['packets']]==list(range(len(ids)))
                    for packet in index['packets']:
                        i=int(packet['url'].split('/')[-2]);expected=b'not-cbor'if mode=='malformed'and i==0 else packets[i]
                        assert (case/'wire-catalogs'/packet['file']).read_bytes()==expected
                        assert packet['request_sha256']==hashlib.sha256((methods[i]+':'+str(i)).encode()).hexdigest()
                else:
                    assert index['errors'];assert index['error_context'];assert index['capture_finalization']['status']=='FAIL'
                run_gate(case,mode=='delayed')
                if mode=='delayed':assert json.loads((case/'replay.json').read_text())['segments']==81
                if mode=='missing':assert 'captured publication gap'in(case/'capture_million_history.mjs.log').read_text()
                report['checks'].append({'name':mode,'status':'PASS','capture_expected_success':expect_capture,'shutdown_ms':elapsed*1000,'peak_pending':capture.peak_pending,'observed_capture_errors':index['errors'],'independent_replay':'PASS 81 segments'if mode=='delayed'else'expected gate failure; replay NOT_RUN'});save()
            browser.close()
        report['status']='PASS';save();print(json.dumps(report,indent=2));return 0
    except Exception as e:
        report['status']='FAIL';report['error']=repr(e);save();traceback.print_exc();return 1
    finally:
        server.shutdown();server.server_close();thread.join(timeout=5)
        files=sorted(p for p in out.rglob('*')if p.is_file()and p.name!='SHA256SUMS');(out/'SHA256SUMS').write_text(''.join(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+str(p.relative_to(out))+'\n'for p in files))


if __name__=='__main__':raise SystemExit(main())
