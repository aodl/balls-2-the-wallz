# Official asset inventory

The supplied ZIP was inspected before copying. Both SVGs have intrinsic dimensions and named artwork. Neither contains script or external resources. The three shipped artwork files are byte-for-byte originals.

| ZIP file | Same-origin public path | Bytes | SHA-256 |
| --- | --- | ---: | --- |
| balls-to-the-wallz-b2z-wordmark.svg | /balls-to-the-wallz-b2z-wordmark.svg | 10,981 | `0e5090613b73948228b406845244f7eb0d42df9a3ed0a2fc6fb2b5398066296b` |
| balls-to-the-wallz-b2-icon-matched.svg | /balls-to-the-wallz-b2-icon-matched.svg | 12,829 | `42bd1317cbf53a0566b24e8ef477d0de759aeaae914b27fa3718e9829a87d872` |
| balls-to-the-wallz-b2-icon-matched-favicon.ico | /favicon.ico | 66,640 | `e34ccbadc26ea0c6745d275041daea741ebc9fbba1899d59ae14e54fcffccceb` |
| balls-to-the-wallz-b2-icon-matched-preview.png | Reference only | 97,500 | `2cd98b317fcb5470350eb6d70c51a5a0e066c7b76b5c5d6444900d3ca73b939f` |

One source copy of each shipped asset lives in `apps/b2z-observer`. The current build records them along with `404.html` and `not-found.css`. The replaced browser metadata no longer selects the old `/icon.svg` asset. Its prior URL remains available.
