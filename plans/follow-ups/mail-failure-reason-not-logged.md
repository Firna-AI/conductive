# The Worker logs no reason for failed emails

- **Severity:** Medium. **Likelihood:** Common. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-09, item 2 of the diagnosis of a failed org invitation, branch `calummoore/member-invite-failure`.
- **Location:** `worker/mail-sender.ts:49`, `worker/invitation-mailer.ts:41`, `worker/operator/approval-email.ts:39`, and `errorSummary` in `worker/warning-values.ts`.
- **Reason:** The fix reaches three files outside the branch that restores invitation emails, and that branch must merge fast.

- **Terms:**
  - **Mail sender:** `createMailSender` in `worker/mail-sender.ts`. It posts each email to Resend, the email service. On a local app address, it writes the email to the log instead.
  - **Workers Logs:** Cloudflare's store of the log lines of the Worker. `wrangler.jsonc` turns it on.
  - **errorSummary:** the helper in `worker/warning-values.ts` that turns a caught error into typed warning fields. It keeps only allowlisted codes and command states. A generic error has the fixed kind `error`, with no class name. It never copies an error message or an upstream text, because they can hold a secret.
- **Background:**
  - The org invitation and the waitlist approval email both send through the mail sender.
  - The mail sender throws in three cases: no `RESEND_API_KEY`, a reply from Resend that is not ok, or a request that fails or times out after 30 seconds.
  - The mail sender reads only `response.ok`. It discards the body of the reply, which holds Resend's error code, such as `validation_error`.
  - The invitation mailer catches each error and returns `502 invite_email_failed` with no log line.
  - The approval email logs one fixed warning: "Approval email delivery failed. The email remains pending."
- **Problem:** No log line gives the failure case, the HTTP status, or the Resend error code. On 9 November 2026, an invitation failed in production for each send, and Workers Logs held no reason. The cause was a `TypeError` from the Workers runtime. Its diagnosis took Wrangler, the Resend API, and a runtime test.
- **Impact if no action:** Each failed email needs a manual check of the Worker secrets, the Resend dashboard, and the runtime.
- **Root question:** How does an operator learn why an email failed to send?
- **Options:**
  - **A.** Log a safe summary in the invitation mailer only. The summary gives the case, the HTTP status, and a Resend error code from a fixed list. Approval emails stay without a reason. Effort: Small.
  - **B.** Make the mail sender throw a typed error. It holds the case, the HTTP status, and a Resend error code from a fixed list. `errorSummary` learns the type, and both email paths log the summary. Effort: Small.
  - **C.** Make the deploy workflow warn when the Worker has no `RESEND_API_KEY`. It finds a missing key before a user does, but not a refusal or a runtime error. Effort: Medium.
- **Left out:**
  - A separate error for the org admin when the key is missing. It changes the API error and the text of the app, and an org admin cannot set a Worker secret.
  - The Resend error message in the log. Upstream text can hold a secret, and `errorSummary` copies no message.
- **Wider fix:** B. It puts the reason in the shared mail sender, so every email path logs it.
- **Previous examples:** `worker/operator/approval-email.ts:39` logs a fixed warning with no reason.
- **Recommendation:** B. One small change gives both email paths a safe reason in the log.
- **Action:** fix after merge, apply B, because the fix reaches three files outside the branch that restores invitation emails.

A fixed list of Resend error codes comes from Resend's error reference. Examples are `validation_error`, `missing_api_key`, `invalid_api_key`, `restricted_api_key`, `invalid_from_address`, `rate_limit_exceeded`, and `daily_quota_exceeded`. A code outside the list logs as `unknown`.

The summary for a thrown request names only the error type, such as `TypeError`. That type would have pointed at the runtime error of 9 November 2026. Keep the existing behaviour of each caller: the invitation still returns `502 invite_email_failed` and stays saved, and the approval email stays pending for its retries. Update `worker/members/README.md`, which describes a failed send.
