# DTR JavaScript package

B2Z consumes `@dtr/timeline-runtime@0.13.0` from `dtr-timeline-runtime-0.13.0.tgz`.

- source: `https://github.com/aodl/dtr.git`
- published revision: `c12af747190f7e24d5e68cdf57dbb1494095a46b`
- source tree: `59978f78eaf290f3780e4854d0f51b6898fec13c`
- SHA-256: `324f764deeeeaf1762b2d5a3d1368287009c0c08ba7e2e3806a943e3bf42e86c`
- npm integrity: `sha512-zCZNuGGeqrFj7g/FP4y6GQzHC3WWQUA4ehhbdeE1PGbG2lzNoz1tIwma9L0ToHibulGv1PNa/asaX25XjOpEsw==`
- npm shasum: `88a818dd6c03437f0f2463399d528a799ede9298`
- packaging: Node24.15.0 / npm11.12.1; 23 files, normalized0644 source modes.

`tools/verify_dtr_consumers.py` resolves the exact published Rust revision through
ordinary Cargo resolution in a fresh Cargo home, archives its immutable object,
normalizes source modes, and reproduces the complete JS artifact. No sibling
source override or explicit remote Git command is used.

The 0.12.0 archive is historical S14 evidence: revision
`1f47c1a0a104875bd13475d561b8d5aa10770d99`, SHA-256
`933f42b1187c45083c4f6c69e6851fe2c77e15e8fa8fd198e13187ad3ff13d8f`.
The 0.11.0 archive remains historical S11–S13 evidence only.
