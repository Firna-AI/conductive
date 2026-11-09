# The GitHub webhook reads a large body before it checks the signature

- **Severity:** Medium. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-08, a new problem of the options check of decision 144. Its report is in `.context/options-check-144/report.md`.
- **Location:** `worker/github/webhook.ts:53`, and `readBoundedBody` in `worker/http/request-body.ts`.
- **Reason:** the problem is outside decision 144.

- **Background:** The GitHub webhook route has a raised body limit of about 26 MiB, because GitHub can send large events. A request body limit protects the memory of the Worker, which all its requests share.
- **Problem:** The route reads the whole body before it checks the signature, and the bounded reader holds a second copy while it joins the chunks. A few unsigned requests at once can fill the memory of one Worker instance.
- **Impact if no action:** Anyone can slow or stop one Worker instance with a few large unsigned requests to the webhook.
- **Root question:** How does the webhook refuse an unsigned request before it holds a large body?
- **Options:**
  - **A.** Join the chunks into one buffer of the declared length, so that the reader holds one copy. Effort: Small.
  - **B.** Compute the signature while the body streams in, and keep the body only when it is needed. Effort: Medium.
- **Left out:** A lower limit, because GitHub can send large events.
- **Wider fix:** B.
- **Previous examples:** decision 65, which set the body limits.
- **Recommendation:** B. It checks the signature without a full extra copy.
- **Action:** fix after merge, apply B.
