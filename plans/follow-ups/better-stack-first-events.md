# Check the first real error reports

- **Severity:** Medium. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-10, from the post-merge tasks of the Better Stack error reporting plan, on the branch `calummoore/betterstack-implementation-brainstorm`.
- **Location:** `docs/protocol/error-reporting.md:113`, `:151`, `:171`, and `:204` (the field lists and the repeat limits), `src/marketing/privacy-uses.ts:82` (the "Error reports" item), and `src/marketing/privacy-recipients.ts` (the Better Stack entry).
- **Reason:** Only real failures of the deployed app give real reports, and the design adds no production canary.

- **Terms:**
  - **Report:** one error event that the Worker, the web app, or the Mac app window sends to Better Stack Errors.
  - **Allowlist filter:** the step that rebuilds each report from a fixed list of fields, and drops every other field.
  - **Isolate:** one running copy of the Worker or of a Durable Object.
  - **Release:** the name `conductive@<commit SHA>`, with the full SHA of the Git commit that built the code.
  - **Worker application** and **browser application:** the two Better Stack Errors applications. The first takes the Worker reports. The second takes the reports of the web app and the Mac app window.
- **Background:**
  - `docs/protocol/error-reporting.md` holds the rules. The allowlist filter of each reporter applies them.
  - Both reporters have tests that run the real SDK with a fake transport and no network.
  - Before the merge, a smoke test in a real Chrome browser passed. It gave seven events, and each held only the fields that its list allows. The actual app, with its empty browser DSN, kept its reporter off.
  - No check on the real Better Stack or on Cloudflare has run. So no check shows what Better Stack stores.
  - A Worker report holds only these fields:
    - the event ID, the time, the platform, the level, the environment, the release, and the name and the version of the SDK
    - one exception: the class name when it is a plain identifier, else `Error`, with the fixed text of its classification as its value. A classification is a kind of failure from a fixed list in the code.
    - at most 50 frames, each with only the function, the bundle file name, the line, the column, and whether it is Conductive code
    - the tags: the component (`request`, `workspace`, or `cron`), the classification, the HTTP method, the route template, the status, the code of a known error, and the Cloudflare Ray ID
    - for a reported warning, its typed values that are codes, phases, numbers, or booleans
  - A Worker frame names `/index.js` or `/chunk-<hash>.js`, a synthetic root. It never holds a request path or a file system path.
  - The route template keeps each path segment that the app's route lists name, and writes `:param` for every other segment.
  - A web app report holds only these fields:
    - the event ID, the time, the platform, the environment, and the release
    - one exception, with its type and the fixed text of its classification
    - frames with only the function, the bundle file name, the line, the column, and whether it is Conductive code
    - the debug IDs of the bundle files
    - the names and the versions of the browser and of the operating system
    - the tags `platform` (`web` or `mac`), `classification`, and `screen`, a screen name such as `workspace`
    - `user.id`, the Conductive user ID of the signed-in user
  - No report holds an error message, an address, the raw path of a request, a query, a header, a cookie, a body, a token, or a secret.
  - No report holds the ID of an org, a workspace, a session, or a sandbox. No report holds a GitHub login, a name, or an avatar.
  - No report holds breadcrumbs, console output, local variables, screenshots, chat messages, code, or the paths or the content of workspace files.
  - The web app keeps sessions, traces, replays, logs, client reports, and breadcrumbs off. It stores nothing in the browser.
  - A Worker report of the deployment has the environment `production`, because its `APP_ORIGIN` is `https://app.conductive.build`. Each web app report has `production` too.
  - Each Worker isolate sends at most one report for each key in 60 seconds, and at most 60 reports in any 60 seconds. The key is the classification, the exception type, the route template, and the first frame of Conductive code. So a failure that repeats gives fewer reports than failures.
  - The web app sends its reports straight to Better Stack. Better Stack can store the network address of each browser connection. The Worker sends from Cloudflare's network, so its reports carry no address of a user.
  - Reports show original frames only after Better Stack processes the maps of their release. The Deploy workflow uploads no maps. The Mac app build makes no maps, so its reports keep the frames of the bundle.
  - The "Error reports" item of the Privacy page, in `src/marketing/privacy-uses.ts`, describes the reports. A browser report holds "the type of error and the Conductive version", "the place in the Conductive code", "the kind of screen", the user ID while signed in, and the names and versions of the browser and the operating system.
  - It says that a server report holds "the type of error, the place in the code, and the version", "the part of the service that failed, the kind of request, and its result", and "Cloudflare's reference of the request".
  - It says: "No report holds your GitHub login or name, your messages, your files, your code, page addresses, or secrets."
  - `src/marketing/privacy-recipients.ts` says that the browser and Mac app window requests "send your network address to Better Stack, and it can store that address with each of those reports". The wording "can store" waits for this check.
  - The legal-pages rule is in `AGENTS.md` and `src/marketing/README.md`. A change to a fact of the architecture doc or of a protocol doc reads both legal pages in full. The same change updates each sentence of the legal pages that restates the fact.
  - The legal pages are the Terms page in `src/marketing/terms.ts`, and the Privacy page in `src/marketing/privacy.ts`, `src/marketing/privacy-uses.ts`, `src/marketing/privacy-recipients.ts`, and `src/marketing/privacy-transfers.ts`. Each page keeps its own effective date. The Privacy page states its date in its introduction.
