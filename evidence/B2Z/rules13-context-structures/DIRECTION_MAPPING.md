# Screen direction and wire mapping

| Label | Screen arrow | Stored direction | Binary heading | Existing orientation code |
| --- | --- | --- | ---: | ---: |
| N | ↑ | NW | 40960 | 3 |
| E | → | NE | 57344 | 0 |
| S | ↓ | SE | 8192 | 1 |
| W | ← | SW | 24576 | 2 |

The fixed isometric projection maps the four existing world diagonals onto screen axes. The browser uses one vocabulary for the Rules13 controls and new memos. Canonical schema7 orientation values, the four integer velocity vectors and historical cannon headings remain unchanged.

Adapter8 uses the BTZPAY05 normalised envelope. Accepted text is `DEFLECT <cell> <N|E|S|W>`, `DROT <id> <N|E|S|W>` and `DMOVE <id> <cell>`. Each command has an exact canonical spelling and fits the 32 UTF-8 byte Ledger memo limit. Adapter7 retains its historical Deflector grammar with NE/SE/SW/NW. Replay binds each record to the adapter selected by its certified epoch.
