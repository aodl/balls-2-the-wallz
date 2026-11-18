# Recovery compatibility

No recovery or rollback operation was needed. The production backend crossed both prepared-record boundaries and now writes schema7 with adapter7. A Rules7 or Rules11 module cannot serve as a blind downgrade. Preserve the current durable journals, epochs, cursors and history. Any backend repair must be compatible with the actual persisted state and follow the qualified recovery gates.

The approved 81-file graphite recovery project remains preserved separately from the installed production assets. The older 80-file frontend is a historical freeze and cannot verify the Rules12 schema. An asset-delivery recovery may use the 81-file copy under the approved process. A runtime defect requires a separately qualified compatible fix. [Recovery boundaries](../boundary-deflector/RELEASE_PLAN.md) · [Exact assets](ARTIFACTS.md)
