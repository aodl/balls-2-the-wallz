# DTR JavaScript package

BTZ consumes `@dtr/timeline-runtime@0.12.0` from the committed `dtr-timeline-runtime-0.12.0.tgz`, not a sibling path or registry publication.

- source: `https://github.com/aodl/dtr.git`
- published revision: `1f47c1a0a104875bd13475d561b8d5aa10770d99`
- source tree: `467bd2e25b1cf356ecdced7d69e26514a764c045`
- SHA-256: `3e04294abee75b7b8a42d72000fb09068ce8700567729af98b9f7aa53470cdcb`
- npm integrity: `sha512-gF/H0uxQh1xQMqTdis4VmzeI16ArPdlZK+Fjb6cHboz9qg2PE00SqCEJuikvS2sYxLUQNtODbuBm7Njq5rN1lQ==`
- npm shasum: `7e32e3d0310226f3b70bf53dde58e288cff7fca5`
- packaging: Node 24.15.0 / npm 11.12.1; 20 packaged files inspected

`tools/verify_dtr_consumers.py` resolves the published immutable dependency through ordinary Cargo resolution in an empty Cargo home, archives that exact local Git object, normalizes directory/file modes to 0755/0644, packs it and compares the complete package and lock integrity. It runs isolated Rust and installed JavaScript consumers outside both source trees without explicit remote Git operations. Byte reproduction is checked only with the recorded npm version; full source correspondence is always required.

The 0.11.0 tarball is retained solely for historical S11–S13 evidence/benchmark inputs. Its SHA-256 is `dc460b1a5349f022d0ba789fd7e647271f41402de2e57a9c8c4ba860834a4bf8`, source revision `71e59e93cf49a3656689679b538b4c3f138787f8`. It is no longer the application's dependency.
