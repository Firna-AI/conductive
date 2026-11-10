# Choose whether the logs keep request records

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-08, from the focused review of the deploy fixes on the primary branch `calummoore/conductor-alternative-architecture` (decision 141): wider fix C and a new problem of the check of finding 2.
- **Location:** `observability` in `wrangler.jsonc`, and the sections "Who gets your data" and "How long Conductive keeps data" of `src/marketing/privacy.ts`.
- **Reason:** C gives up the request records, so it is a trade-off for the user. The words of the Privacy page depend on the answer.

- **Terms:**
  - **Workers Logs:** Cloudflare's store of the Worker's logs. It keeps each warning of the Worker and a record of each request.
  - **Request record:** the record that Cloudflare writes for each request. It can hold the IP address, the location, and the address of the request.
  - **Issues:** Cloudflare's error tracking of the Worker. `wrangler.jsonc` turns it on since 10 November 2026. It works without the request records.
  - **Privacy page:** the public Privacy notice of the marketing site.
- **Background:** The first deploy turned on Workers Logs to find its defects. Commit `24146f2` removes the query string of each address from the request records, because a query can hold a sign-in code (finding 2). Cloudflare keeps the logs for some days. The Privacy page says that Cloudflare runs the app and stores its data. It does not name the request records or their retention period. Issues can keep the invocation and request details of each failed request for 7 days, also of each failed preview page. It records no request that succeeds or gets a `4xx` reply.
- **Problem:** The request records keep the IP address, the location, and the address of each request, also of each preview page. Issues can keep the same details of each failed request. The Privacy page names neither.
- **Impact if no action:** Users are not told about these records. If the app does not need them, it keeps personal data with no use.
- **Root question:** Which records of requests does the app keep, and how does the Privacy page tell users?
- **Options:**
  - **A.** Keep the request records without query strings, as now. In the Privacy page, name each store of request data that `wrangler.jsonc` turns on: the request records and the failure records of Issues. Give what each can hold and how long Cloudflare keeps it. Effort: Small.
  - **C.** Turn off the request records with `observability.logs.invocation_logs: false`. Keep the Worker's warnings and Issues, so the details of each failed request still stay for 7 days. In the Privacy page, name the warnings and the failure records of Issues, with how long Cloudflare keeps them. Effort: Small.
  - **D.** Move the preview proxy into a second Worker with request records and Issues off, and keep A on the main Worker. The app keeps its own records, and no record of a previewed page stays. The new Worker needs its own routes, bindings, secrets, tests, and deploy docs. The hop to the workspace object must hide the address and the status of the preview, because the main Worker records that hop. Effort: Large.
- **Left out:** No log store, because the warnings found the six defects of the first deploy. A lower sampling rate, because each sampled request still keeps its record. Turning off Issues too, because the user asked on 10 November 2026 to turn it on to track the errors of the Worker.
- **Wider fix:** C. It removes every request record from Workers Logs, whatever the shape of a credential in it. Issues still keeps the details of each failed request. D is the Large form of C that keeps the app's own records.
- **Previous examples:** finding 2 of that review.
- **Recommendation:** A. Issues now keeps the details of each failed request, but only the request records show each `4xx` reply and each successful request. These help to answer a user's report, and the Privacy page then tells users.
- **Action:** ask the user later, because the user deferred this choice on 8 November 2026. A and C have real trade-offs, and the privacy words depend on the answer.
