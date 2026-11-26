# Repository and evidence maintenance

An ordinary checkout contains source, specifications, locks, deterministic
fixtures, approved application assets, predecessor executables used by real
upgrade tests, release manifests and concise reviewed evidence. Keep required
historical interpreters, goldens, and replay inputs in their existing places.
Use a small set of approved visual references where they serve a current contract.

Write full recordings, profiling, diagnostic traces, intermediate builds
and unreviewed failures under `.work/`. Before cleaning it, distinguish
regenerable output from unique production observations and original failure
evidence, financial reconciliation, frozen executables and release preparation.
Review paths and permissions before copying anything out. Keep credentials,
identity material and sensitive local financial records off Git and public
archives.

Keep significant raw acceptance, original failures, recordings needed for
historical analysis and exact production and recovery executables in verified
durable storage. For already-published evidence, an immutable commit on preserved
history can serve as the archive. Record path, provenance, byte count, SHA-256,
category and retrieval method. Verify retrieval against the manifest before
removing a tracked copy. Preserve the original report and link to the archived
report tree when its relative references have moved. Use separate release assets
or owner-controlled durable storage for exact executables, unique local evidence
and material held only in expiring CI. Confirm a download before declaring
preservation complete. [Historical archive](../../evidence/B2Z/repository-consolidation/ARCHIVE.md) · [Production release retention](PRODUCTION_RELEASES.md)

## Repository hygiene gate

```sh
python3.11 -B tools/check_repository_hygiene.py
```

The gate reviews committed source against the pre-consolidation tree. It rejects
new large files, unapproved raw evidence media, tracked cache and credential
paths, missing release pins and inconsistent archive entries. The reviewed
baseline accommodates existing legitimate runtime assets and fixtures. For
new essential large inputs, add a path-specific size ceiling and reason in
`config/repository_hygiene.json`. Archive raw output if it serves only as
historical evidence. A collection's concise reports and machine-readable
findings should remain easy to find. Recheck archive SHA-256 values with
`--verify-history` when changing the archive manifest.

## Committed-source review ZIP

```sh
python3.11 -B tools/package_review.py .work/b2z-review.zip
python3.11 -B tools/package_review.py .work/b2z-review.zip --verify
```

The exporter reads the committed Git tree and uses no production access or
dependency installation. It refuses a dirty checkout by default. Use
`--ref <commit>` to export a deliberately chosen commit from a working checkout.
The ZIP contains a source guide, included-file inventory, checksums and a
per-path omissions manifest. Review packages omit large runtime FLAC files,
historical Wasms, much of the old evidence and Git history. The archive guide
identifies tests that can run with the included files and how to retrieve
omissions. The goal is a compressed review ZIP under 50 MB.

Exact builds and full qualification use the complete checkout with committed
locks. `tools/package_checkpoint.py` retains the comprehensive checkpoint
workflow and its included-file verification. Its checkpoint metadata remains
historical. Exporting a review ZIP does not replace that workflow or qualify
an executable.
