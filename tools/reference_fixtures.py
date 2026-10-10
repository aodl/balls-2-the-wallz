#!/usr/bin/env python3
"""Independent stdlib reference vectors. --check compares; regeneration is explicit."""
import argparse, hashlib, json, struct, zlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def account(byte):
    digest=bytes([byte])*28
    return (zlib.crc32(digest).to_bytes(4,'big')+digest).hex()
def payloads():
    values=[('angle',n) for n in (0,1,16384,32768,49152,65535)]+[('move',n) for n in (0,1,65535,65536,123456789,4294967295)]
    lines=['# kind\tvalue\tblob_hex\tlegacy_nat64_decimal']
    for kind,n in values:
        b=b'BTZ'+bytes([0x11 if kind=='angle' else 0x12])+struct.pack('>I',n)
        lines.append(f'{kind}\t{n}\t{b.hex()}\t{int.from_bytes(b,"big")}')
    seal=b'DTRSEAL1'+struct.pack('>QQQQQI',0,0,10,100,110,2)+b''.join(bytes([i])*32 for i in range(1,9))
    out={'memos.tsv':'\n'.join(lines)+'\n','seal.hex':seal.hex()+'\n','seal.sha256':hashlib.sha256(seal).hexdigest()+'\n'}
    a={'provenance':'Synthetic CRC-valid account identifiers; not live wallet/payment instructions.','recipient':account(1),'alice':account(2),'bob':account(3),'other':account(4)}
    out['accounts.json']=json.dumps(a,indent=2)+'\n'
    memo=int.from_bytes(b'BTZ\x11\x00\x00\x40\x00','big')
    base={'kind':'Transfer','from':a['alice'],'to':a['recipient'],'amount_e8s':'1000000000','fee_e8s':'10000','spender':None,'memo':str(memo),'icrc1_memo':None}
    blob={**base,'memo':'0','icrc1_memo':'42545a1100004000'}
    out['payments.json']=json.dumps({'provenance':'Synthetic normalized decoded records. NOT Candid bytes, certified blocks or captured mainnet transactions.','legacy':base,'icrc':blob},indent=2)+'\n'
    return out

def main():
    p=argparse.ArgumentParser();p.add_argument('--check',action='store_true');args=p.parse_args();bad=[]
    for name,text in payloads().items():
        f=ROOT/'tests/fixtures'/name
        if args.check:
            if not f.exists() or f.read_text()!=text:bad.append(name)
        else:f.parent.mkdir(parents=True,exist_ok=True);f.write_text(text)
    if bad:raise SystemExit('Reference fixture mismatch: '+', '.join(bad))
    print('PASS: independent protocol fixtures '+('match' if args.check else 'generated'))
if __name__=='__main__':main()
