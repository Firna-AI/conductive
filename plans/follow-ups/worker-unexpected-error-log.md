# Unexpected Worker errors leave no cause in the log

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-17, from the investigation of a failed session close on branch `calummoore/investigate-error-m9o4`, item 2.
- **Location:** `worker/http.ts` (`errorResponse`), `worker/warnings.ts` (`warnWorker`), `worker/warning-types.ts`, `worker/warning-values.ts`.
- **Reason:** the option that the user chose on 17 November 2026 conflicts with an earlier decision and with the Privacy page, so the user must choose again.

- **Terms:**
  - **Workers Logs:** the log store of Cloudflare. It keeps each log line of the Worker and of its Durable Objects for some days.
  - **`warnWorker`:** the one function that writes a warning of the Worker. It writes fixed text and typed safe fields only.
- **Background:**
  - `errorResponse` turns each exception that is not an `HttpError` into `500 internal_error` with "The request failed. Try again." It writes no log line. A restart of a Durable Object now gets `503 server_restarted` instead.
  - On 17 November 2026, a session close failed with that 500. The logs showed only the status and the last storage call, so the cause was found only from the version IDs and the timing of the request.
  - On 17 November 2026, the user chose option B of item 2: log the name, the message, and the stack of each such exception with `console.error`.
  - An earlier decision, decision 141 option D in commit `fa8efa02d`, says that no warning holds an error message, command output, or a body, because these can hold a secret. `worker/README.md` states it: `warnWorker` "copies no extra caller field, token, error message, request body, command output, or response body", and "a generic error has the fixed kind `error`, with no class name".
  - The Privacy page, `src/marketing/privacy-uses.ts`, and the Terms page, `src/marketing/terms.ts`, say of the model requests: "It writes no body or header value of them to its logs."
  - The message of a `SyntaxError` of `JSON.parse` in V8 quotes a piece of its input. So the message of an error can hold a piece of a request body.
- **Problem:** The chosen option breaks the earlier decision and can break the promise of the legal pages. Without a log line, the cause of each unexpected 500 stays unknown.
- **Impact if no action:** Each later unexpected 500 needs an indirect investigation, and some causes stay unknown.
- **Root question:** What does the Worker log about an unexpected error, without a secret or a body in the log?
- **Options:**
  - **A.** Log the name, the message, and the stack with `console.error`, as chosen on 17 November 2026. It overrides decision 141, and the Privacy and Terms sentences need a change. Effort: Small.
  - **B.** Add the warning kind `unexpected_error` to `warnWorker`, with safe fields only:
    - the class name, from a list of the built-in names, else `error`;
    - the Cloudflare flags `retryable`, `overloaded`, and `durableObjectReset`;
    - a fixed kind for each known Cloudflare text, which the code matches but does not copy;
    - the method and the route pattern, with no ID;
    - the code places of the stack, only lines in the form `at <name> (<file>:<line>:<column>)`, with no message line.

    Effort: Small.
  - **C.** Do B without the code places of the stack. Effort: Small.
  - **D.** Change nothing. Effort: Small.
- **Left out:** Masking of known secret forms in the message, because it misses unknown forms, as decision 141 found.
- **Wider fix:** B, because one typed warning covers every route, and the type stops free text.
- **Previous examples:** The failed session close of 17 November 2026. Decision 141 removed the error messages from the warnings for the same risk.
- **Related:** None.
- **Recommendation:** B. It gives the place and the class of each error, and it keeps decision 141 and the legal pages true.
- **Action:** ask the user, because the chosen option conflicts with an earlier decision of the user and with the legal pages.
