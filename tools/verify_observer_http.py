#!/usr/bin/env python3
"""Run the existing observer against a real loopback HTTP server and browser."""
import argparse
import os
import signal
import socket
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]

def free_port():
    with socket.socket() as listener:
        listener.bind(('127.0.0.1',0))
        return listener.getsockname()[1]

def wait_for_server(url,process,timeout=10):
    deadline=time.monotonic()+timeout
    while time.monotonic()<deadline:
        if process.poll() is not None:raise RuntimeError(f'observer server exited with {process.returncode}')
        try:
            with urllib.request.urlopen(url,timeout=.5) as response:
                if response.status==200:return
        except Exception:time.sleep(.05)
    raise TimeoutError('observer server did not become ready')

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--output',type=Path,default=ROOT/'.work/browser-http')
    parser.add_argument('--local-snapshot',type=Path);args=parser.parse_args()
    args.output.mkdir(parents=True,exist_ok=True);port=free_port();url=f'http://127.0.0.1:{port}/apps/btz-observer/'
    server_command=[sys.executable,'-B','tools/serve_observer.py','--port',str(port)]
    browser_command=[sys.executable,'-B','tools/browser_observer.py','--mode','http','--url',url,'--output',str(args.output)]
    if args.local_snapshot:
        snapshot=args.local_snapshot.resolve()
        required={'metadata.json','catalog.bin','certificate.cbor','root-key.der','initial-state.bin','state.bin','events.bin','scores.bin'}
        if not snapshot.is_dir() or not required.issubset({path.name for path in snapshot.iterdir() if path.is_file()}):
            parser.error('--local-snapshot is incomplete')
        assets=ROOT/'.work/s09/browser-assets';assets.mkdir(parents=True,exist_ok=True)
        subprocess.run([str(ROOT/'node_modules/.bin/esbuild'),'packages/client/ic-certificate.mjs','--bundle','--format=esm','--platform=browser',f'--outfile={assets}/ic-certificate.mjs'],cwd=ROOT,check=True)
        server_command+=['--local-snapshot',str(snapshot),'--generated-assets',str(assets)]
        url+='?mode=local';browser_command=[sys.executable,'-B','tools/browser_observer.py','--mode','http','--trust','local','--url',url,'--output',str(args.output)]
    with (args.output/'server.log').open('w') as server_log:
        server=subprocess.Popen(server_command,cwd=ROOT,stdout=server_log,stderr=subprocess.STDOUT,text=True,start_new_session=True)
        try:
            wait_for_server(url,server)
            result=subprocess.run(browser_command,cwd=ROOT)
            return result.returncode
        finally:
            if server.poll() is None:
                os.killpg(server.pid,signal.SIGTERM)
                try:server.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    os.killpg(server.pid,signal.SIGKILL);server.wait()
if __name__=='__main__':raise SystemExit(main())
