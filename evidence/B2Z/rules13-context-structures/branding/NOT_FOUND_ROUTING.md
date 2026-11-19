# Not-found routing

**Static branded page PASS. Arbitrary-path certified 404 BLOCKED on the installed renderer.**

The production frontend module `04e565b3425fe7510ee16b02adcfe3f01abc9a2725c82a21cb08969241debd62` was freshly confirmed with certified read-only metadata. A disposable observer installed the identical compressed module, then served the candidate including `/404.html`.

The known `/404.html` path returned HTTP 200, exact branded HTML and an independently verified exact-path IC-v2 witness. The page showed the entire circular SVG, used standalone CSS, ran with JavaScript disabled, issued no paid-backend requests and returned to `/` by keyboard.

The requested unknown routes `/blah`, `/nonexistent/page`, `/nonexistent/page/` and query-string form all returned the ordinary game body with status 200. Missing .js, .css, .svg and .bin followed the same fallback. The fresh production read-only sample still showed the existing game fallback. Neither produced a branded 404 proof. All actual asset paths remained available in the unchanged upload policy. [Disposable route and witness results](disposable-http.json)

The legacy module's compile-time fallback is `/index.html`. Disabling aliasing on that asset in the disposable instance retained the unknown-path game fallback and produced a gateway error at the actual site root. That setting was restored and does not belong in the workspace build. [Legacy implementation](https://github.com/dfinity/sdk/blob/0.31.0/src/canisters/frontend/ic-certified-assets/src/state_machine/mod.rs)

The smallest separately qualifiable same-origin change is a compatible asset-canister module that replaces the root wildcard with a certified HTTP 404 response bound to the uploaded `/404.html`, while leaving exact-path 200 responses, the existing `/` alias, deployment permissions and stable asset decoding intact. Rehearse both upgrade and rollback with the full inventory on the exact predecessor before asking for approval. A migration to the official certified static-site canister is another implementation option and requires its own stable-state and upload-path review. [Certified static-site routing](https://docs.internetcomputer.org/guides/frontends/static-site/routing/)
