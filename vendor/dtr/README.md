# DTR JavaScript package

BTZ consumes `@dtr/timeline-runtime@0.12.0` from the committed `dtr-timeline-runtime-0.12.0.tgz`, not a sibling path or registry publication.

- source: `https://github.com/aodl/dtr.git`
- published revision: `1f47c1a0a104875bd13475d561b8d5aa10770d99`
- source tree: `467bd2e25b1cf356ecdced7d69e26514a764c045`
- SHA-256: `933f42b1187c45083c4f6c69e6851fe2c77e15e8fa8fd198e13187ad3ff13d8f`
- npm integrity: `sha512-OHPZuFQU6B/0kQz6YsAZ/8O9VZ0/bQUOp25uF71a+DIBUSo7k4ef5PSo3JWAcUA1CDTeG0ZS+G5jPEC0xvBG1w==`
- npm shasum: `ca678b00d2b128f3afaa6a7edf5cf4896a4bfe34`
- packaging: Node 24.15.0 / npm 11.12.1; 20 packaged files inspected

`tools/verify_dtr_consumers.py` resolves the published immutable dependency through ordinary Cargo resolution in an empty Cargo home, archives that exact local Git object, normalizes directory/file modes to 0755/0644, packs it and compares the complete package and lock integrity. It runs isolated Rust and installed JavaScript consumers outside both source trees without explicit remote Git operations. Byte reproduction is checked only with the recorded npm version; full source correspondence is always required.

The 0.11.0 tarball is retained solely for historical S11–S13 evidence/benchmark inputs. Its SHA-256 is `dc460b1a5349f022d0ba789fd7e647271f41402de2e57a9c8c4ba860834a4bf8`, source revision `71e59e93cf49a3656689679b538b4c3f138787f8`. It is no longer the application's dependency.

The original S14 development tarball SHA-256 was `3e04294abee75b7b8a42d72000fb09068ce8700567729af98b9f7aa53470cdcb`. Its 20 payloads are identical; eleven members used mode 0600. The published-dependency continuation deliberately normalizes all files to 0644; the current archive above is checked byte-for-byte against a fresh published-source pack.
