# Preview origins can reach other sites

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-06, from PR #9, branch `conductor/boat-native-remote-workspaces-milestone-11`, two new problems of the round 2 check of finding 5.
- **Location:** `docs/protocol/access-and-security.md:174` and `worker/previews/headers.ts:137`.
- **Reason:** one problem comes from the protocol's own design, and the other is not verified against Boat.

- **Terms:**
  - **Preview origin:** the random hostname of a port preview. It is the credential of the preview, so it must not leak.
- **Background:** The access protocol gives port previews a `no-referrer` policy, so that the preview origin does not leak to other sites.
- **Problem:**
  - Browsers always send `Origin` on cross-origin requests and WebSocket handshakes. In Chrome 157, a cross-origin `fetch` under `no-referrer` sent the page origin. So `no-referrer` does not keep the preview origin away from other sites.
  - The redirect rewrite matches only Boat's `https` origin. An app behind Boat's TLS proxy that sees plain HTTP can answer with an absolute `http://` redirect to Boat's private URL, which then fails. This happens only if Boat sends no `X-Forwarded-Proto`, which Boat's docs do not say.
- **Impact if no action:** A preview page can leak its own credential hostname to a site that it calls, and an app can break on a redirect.
- **Root question:** How does a preview keep its credential hostname away from other sites, and how do its redirects stay on the preview?
- **Options:**
  - **A.** Accept the leak: the hostname lives 24 hours at most. Match `http` as well as `https` in the redirect rewrite. Effort: Small.
  - **B.** Move the credential out of the hostname, into a cookie that the preview domain sets, so that the origin is no secret. Effort: Medium.
  - **C.** B, and a check of Boat's forwarded headers in the live smoke test. Effort: Medium.
- **Left out:** None.
- **Wider fix:** B.
- **Previous examples:** None found.
- **Recommendation:** C.
- **Action:** ask the user, because B changes how the protocol protects a preview.
