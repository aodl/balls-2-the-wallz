# Current generic recovery package

`dtr-timeline-runtime-0.16.0.tgz` is packed from immutable published source
https://github.com/aodl/dtr.git at `1c7fa8b3bd2c3973a9dc6525b2fe8bb744f21e2e`
(tree `87df48cfa2278ec9d3afa75d480e97459ffb0c31`). SHA-256:
`c19e6e31db3f56aed51c693b3ce1413c2887ec5fdb8c1d9f6fee3f3a76342f22`.
The v4 recovery epoch retains exact pending source obligations. The package
and clean remote consumers are checked by `tools/verify_dtr_consumers.py`.
The 0.15.0 package below remains historical application-checkpoint evidence.

---

# Historical generic application-checkpoint package

`dtr-timeline-runtime-0.15.0.tgz` is packed from immutable published source
https://github.com/aodl/dtr.git at `282d709143dacb4bca769a4d6e72b97fc93ef518`
(tree `1e487a321de4f515510da01ac74ef66e4e9a71a6`). SHA-256: `22fb89851542ce19361a3b78a35c8a921d65e65e27890050b23cfcd1375e7720`.
Pack tool: npm 11.12.1, source modes normalized to
0644 files / 0755 directories. Package payload and clean remote consumers
are verified separately by `tools/verify_dtr_consumers.py`.
This generic extension adds no game-specific clock, scheduler or payment logic.
Previous package/source records below remain historical and unchanged.

---

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
