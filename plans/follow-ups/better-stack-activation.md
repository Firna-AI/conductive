# Turn on Better Stack error reporting

- **Severity:** Medium. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-10, from the post-merge tasks of the Better Stack error reporting plan, on the branch `calummoore/betterstack-implementation-brainstorm`.
- **Location:** `src/shared/error-reporting.ts:8` (the empty browser DSN), the Worker secret `CONDUCTIVE_ERROR_TRACKING_DSN`, and `docs/deployment/error-reporting.md:9`, `:43`, and `:58` (the setup steps).
- **Reason:** The two applications and their DSNs need the operator's Better Stack team, and the code that sends the reports must merge first.

- **Terms:**
  - **Better Stack Errors:** Better Stack's error tracker. It takes error events from the Sentry SDKs, groups them into issues, and sends alerts.
  - **DSN:** the address and the key that a sender of reports uses. Its form is `https://<key>@s<id>.<region>.betterstackdata.com/<id>`, with the same application ID twice.
  - **Worker application** and **browser application:** the two Better Stack Errors applications of Conductive. The first takes the reports of the Worker and its Durable Objects. The second takes the reports of the web app and the Mac app window.
  - **Workers Logs:** Cloudflare's log store of the Worker. It keeps the warnings of the Worker.
- **Background:**
  - Conductive sends each unexpected failure of the Worker, its Durable Objects, the web app, and the Mac app window to Better Stack Errors. `docs/protocol/error-reporting.md` states what each report holds and when each part reports.
  - When this item was added, no step of this task had run, and the Better Stack credentials were missing.
  - The Worker reports only while its secret `CONDUCTIVE_ERROR_TRACKING_DSN` holds a valid DSN. Without the secret, it sends no report.
  - An invalid Worker DSN turns the Worker reports off. The Worker then writes one warning of the kind `error_tracking_dsn_invalid` to Workers Logs. The warning never holds the DSN.
  - The web app reports only from a production build with a release, when the browser DSN is valid, and when the configured app origin is `https://app.conductive.build`. The Mac app window uses the app origin of its build.
  - The browser DSN is public. It is the constant `BROWSER_ERROR_TRACKING_DSN` in `src/shared/error-reporting.ts`. It is empty, so the web app and the Mac app window send no reports.
  - The content security policy of each app page names the origin of the browser DSN only while that DSN is valid. The Worker and the Mac build make the same policy.
  - The data region of a DSN is every label between `s<id>.` and `.betterstackdata.com`. It can have more than one label.
  - The protocol requires both applications in an EU data region, a retention of 90 days, access for the admins of the operator's team only, and spike protection.
  - The Privacy page in `src/marketing/privacy.ts` says that Better Stack keeps the reports in the European Union, for 90 days.
  - Better Stack's API docs say that a new application uses the default region of the team when nobody chooses one, such as `us-east-9`. They give a default retention of 90 days.
  - Each running copy of the Worker sends at most one report of the same failure in 60 seconds. So repeated requests of the check below give one event.
  - The design has no canary route. The first proofs are one development report and the first real reports.
  - Better Stack's list of tested SDKs does not name `@sentry/cloudflare`, the SDK of the Worker. So the development check below is the first proof that Better Stack takes Worker events.
  - In `npm run dev`, `GET /api/models` reads `CONDUCTIVE_MODELS`. A missing or invalid value gives `503 models_unavailable`. A value in `.dev.vars` replaces the value of `wrangler.jsonc`.
  - `/api/models` needs a signed-in session with app access. Sign-in needs the GitHub values in `.dev.vars` that the "Get started" section of `README.md` lists. An account in `OPERATOR_GITHUB_IDS` gets app access at sign-in.
  - Each merge of the release pull request publishes a signed Mac app, as `desktop/RELEASES.md` says. The Mac app window gets a new browser DSN only with the next release.
  - Agent merges are off in this repository. A person merges each pull request.
- **Task:**
  1. In the operator's existing Better Stack team, make a Worker application and a browser application in Better Stack Errors.
  2. Choose an EU data region for each application when you make it.
  3. Give each application a retention of 90 days, access for the admins of the team only, and spike protection.
  4. Read the host of each DSN. Check that its data region is the EU region that you chose.
  5. Open the notification settings of the team. Check that they cover both new applications, and that the operator receives a notice of a new error. Do not add another recipient or another service. When the settings fall short, record that fact in a new follow-up item for the user.
  6. Run `npx wrangler secret put CONDUCTIVE_ERROR_TRACKING_DSN`, and enter the DSN of the Worker application. Never put the DSN in `wrangler.jsonc`, in Git, or in CI. When Workers Logs later shows a warning of the kind `error_tracking_dsn_invalid`, the secret is not a valid DSN. Then set it again.
  7. Development check: in a local checkout of `main`, keep a copy of `.dev.vars`. Then put the Worker DSN in `.dev.vars` as `CONDUCTIVE_ERROR_TRACKING_DSN`. Keep `APP_ORIGIN` unset or local, so the environment is `development`.
  8. Run `npm run dev`. Sign in at `http://127.0.0.1:5173` with an account that has app access.
  9. Stop `npm run dev`. Set `CONDUCTIVE_MODELS=[]` in `.dev.vars`, because an empty list is invalid. Start `npm run dev` again.
  10. In the same signed-in browser, open `http://127.0.0.1:5173/api/models`. Check the answer `503` with the code `models_unavailable`.
  11. In the Worker application, check one event with the environment `development` and the release `conductive@<SHA>`, where `<SHA>` is the output of `git rev-parse HEAD`. Check that it holds only the fields of "What a Worker report holds" in `docs/protocol/error-reporting.md`, and no data of "What no report holds". Repeated requests in 60 seconds give the same single event.
  12. Stop `npm run dev`. Put back the saved copy of `.dev.vars`, also when a check fails. This removes the empty model list and the development DSN.
  13. Browser DSN: on a new branch from `main`, set `BROWSER_ERROR_TRACKING_DSN` to the DSN of the browser application. Run `npm run check`, open a pull request, and ask a person to merge it.
  14. After the Deploy workflow deploys that merge, read the `Content-Security-Policy` header of `https://app.conductive.build/`. Check that `connect-src` names the origin of the browser DSN.
  15. After the next Mac release, check that its release commit holds the DSN change, with `git merge-base --is-ancestor <DSN commit> <release tag>`.
- **Impact if no action:** No report reaches Better Stack. The operator learns of an unexpected failure only from a user, or from a search of Workers Logs.
- **Needs:** The merged reporting change on `main`. An admin of the operator's Better Stack team. A Cloudflare login that can set Worker secrets. A local checkout with the GitHub sign-in values and an account with app access. A person who merges the DSN pull request. The next Mac release.
- **Related:**
  - `plans/follow-ups/better-stack-source-map-release.md` uploads the maps of a deployed commit. It needs the two applications of this task.
  - `plans/follow-ups/better-stack-first-events.md` checks the first real reports. It waits for the DSNs of this task.
  - `plans/follow-ups/mac-renderer-source-maps.md` uploads the Mac renderer maps to the browser application of this task.
- **Done when:** Both applications exist in an EU region with the three settings. The Worker secret is set. The development event arrived with only the kept fields, and `.dev.vars` is restored. The notification check is done, or a follow-up item records its gap. The browser DSN is merged and deployed, and the policy names its origin. A published Mac release holds the DSN. Then delete this item.
