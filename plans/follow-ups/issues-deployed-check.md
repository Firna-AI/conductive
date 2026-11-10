# Check Issues on the deployment

- **Severity:** Medium. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-10, from branch `calummoore/cloudflare-worker-error-tracking`, the change that turns on Issues.
- **Location:** `observability.issues` in `wrangler.jsonc`, and the Issues bullet of `docs/deployment.md`.
- **Reason:** The check needs the deployed Worker, real traffic, and the Cloudflare dashboard.

- **Terms:**
  - **Issues:** the error tracking of Cloudflare Workers, in open beta. It groups each uncaught exception, each `5xx` reply, and each error log line of the Worker into issues.
  - **Preview reply:** a reply on a hostname under `conductive.page`. The preview proxy passes the status of the program in the sandbox through.
- **Background:**
  - `wrangler.jsonc` turns on Issues. Each deploy sets it, and the build passes the key to `dist/conductive/wrangler.json`.
  - Issues has no documented filter by hostname, route, or status. An issue can only be set to Ignored by hand.
  - So a failing program in a sandbox can make issues among the issues of the app.
  - Cloudflare keeps the details of each occurrence for 7 days.
  - The Cloudflare API reference describes the address of an occurrence as "Redacted request URL without query parameters." An occurrence also holds the request headers. Cloudflare documents a default redaction by header name for Tail Workers: `cookie`, `set-cookie`, and each name that contains `auth`, `key`, `secret`, `token`, or `jwt`. The Issues docs do not say whether the same rule applies.
- **Task:**
  - After the deploy, open the Worker `conductive` in the Cloudflare dashboard, then its Issues page. Confirm that Issues is on.
  - After some days of traffic, count the issues that come from preview replies and the issues that come from the app.
  - Open one occurrence. Confirm that its address has no query string. Confirm that its request headers show `Cookie`, `Authorization`, and `x-api-key` as redacted. These headers carry the session, the API tokens, and the turn token of the model gateway, which `docs/protocol/model-gateway.md` keeps out of logs.
  - When the preview issues hide the issues of the app, give the user the choice again. Option D of `plans/follow-ups/request-records-in-logs.md` moves the preview proxy into a second Worker, which would have Issues off.
- **Impact if no action:** A deploy that drops the key turns Issues off unseen. Preview failures can hide the failures of the app.
- **Needs:** The deployed change and access to the Cloudflare dashboard.
- **Done when:** The Issues page shows Issues on, an occurrence shows no query string and no secret header value, and the user knows how many issues come from preview replies.
