# Immutable frontend qualification

| Identity | Value |
| --- | --- |
| Reviewed source tested by the immutable-build job | `ab66e175148405d3bb50e1fe2ba2a4bca2b8fa3e` |
| Frozen browser source | `907536df11cbd620b48ea9cde62bc07ebeb6a373` |
| Raw frontend Wasm SHA-256 | `b8a2252c59db613379a6cdc09f88f00e4e68758ca612c9b67d8eea7b47b927f7` |
| Embedded website | 84 public assets, including all 61 original audio assets |
| Raw Wasm | 77,062,823 bytes (73.49 MiB) |
| Gzip archive | 75,297,739 bytes |

The raw artifact is the proposed install input. The measured raw module is 27,794,777 bytes below the 100 MiB bound. The code section and custom section measurements are in [the module record](module.json). A disposable IC accepted this exact artifact with the bounded chunked-code path and reported its raw SHA-256.

Two separate hosted compiles matched byte-for-byte. Both also matched the local raw module. Single-byte changes to HTML, JavaScript, CSS, the official SVG and one FLAC each changed the raw module hash. Restoring the original inputs reproduced the original module. [Proof and mutation hashes](reproducibility.json) · [Hosted build and download](https://github.com/aodl/balls-2-the-wallz/actions/runs/44611814525)

The first disposable prototype used the same architecture and demonstrated the exact legacy-to-embedded upgrade. It registered internal gzip filenames as extra URLs through the library's defaults. The final router removes those entries while retaining negotiated gzip. The first rehearsal then loaded the exact legacy snapshot and independently verified all 80 original public bodies before running the final module upgrade on the same canister. [Legacy recovery proof](legacy-recovery.json)

The exact final module returned the expected bytes and a valid IC-v2 response witness for all 84 public paths, six negotiated gzip variants and every HEAD representation. A further 28 route/method checks covered the root, true 404 for non-existent page and asset URLs, and private manifest or compression-storage paths. Changed-body and changed-status witnesses failed verification. A standalone browser loaded the production Rules12 world through its original authentication path, decoded all 60 FLAC payloads from the exact embedded module and displayed the certified 404 without application scripts. [HTTP verification](http-certification.json) · [Browser and audio results](browser-results.json) · [Live read-only Rules12 capture](captures/rules12-authenticated.png) · [Actual 404 capture](captures/certified-404-320.png)

The exact legacy-to-immutable upgrade on the disposable application subnet took 105.90 s. The before/after measurements include the retained legacy snapshot. Total reported memory moved from 165,041,352 bytes to 313,131,193 bytes. The measured debit was 184,312,741,561 cycles for the scoped code staging and upgrade window. A clean system-subnet install took 193.53 s and used 154,723,555 bytes of reported memory. Its zero charged debit is a system-subnet observation. [Actual before/after records](operating-measurements.json)

The full certificate sweep made 90 GET measurements with a median of 197 ms and range of 19 ms to 10.20 s. The 60 actual browser audio fetch/decode measurements had a median of 1.23 s and ranged from 0.55 s to 82.72 s. The long outliers occurred in a shared environment with concurrent browser, installation or qualification work. These observations establish successful decode and visible application access. They leave quiet, production gateway and physical-device performance open.