- **Task:**
  1. Wait for the first real report in each application. Do not add a test route or a deliberate failure in production.
  2. For a Worker report, check the environment `production` and the release of the deployed commit. The Deploy workflow tags each Worker version with its short commit hash, and the Cloudflare dashboard shows that tag.
  3. Check that the Worker report holds only the fields of the Worker list above, and none of the data that no report holds. Check that its frames name `/index.js` or `/chunk-<hash>.js`.
  4. Check that a network address stored with a Worker report, if any, is not the address of a user.
  5. For a browser report, check the environment `production`, the release of the deployed commit, and only the fields of the web app list above. Check that Better Stack shows no session, trace, replay, log, or breadcrumb of either application.
  6. When the release has Processed maps, check that the frames show the original source. When they stay minified, record that fact in a new follow-up item.
  7. Compare the number of Worker reports with the failures, for example in Workers Logs. Expect fewer reports when a failure repeats within 60 seconds.
  8. Check whether Better Stack stores the network address of the browser connection with the browser report.
  9. Compare each stored field, and the stored network address, with the Privacy words above.
  10. When the Privacy words differ from the evidence, correct them on a new branch. In the same change, correct `docs/protocol/error-reporting.md` where it states the same fact. Follow the legal-pages rule, and update the effective date of the Privacy page.
  11. When a report holds a field outside its list, or data that no report holds, record a defect in a new follow-up item at once.
  12. Record the result of each check in the pull request that deletes this item. Copy no value that identifies a person.
- **Impact if no action:** A field that leaks personal data, or Privacy words that differ from the stored data, stays unseen.
- **Needs:** The DSNs and the browser DSN deploy of `plans/follow-ups/better-stack-activation.md`. Real failures of the deployed app. An admin of the operator's Better Stack team. Read access to Workers Logs.
- **Related:**
  - `plans/follow-ups/better-stack-activation.md` makes the reports possible.
  - `plans/follow-ups/better-stack-source-map-release.md` uploads the maps that the check of the original frames needs.
  - `plans/follow-ups/request-records-in-logs.md` decides whether Workers Logs keeps request records. The Ray ID of a report finds a request only while it does.
  - `plans/follow-ups/chat-page-resize-observer-loop.md` says that a browser report can show a false ResizeObserver loop error.
- **Done when:** One real Worker report and one real browser report match their field lists, and hold none of the excluded data. The source frames and the repeat counts behave as this item says. The Privacy words match the evidence, or a merged change corrects them. Then delete this item.
