# Worker API calls set their options by hand

- **Severity:** Medium. **Effort:** Medium. **Confidence:** High. **Harder later:** Yes.
- **Kind:** Fix after merge.
- **Added:** 2026-11-09, the wider fix of item 1 of the diagnosis of a failed org invitation, branch `calummoore/member-invite-failure`.
- **Location:** `worker/mail-sender.ts:37`, `worker/github/transport.ts:15`, `worker/lifecycle/image-sources/github-app.ts:37`, `worker/lifecycle/image-sources/github-app.ts:71`, `worker/sandbox/transport.ts:49`, `worker/security/github-refresh.ts:15`, and `worker/security/github.ts:37`, `:58`, and `:108`.
- **Reason:** The helper reaches six files outside the fix that restores invitation emails.

- **Terms:**
  - **Workers runtime:** the Cloudflare runtime, workerd, that runs the Worker in production. Miniflare runs the same runtime locally.
  - **Outside API:** a service that the Worker calls over HTTPS: GitHub, Boat, and Resend, the email service.
- **Background:**
  - Each Worker call to an outside API builds its own `Request` and sets its options by hand.
  - Each call must set `redirect: 'manual'`. The Workers runtime throws a `TypeError` for `'error'`. The value `'follow'` would send the credentials of the call on to the redirect target.
  - GitHub and Resend require a `User-Agent` header, and the Workers runtime adds none. Three files set `User-Agent: Conductive` by hand. The mail sender sets it since 9 November 2026.
  - The Worker tests run in Node, which accepts `redirect: 'error'`. The generated runtime type gives `redirect` as a plain `string`, so the typecheck accepts it too.
  - Until 9 November 2026, `worker/mail-sender.ts` used `redirect: 'error'`. Each invitation email failed in production with `502 invite_email_failed`, and every test passed. A run in Miniflare showed the error: "Invalid redirect value, must be one of "follow" or "manual"".
- **Problem:** Each call site repeats the redirect and header options. One missed or wrong option breaks a production feature, and no test or type check finds it.
- **Impact if no action:** A new call to an outside API can repeat the defect, and only a production failure shows it.
- **Root question:** How does each Worker call to an outside API get the options that the Workers runtime and the API need?
- **Options:**
  - **A.** Add one shared helper in `worker/http/` that builds each request to an outside API. It sets `redirect: 'manual'` and `User-Agent: Conductive`, and its options type has no redirect field. Move each call site of the Location list to it. Effort: Medium.
  - **B.** Run the Worker tests in the Workers runtime with the Cloudflare Vitest pool, so that each runtime error fails a test. It changes the harness of every Worker test. It is a test for the class, so it needs the user's approval. Effort: Large.
  - **C.** Add a lint rule that rejects `redirect: 'error'` in `worker/`. It does not cover the `User-Agent`. It is a new lint, so it needs the user's approval. Effort: Small.
- **Left out:** A local override of the runtime `RequestInit` type. It changes the type of every request in the Worker. `worker/http/request-body.ts` must keep the redirect mode of each incoming request, so the override would block it.
- **Wider fix:** A. It removes the hand-set options from each call site, so a call cannot get them wrong.
- **Previous examples:** `worker/mail-sender.ts` used `redirect: 'error'` until 9 November 2026. The other call sites in the Location list set `'manual'` by hand.
- **Related:** `plans/follow-ups/lifecycle-tests-on-real-object.md` and `plans/follow-ups/chat-tests-on-real-object.md` record other places where Node tests skip the Workers runtime. Option B overlaps with them.
- **Recommendation:** A. It prevents the defect for every outside call at a Medium cost. B finds more kinds of runtime errors, but it is Large.
- **Action:** fix after merge, apply A, because the helper reaches six files outside the fix that restores invitation emails.

Leave out `worker/previews/headers.ts` and `worker/http/request-body.ts`. The first forwards a browser request to a sandbox preview. The second rebuilds an incoming request and keeps its redirect mode. Neither calls an outside API. Keep each existing test of a call site. A test of the helper asserts the redirect mode and the header once.
