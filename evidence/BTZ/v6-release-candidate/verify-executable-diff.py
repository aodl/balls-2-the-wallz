"""Read-only comparison of two preserved Wasm artifacts; no rewriting."""
from pathlib import Path
import hashlib, json

def leb(b, at, signed=False):
    n=shift=0
    while True:
        v=b[at];at+=1;n|=(v&127)<<shift;shift+=7
        if v<128:break
    if signed and v&64:n-=1<<shift
    return n,at

def sections(p):
    b=p.read_bytes();assert b[:8]==bytes.fromhex('0061736d01000000');at=8;ordinary={};custom={}
    while at<len(b):
        sid=b[at];n,at=leb(b,at+1);body=b[at:at+n];at+=n
        if sid:assert sid not in ordinary;ordinary[sid]=body
        else:
            length,k=leb(body,0);name=body[k:k+length].decode();assert name not in custom;custom[name]=body[k+length:]
    return ordinary,custom

def segments(body):
    count,at=leb(body,0);rows=[]
    for _ in range(count):
        flag,at=leb(body,at);base=None
        if flag in (0,2):
            if flag==2:memory,at=leb(body,at);assert memory==0
            assert body[at]==0x41;base,at=leb(body,at+1,True);assert body[at]==0x0b;at+=1
        else:assert flag==1
        length,at=leb(body,at);rows.append((base,at,body[at:at+length]));at+=length
    assert at==len(body);return rows

old_path=Path('.work/v6-release-frozen/normal.wasm');new_path=Path('.work/v6-final-release-frozen/normal.wasm')
old,oc=sections(old_path);new,nc=sections(new_path)
assert old.keys()==new.keys() and all(old[k]==new[k] for k in old if k!=11)
assert oc.keys()==nc.keys() and all(oc[k]==nc[k] for k in oc if k!='name')
a,b=old[11],new[11];assert len(a)==len(b);sa,sb=segments(a),segments(b)
assert [(x,len(z))for x,_,z in sa]==[(x,len(z))for x,_,z in sb]
changes=[i for i,(x,y)in enumerate(zip(a,b))if x!=y];locations={}
def source(ptr,length):
    for base,_,data in sa:
        if base is not None and base<=ptr and ptr+length<=base+len(data):return data[ptr-base:ptr-base+length].decode('utf8')
    raise ValueError('unmapped source pointer')
for at in changes:
    found=False
    for base,start,data in sa:
        if base is None or not start<=at<start+len(data):continue
        for record in range(max(start,at-15),at-7):
            if (base+record-start)%4 or not record+8<=at<record+16:continue
            if a[record:record+8]!=b[record:record+8]:continue
            ptr=int.from_bytes(a[record:record+4],'little');length=int.from_bytes(a[record+4:record+8],'little')
            if length!=69:continue
            try:path=source(ptr,length)
            except (UnicodeError,ValueError):continue
            if path!='/home/codexdev/src/b2z-prelaunch-rules/native/b2z-native/src/spawn.rs':continue
            locations[record]={'source':path,'old_line':int.from_bytes(a[record+8:record+12],'little'),'old_column':int.from_bytes(a[record+12:record+16],'little'),'new_line':int.from_bytes(b[record+8:record+12],'little'),'new_column':int.from_bytes(b[record+12:record+16],'little')};found=True;break
        if found:break
    assert found,('unexplained data difference',at)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
result={'status':'PASS','old_wasm_sha256':sha(old_path),'new_wasm_sha256':sha(new_path),'all_instruction_type_import_export_global_memory_table_and_element_bytes_equal':True,'custom_sections_equal_except_debug_name':True,'different_data_bytes':len(changes),'all_data_differences_are_source_location_coordinates':True,'panic_locations':list(locations.values()),'scope':'Artifact structure comparison only. Final installed browser/authentication/replay gate still required; measured instruction-cost and capacity paths are unchanged.'}
Path('.work/v6-executable-diff-proof.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result,indent=2))
