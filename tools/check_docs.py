#!/usr/bin/env python3
"""Check local links in current documentation (historical S00 retained unchanged)."""
import re,sys
from pathlib import Path
from urllib.parse import unquote
ROOT=Path(__file__).resolve().parents[1]
problems=[];count=0
paths=list((ROOT/'docs').rglob('*.md'))+list(ROOT.glob('*.md'))+list((ROOT/'checkpoints').glob('*.md'))
for path in paths:
    for raw in re.findall(r'\]\(([^)]+)\)',path.read_text()):
        target=raw.split(' ',1)[0]
        if target.startswith(('https:','http:','mailto:','#')):continue
        target=unquote(target.split('#',1)[0]);count+=1
        resolved=(path.parent/target).resolve()
        if target and not resolved.exists():
            # Archived reports retain their exact published links. Verify the renamed destination.
            historical=path.parent==ROOT/'checkpoints' or (path.name=='STATUS.md' and raw in path.read_text().split('<!-- ARCHIVED_STATUS -->',1)[-1])
            migrated=(path.parent/target.replace('BTZ_', 'B2Z_').replace('btz', 'b2z')).resolve()
            if not historical or not migrated.exists():problems.append(f'{path.relative_to(ROOT)} -> {target}')
if problems:print('\n'.join(problems),file=sys.stderr);raise SystemExit(1)
print(f'PASS: {count} current-document local links resolve. Historical S00 is retained unchanged.')
