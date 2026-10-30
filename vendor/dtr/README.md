# DTR JavaScript package

B2Z consumes `@dtr/timeline-runtime@0.14.0` from `dtr-timeline-runtime-0.14.0.tgz`.

- source: `https://github.com/aodl/dtr.git`
- published revision: `e1bfcf25071d11190d14f461288e12a21ca26cf8`
- source tree: `fd5c687fd9a558d536c5ed47de771fad543cd032`
- Rust consumer revision: `77ba46cb2f0acd0b4b2eaeedf7dc9fd2dc0f6c68`
  (tree `068c66829619741b6784306929b51e292cb58bcf`, Rust 0.14.1-cost.1).
  This Rust-only change preserves the original JS 0.14.0 archive and its E1 provenance.
- SHA-256: `ea5e8f471ab15cadb09367c6391b74054918665f797381c776b630c5082938dc`
- npm integrity: `sha512-oJknKDDWjpmkYd1g7CNPiaV3MuTKWuquCZZiuRLJ3KsADHSDENTpYiKyiibANflPF59mKDtN/DaaHBDsNYDb1w==`
- npm shasum: `dc905ef38bedca648d5b85ec1ac0e4e6fe946375`
- packaging: Node24.15.0 / npm11.12.1; 23 files, normalized0644 source modes.

`tools/verify_dtr_consumers.py` resolves the exact published Rust revision through
ordinary Cargo resolution in a fresh Cargo home, archives its immutable object,
normalizes source modes, and reproduces the complete JS artifact. No sibling
source override or explicit remote Git command is used.

The 0.12.0 archive is historical S14 evidence: revision
`1f47c1a0a104875bd13475d561b8d5aa10770d99`, SHA-256
`933f42b1187c45083c4f6c69e6851fe2c77e15e8fa8fd198e13187ad3ff13d8f`.
The 0.11.0 archive remains historical S11–S13 evidence only.

The 0.13.0 archive remains immutable historical pacing-release evidence.
