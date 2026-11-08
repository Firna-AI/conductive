# Choose whether the logs keep request records

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-08, from the focused review of the deploy fixes on the primary branch `calummoore/conductor-alternative-architecture` (decision 141): wider fix C and a new problem of the check of finding 2.
- **Location:** `observability` in `wrangler.jsonc`, and the sections "Who gets your data" and "How long Conductive keeps data" of `src/marketing/privacy.ts`.
- **Reason:** C gives up the request records, so it is a trade-off for the user. The words of the privacy draft depend on the answer.

- **Terms:**
  - **Workers Logs:** Cloudflare's store of the Worker's logs. It keeps each warning of the Worker and a record of each request.
  - **Request record:** the record that Cloudflare writes for each request. It can hold the IP address, the location, and the address of the request.
  - **Privacy draft:** the Privacy page of the marketing site, a draft for a lawyer.
- **Background:** The first deploy turned on Workers Logs to find its defects. Commit `24146f2` removes the query string of each address from the request records, because a query can hold a sign-in code (finding 2). Cloudflare keeps the logs for some days. The privacy draft says that Cloudflare runs the app and stores its data. It does not name the request records. Its README says that the operator and the lawyer give how long data stays.
- **Problem:** The request records keep the IP address, the location, and the address of each request, also of each preview page, and the privacy draft does not say so.
- **Impact if no action:** Users are not told about these records. If the app does not need them, it keeps personal data with no use.
- **Root question:** Does the app keep a record of each request, and how does the privacy page tell users?
- **Options:**
  - **A.** Keep the request records without query strings, as now. Name the records, what they can hold, and how long Cloudflare keeps them in the privacy draft. Effort: Small.
  - **C.** Turn off the request records with `observability.logs.invocation_logs: false`, and keep only the Worker's warnings. Name the warnings in the privacy draft. Effort: Small.
- **Left out:** No log store, because the warnings found the six defects of the first deploy.
- **Wider fix:** C. It removes every request record, whatever the shape of a credential in it.
- **Previous examples:** finding 2 of that review.
- **Recommendation:** A. The records show the status and the path of each failed request, which helps to answer a user's report, and the privacy draft then tells users.
- **Action:** ask the user, because C gives up the request records, and the privacy words depend on the answer.
