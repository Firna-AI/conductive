# Type Worker error codes from one catalogue

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-11, from review finding 5 of `calummoore/betterstack-implementation-brainstorm`.
- **Location:** `worker/error-reporting/codes.ts`, `worker/http.ts`, `worker/app-api/feedback-mail.ts`, `worker/features/result.ts`, and `worker/devices/internal.ts`.
- **Reason:** The missing tag needs unusual email configuration or an outside-service fault. Its fix costs the same after merge and needs no migration.

- **Source:** Review. **Category:** Product bug.
- **Terms:**
  - **Catalogue:** The fixed set of error codes that a report can retain, in `worker/error-reporting/codes.ts`.
  - **HttpError:** The Worker error class in `worker/http.ts`. It carries an HTTP status, code, message, and optional details.
  - **Relayed code:** A code from a trusted Durable Object result that the Worker puts in another HttpError.
- **Background:**
  - `docs/protocol/error-reporting.md` requires reports to include the fixed code of a known error when it applies. The filter must exclude private values.
  - The catalogue has 123 codes. `knownWorkerErrorCode` returns no value for a code outside that set.
  - `sendFeedbackEmail` in `worker/app-api/feedback-mail.ts` throws HTTP 503 with `feedback_unavailable` when `FEEDBACK_EMAIL` is blank.
  - It throws HTTP 502 with `feedback_email_failed` for a failed send. The sender in `worker/mail-sender.ts` fails for a missing Resend key, a failed request, a non-OK reply, a redirect, or its time limit.
  - Both fixed feedback codes are absent from the catalogue. They are the only omitted literal production 5xx HttpError codes.
  - A scan found 312 production constructors in 163 files. It also found 13 omitted codes with 4xx statuses. Normal 4xx responses stay silent.
  - The request entry still reports both feedback failures. A real SDK and transport check kept `service_unavailable` as a control and omitted both feedback code tags.
- **Problem:** Each affected report loses `error.code`. The catalogue and untyped string parameter can drift when a feature adds a code.
- **Impact if no action:** Operators lose a required diagnostic tag. Since the route correction, the route `/api/feedback` and status identify each cause. The class and stack remain. The repeat-limit key has no error code, so suppression is unchanged.
- **Root question:** How does each Worker report keep the fixed code of every known error, including errors that later changes add?
- **Options:**
  - **A.** Add the two feedback codes. Extend an existing reporting test through `POST /api/feedback`. Future codes still need manual catalogue updates. Effort: Small.
  - **B.** Stop sending error-code tags. Use class, route, status, and stack. Change the protocol. This option needs the user's choice because it removes a required field. Effort: Medium.
  - **C.** Use feature-owned error declarations for construction and filtering. To prevent the class, constructors must accept only declared codes. Moving 312 calls to declaration objects changes many files. Effort: Large.
  - **D.** Export one constant catalogue and its union type. Use the type for each HttpError code and trusted relayed code. Keep existing call forms and public results. Add no runtime check. Keep A's regression test. Effort: Medium.
  - **E.** Add a test that inventories production HttpError codes and relayed-code sources. This test for the class needs the user's approval. Effort: Small.
- **Left out:**
  - Copying every string code can expose private values.
  - A lower-case or underscore shape cannot prove that a value is fixed. Relayed strings can be arbitrary.
  - A separate exception class for each failure does not satisfy the required code tag.
  - Keeping the current catalogue leaves both known 5xx codes missing.
- **Wider fix:** D. The constructor type makes a missing code impossible in typed code. C needs the same guarantee with more caller changes. E is blocked and is not recommended.
- **Previous examples:** The route catalogue separately missed new path names. Its direct correction is in `worker/error-reporting/routes.ts`. Main's curated warning list in `worker/warning-values.ts` maps other values to `unknown` by design.
- **Related:** `plans/follow-ups/shared-worker-reporting-routes.md` records the same catalogue-drift cause in separate code. Its route fix makes the feedback cause identifiable from route and status. The wider fixes do not conflict and neither waits for the other. `plans/follow-ups/relayed-start-failure-reports.md` adds a trusted failure relay. When both fixes exist, it uses this code type. Neither fix waits.
- **Recommendation:** D. It keeps existing callers and public results while providing the structural guarantee. The first review preferred C. The independent check found D smaller with the same guarantee.
- **Action:** fix after merge, apply D, because the trigger is Rare, severity is Low, and the fix does not get harder later.

Requirements for D:

- Export the current codes as a constant list and derive its union type.
- Add `feedback_unavailable` and `feedback_email_failed`.
- Also account for the existing 4xx constructors that use `deploy_refused`, `deploy_version_mismatch`, `feedback_image_invalid`, `feedback_images_too_large`, `invalid_schedule`, `invalid_time_zone`, `preview_relay_unavailable`, `routine_not_found`, `routine_owner_required`, `routine_pull_request_required`, `routine_run_not_found`, `unknown_github_login`, and `workspace_restore_unavailable`.
- Keep every public status, code, message, and detail unchanged. Messages and some statuses contain context, so the declaration must not make them fixed.
- Keep `ApiErrorBody.error.code` as a string. Type trusted internal relays from their real producers. Do not cast an untrusted string to the union.
- Add no runtime check that rejects or rewrites an unlisted code. Do not replace an existing result with `internal_error` to satisfy the typecheck.
- Preserve normal 4xx silence, safe warning-code mapping, the private diagnostic projection, and both reporting filters.
- Check `worker/tools/handler.create.test.ts:225`, `worker/test-support/native-values.ts:198`, and `worker/warnings.test.ts:34` when updating fixtures. Preserve every assertion and equivalent unknown-code privacy coverage.
- Extend the feedback route's existing test at `worker/app-api/feedback.test.ts` through the real reporting entry. The harness in `worker/test-support/harness.ts` currently builds without a reporting runtime and needs a small injection option.
- Cover both final error-code tags through the actual feedback route. Constructing a matching HttpError only in the test cannot detect a later feedback code rename.
- Keep the code private-value rejection tests. Add no test for the class or new gate without the user's approval.
