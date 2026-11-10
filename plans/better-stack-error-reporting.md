# Better Stack error reporting

Status: Active. On branch `calummoore/betterstack-implementation-brainstorm`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

The user approved implementation of all milestones and tasks on 10 November
2026. Decisions 1D, 2B, 3A, 4A, and 5D remain in force.

Today an unexpected failure of Conductive leaves almost no trace. The
Worker answers an unknown error with HTTP 500 and writes no line that
names the cause. Some catches hide a failure completely. Only Workers Logs
keeps the fixed-text warnings of the Worker, and nothing alerts the
operator. A failure in the browser leaves no record at all.

This change sends each unexpected failure of the Worker, its Durable
Objects, and the web app to Better Stack Errors, as Bookfolio
(`futex-ai/accounting`) does. The Sentry SDKs send the events. An
allowlist filter rebuilds each event, so that no error text, address,
secret, or user content leaves the app. The Mac app's window reports
through the same web app code. The change does not cover log shipping,
uptime checks, a status page, the Mac app's own main process, or the agent
runner. The brainstorm notes and their sources are in
`.context/better-stack/notes.md`. The options check of the decisions is in
`.context/better-stack-error-reporting/options-check.md`.

Bookfolio's record of the same work, for reference:
`docs/protocol/api-error-tracking.md`,
`docs/protocol/client-error-tracking.md`,
`plans/better-stack-api-error-tracking.md`, and
`plans/better-stack-error-tracking.md` in `futex-ai/accounting`.

Contract owners:

- `docs/protocol/error-reporting.md`, a new protocol doc that Milestone 2
  creates.
- [Access and security](../docs/protocol/access-and-security.md), for the
  content security policy.
- [Architecture](../docs/architecture.md), for the external services and
  where data lives.
- [Deployment inputs](../docs/deployment.md), for the new secret, the
  browser key, and the upload settings.
- The [Worker README](../worker/README.md), the
  [web app README](../src/app/README.md), the
  [Mac app README](../desktop/README.md), and the
  [marketing README](../src/marketing/README.md).
- The Privacy page in `src/marketing/privacy.ts`.

Replaced ways:

- A warning as free text, `warnWorker(message: string)` → a warning of
  fixed text with typed values, as option D of the follow-up
  `plans/follow-ups/typed-worker-warnings.md` says. Consumers: each caller
  of `warnWorker` and each injected `warn` option, with their tests. On
  10 November 2026 they are in `worker/app-api/feature-github.ts`,
  `worker/app-api/feature-org.ts`,
  `worker/app-api/get-started-github.ts`, `worker/application.ts`,
  `worker/chat/runner-channel.ts`, `worker/chat/title-model.ts`,
  `worker/chat/workspace-titles.ts`,
  `worker/lifecycle/create-input-activity.ts`,
  `worker/lifecycle/first-image-build.ts`,
  `worker/lifecycle/image-build-failure.ts`,
  `worker/lifecycle/input-activity-owner.ts`,
  `worker/lifecycle/lifecycle-admission.ts`, `worker/lifecycle/repair.ts`,
  `worker/lifecycle/start-coordinator.ts`,
  `worker/lifecycle/start-failure.ts`, `worker/marketing/page.ts`,
  `worker/operator/approval-email.ts`, and `worker/terminal/service.ts`.
  Milestone 3 searches again, because `main` adds callers. `errorSummary`
  in `worker/warnings.ts` returns typed values. Moved in Milestone 3.
  Deleted in Milestone 3.

## Decisions

Decisions 1 to 4 come from the brainstorm of 8 November 2026. The user
answered them on 9 November 2026, and decision 5 on 10 November 2026. The
line numbers in the decisions are those of 10 November 2026. An options
check of
9 November 2026 added the options from F on in decision 1, from D on in
decisions 2 and 4, C in decisions 3 and 5, and D in decision 5. It also
wrote new root questions for decisions 3, 4, and 5.

Terms that the decisions share:

- **Better Stack Errors:** Better Stack's error tracker. It takes events
  from the Sentry SDKs, groups them into issues, and sends alerts.
- **DSN:** the write-only address and key that a Sentry SDK sends its
  events to.
- **Allowlist filter:** code that rebuilds each event from a fixed list of
  safe fields and drops all other data, as Bookfolio does.
- **Workers Logs:** Cloudflare's log store for the Worker. It keeps each
  warning and a record of each request with its path and status.
- **Durable Object:** the stateful Cloudflare server of one workspace. It
  holds the chat, the runner connection, and the alarms.

### 1. Choose what Conductive sends to Better Stack

- **Severity:** Medium. **Effort:** Large.
- **Source:** Design.
- **Category:** Process.
- **Location:** `worker/application.ts:178`, `worker/warnings.ts:4`, `worker/chat/sockets.ts:71`, and `worker/members/cleanup.ts:126`.
- **Terms:**
  - **Tail Worker:** a second Worker that gets each finished invocation of the main Worker, with its log lines, errors, and outcome.
  - **Better Stack Telemetry:** Better Stack's log store, with search and alerts on log lines.
  - **Workers Paid:** Cloudflare's paid Workers plan. Tail Workers and Logpush need it.
  - **Logpush:** a Cloudflare feature that sends a record of each Worker invocation, with the chosen fields, to an outside store.
- **Background:** The Worker catches every request error in one place. A known error returns its code. An unknown error returns HTTP 500, and Workers Logs keeps only its request record with the path and the status. About ten call sites write fixed-text warnings through `warnWorker`. The runner socket swallows a failed runner message, and the cron puts each failed org cleanup in a list that nothing reads.
- **Problem:** The operator learns of an unexpected failure only through a search of Workers Logs, and even then sees no cause. A hidden failure leaves no line at all.
- **Impact if no action:** Users meet failures that the operator cannot see. A failure loop can run for days with no alert.
- **Root question:** How does the operator learn of each unexpected failure, with enough detail to fix it, and with no secret or personal data leaving the app?
- **Options:**
  - **A.** Uptime checks only. Better Stack's uptime product calls the public hostnames, and the 15-minute cron sends a heartbeat. It finds outages, but not a single failed request. Effort: Small.
  - **B.** Cloudflare's log export. Add a Telemetry destination to `observability.logs` in `wrangler.jsonc`, with no code. No cause of an unknown 500 reaches it, because the Worker catches each request error without a log line. Cloudflare's docs do not say if it also sends the request records with IP addresses. A GitHub report says that uncaught exceptions do not reach the export. Effort: Small.
  - **C.** Our own Tail Worker. It sends the warnings and each failed invocation to Telemetry. It keeps error class names and drops error text, queries, and headers. It catches failures that end an invocation, such as the CPU limit. It gives no stacks and no grouped issues. It needs Workers Paid. Effort: Medium.
  - **D.** Error events, as Bookfolio does. `@sentry/cloudflare` in the Worker and its Durable Objects sends each unexpected failure to Better Stack Errors. The allowlist filter, repeat suppression, release, and private source maps follow Bookfolio. It needs the `nodejs_compat` flag and a DSN secret. Better Stack's list of tested SDKs does not name `@sentry/cloudflare`, so a smoke test must prove that its events arrive. Effort: Large.
  - **E.** D and C together. Effort: Large.
  - **F.** D, and a Logpush job in place of the Tail Worker of E. The job sends only the failed invocations to Telemetry, with the outcome, the time, and the script version. It needs no Worker code, but it needs Workers Paid, and its settings live in the Cloudflare account, outside the repository. Effort: Large, because it contains D. The Logpush step alone is Small.
  - **G.** Better Stack's `@logtail/edge` library in the Worker. Each capture point writes one typed log line with the allowlisted fields to Telemetry. It needs no Sentry SDK and no map upload. It gives no grouped issues and no source-mapped stacks. Effort: Medium.
  - **H.** A small reporter of our own in the Worker, with no Sentry SDK. It builds the allowlisted event and posts it as a Sentry envelope through `waitUntil`. It needs no compatibility flag, and no SDK field can pass the filter by mistake. We own the stack parser, the envelope, and the debug IDs of the source maps. Better Stack documents only the Sentry SDKs as senders. Effort: Large.
  - **I.** D, and a report in each catch that hides an unexpected failure, such as the runner message catch and the org cleanup catch. Each site gets its own classification. A normal result, such as a busy cleanup lease, stays silent. Effort: Large, because it contains D. The step over D is Medium.
- **Left out:**
  - Change nothing: it fails the goal, because the task asks for Better Stack.
  - Better Stack's ready-made Tail Worker: it copies each URL with its query and each error message, and a query can hold a sign-in code.
  - Logpush as the only channel: it can only drop whole fields. So it sends whole error messages or no error names, which fails the goal of enough detail.
- **Wider fix:** E. It also reports failures that end an invocation, which no code inside the Worker can report. F covers the same class with less code, but its settings live outside the repository.
- **Previous examples:** Bookfolio's `plans/better-stack-api-error-tracking.md`, merged as pull request 701 on 1 October 2026, and its `docs/protocol/api-error-tracking.md`. In Conductive, `plans/follow-ups/typed-worker-warnings.md` and `plans/follow-ups/request-records-in-logs.md` cover the same log text and privacy words.
- **Related:** Decisions 2 and 3 apply only to the options that send error events. Option A is option B of decision 4.
- **Recommendation:** I, after the options check. The first recommendation was D. I stays inside the words of D, which promise each unexpected failure, and it adds the capture points that the code needs. E protects best if the account has Workers Paid.
- **Chosen:** D, by the user on 9 November 2026. Agent call of the same day: the design takes the hidden catches of option I into D, because the words of D cover each unexpected failure.

### 2. Choose which parts of Conductive report errors

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** Process.
- **Location:** `src/main.tsx:25`, `desktop/renderer/main.tsx`, `desktop/src/main.ts`, and `runner/src/main.ts`.
- **Background:** Four parts run code: the Worker with its Durable Objects, the web app, the Mac app, and the agent runner in each cloud computer. The Mac window renders the same `App` as the web app, so reports from the web app code also cover it. Its page origin is `conductive-app://desktop`, so its reports read the app origin of its build. The web app has no error boundary and no error report today. Bookfolio reports from its client and from its API, each to its own application.
- **Problem:** A browser error, such as a render crash, leaves a blank page, and no one learns of it. The runner's failures stay inside each cloud computer.
- **Impact if no action:** Only Worker failures reach the operator. A client defect stays unseen until a user reports it.
- **Root question:** Which parts of Conductive tell the operator about their unexpected failures?
- **Options:**
  - **A.** Only the Worker and its Durable Objects. Effort: Small. Decision 1 already covers this work.
  - **B.** A, and the web app. It reports through React's root error callbacks and the SDK's global handlers, with its own allowlist filter. It adds no error screen. Effort: Medium.
  - **C.** B, and the Mac app's own process and the agent runner. The runner reports through its connection to the Durable Object. So no Better Stack key goes into a cloud computer. Effort: Large.
  - **D.** B, and the agent runner through its connection to the Durable Object, without the Mac app's main process. The runner sends a typed failure message, and the Durable Object reports it. It changes the runner message protocol, and it cannot report a runner that fails to connect. Effort: Large.
  - **E.** B, and the agent runner with its own Better Stack application and a public DSN, as the browser has. It also reports a runner that cannot connect. User code in the cloud computer can read the DSN and send false events. The runner needs its own filter and release. Effort: Large.
  - **F.** B, and the Mac app's main process, with its own public DSN. It reports failures of sign-in, updates, and device commands. It adds a third SDK and a filter for Node events. The Mac app has no public release yet. Effort: Medium.
- **Left out:** The marketing site, because its pages run no script.
- **Wider fix:** None, because this is a choice of scope, not a class of defect.
- **Previous examples:** Bookfolio's `docs/protocol/client-error-tracking.md` and `plans/better-stack-error-tracking.md`.
- **Related:** Decision 1: this decision applies only to the options that send error events. Decision 3 applies to every option except A.
- **Recommendation:** B. It gives the client and server coverage that Bookfolio has, and D, E, or F can add a part later with no change to B.
- **Chosen:** B, by the user on 9 November 2026.

### 3. Choose how the browser reaches Better Stack

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Security.
- **Location:** `worker/security/content-security.ts:14`.
- **Terms:**
  - **Content security policy:** the rules that the Worker sends with each page. They name the addresses that the page can call.
  - **Tunnel:** a Sentry SDK option that sends each event to a route on the app's own origin. The server then forwards the event.
- **Background:** Access and security says that a page calls only its own origin and the app origin. Bookfolio's client calls Better Stack directly, and its policy lists Better Stack's address. Bookfolio's smoke-test doc notes that Better Stack stores the IP address of the connection with each server event. The same for a browser event is an inference that the first real event must confirm.
- **Problem:** A direct call changes a rule of Access and security and can give Better Stack each user's IP address. A tunnel adds a public route to the Worker.
- **Impact if no action:** The web app cannot send its reports.
- **Root question:** How does a failure in the web app get to Better Stack, and what does Better Stack learn about the user?
- **Options:**
  - **A.** Direct, as Bookfolio does. Add Better Stack's address to `connect-src`, and change the rule in Access and security. Better Stack can store each user's IP address. Ad blockers can block the call. Effort: Small.
  - **B.** A tunnel route on the app origin. The Worker limits the size and the rate, filters the event again, and forwards it to the one configured DSN. The policy stays the same, and Better Stack sees only a Cloudflare address. Each event costs one Worker request. Effort: Medium.
  - **C.** A report route of our own on the app origin, with no Sentry SDK in the browser. The browser sends a small typed report: the error class, the stack frames, the screen, and the release. The Worker checks it against a fixed schema, takes the user ID from the session, and sends the event through the Worker's reporter. The policy stays the same, Better Stack sees no user address, and the route can require a session. We own the stack parsing for each browser and the debug IDs of the source maps. Effort: Large.
- **Left out:** A forwarder on a separate Conductive hostname, because B gives the same protection with no policy change. A path through the Mac app's main process, because the Mac app has no bridge from its page.
- **Wider fix:** C. It builds each event in one place, the Worker, so no browser filter can miss a field.
- **Previous examples:** Bookfolio's `ts/app/cloudflare/edge-home-redirect.mjs` lists Better Stack's address in `connect-src`, and the same file forwards PostHog through Bookfolio's own origin at `/ph/*`. Its `docs/ops/deployment-smoke-tests.md` notes the stored IP address.
- **Related:** Decision 2: this decision applies to every option of it except A.
- **Recommendation:** B. It keeps users' IP addresses away from Better Stack and keeps the policy rule. C protects the user's data and the codebase best, but it costs more.
- **Chosen:** A, by the user on 9 November 2026, in place of the recommended B. The user gave no reason.

### 4. Choose whether to add uptime checks

- **Severity:** Low. **Effort:** Small.
- **Source:** Design.
- **Category:** Process.
- **Location:** `worker/application.ts:188` and `worker/members/cleanup.ts:126`.
- **Terms:**
  - **Better Stack Uptime:** Better Stack's checks of public addresses, with alerts and status pages.
  - **Heartbeat:** a secret Better Stack address that a job calls each time it runs. Better Stack sends an alert when the calls stop.
- **Background:** The app has three hostnames. `/api/health` returns `{"status":"ok"}`, but it does not check D1 or the sandbox provider. A cron trigger runs every 15 minutes. It deletes the orgs that were deleted 7 days ago, repairs the lifecycle alarms, and retries the approval emails. It puts each failed org in a list that the cron handler ignores, so the run still ends well. Bookfolio has no uptime checks.
- **Problem:** No check outside Cloudflare tells the operator when the app is down, for example after a DNS or certificate failure. A heartbeat after each cron run would report success while every deletion fails.
- **Impact if no action:** The operator learns of a full outage only from a user report. Deleted orgs can stay past the 7 days that Orgs and members promises.
- **Root question:** Does the operator learn when the whole app is down, or when the cron stops doing its work?
- **Options:**
  - **A.** No uptime checks. Effort: Small.
  - **B.** Better Stack Uptime checks the marketing site, the health route, and the machine hostname. The cron sends a heartbeat. Alerts go to the operator by email. Effort: Small.
  - **C.** B, and a public status page, such as `status.conductive.build`. Users read its text, so it must not name the sandbox provider. Effort: Small.
  - **D.** The cron reports each org that stays undeleted well past its deletion time, for example one day past, through the Worker's reporter. It finds stuck deletions, but not a cron that stops or an app that is down. Effort: Small.
  - **E.** No checks now, and a follow-up item adds B before the app opens to other people. Effort: Small.
  - **F.** B, with a health route that also reads D1, so that a D1 outage fails the check. Each check costs one D1 read, and strangers can make the route read D1. Effort: Small.
- **Left out:** A scheduled GitHub Actions job that calls the hostnames, because B is better on every point: GitHub can run a scheduled job late or skip it.
- **Wider fix:** None, because this is a choice of scope.
- **Previous examples:** None found.
- **Related:** Decision 1: its option A is this decision's option B alone, and its option I reports each failed org cleanup.
- **Recommendation:** D, after the options check. The first recommendation was B. D fits the choice of no outside checks, costs little, and finds stuck deletions, which no heartbeat finds. E also keeps B for the launch.
- **Chosen:** A, by the user on 9 November 2026, in place of the first recommendation, B. The user gave no reason. The options check came after the answer.

### 5. Choose how the Privacy page names an outside service

- **Severity:** Low. **Effort:** Small.
- **Source:** Design.
- **Category:** UX wording.
- **Location:** `src/marketing/privacy.ts:114`, the list "Who gets your data", and the "Legal pages" section of `src/marketing/README.md:139`.
- **Terms:**
  - **Privacy page:** the public privacy notice at `conductive.build/privacy`. Its text lives in `src/marketing/privacy.ts`, and the mockup catalogue shows the same text.
  - **Legal-pages rule:** a repository rule in `AGENTS.md`. A change to a fact in the architecture doc or a protocol doc also updates each legal-page sentence that restates the fact.
- **Background:** "Who gets your data" names Cloudflare, GitHub, Resend, Anthropic, and OpenAI. It names the cloud computer provider only in general words, because a repository rule keeps that name out of user-facing text. No such rule covers Better Stack. Bookfolio's Privacy Policy names Better Stack and describes some other providers by kind.
- **Problem:** The error reports send data to a new recipient, and the page must name the recipient or its kind. The follow-up for Resend asked the same question, and no rule answers it for later services.
- **Impact if no action:** The legal-pages rule blocks the change, because the page would omit a recipient.
- **Root question:** How does the Privacy page name each outside service that gets user data, such as the error service and the email service?
- **Options:**
  - **A.** Name Better Stack, with the data that it gets and its EU hosting. Effort: Small.
  - **B.** Write "an error reporting service", with the same data. The text stays true if the service changes. Effort: Small.
  - **C.** Pick the form by the path of the data, and record that rule in the marketing README. The page names each service that the user's browser or account reaches directly, and describes a back-end-only service by its kind. Better Stack is then named, and Resend becomes "an email provider". Effort: Small.
  - **D.** A, and a naming rule in the "Legal pages" section of the marketing README: the page names each outside service that gets user data, except the cloud computer provider. The Resend question and each later service then follow the rule with no new decision. Effort: Small.
- **Left out:** Change nothing, because it breaks the legal-pages rule. A separate page that lists the named services, because A is better on every point: a Privacy edit asks for no new agreement.
- **Wider fix:** D. The legal-pages rule says when the page changes, not how it names a recipient. C is the same kind of fix with the other rule.
- **Previous examples:** `plans/follow-ups/privacy-invitation-email-data.md` asks the same question for Resend. Bookfolio's `ts/app/src/legal/privacy.md` names Better Stack.
- **Related:** `plans/follow-ups/privacy-invitation-email-data.md`: the same choice for the email provider. C or D settles both.
- **Recommendation:** D, after the options check. The first recommendation was A. The policy header of each app page already shows Better Stack's address, under decision 3, so a kind alone would hide a name that the app shows. B protects the page best if the service changes.
- **Chosen:** D, by the user on 10 November 2026.

## Design

Each item is an agent call of 9 November 2026, unless it names a decision.
The user can override any of them.

**Better Stack applications and keys.**

- Two Better Stack Errors applications in the EU region: one for the
  Worker, and one for the web app and the Mac window. Reason: Bookfolio
  keeps one application for each part, so that grouping, alerts, and
  limits stay apart.
- The Worker's DSN is a Worker secret, `CONDUCTIVE_ERROR_TRACKING_DSN`.
  Reason: anyone with that DSN can send false events into the Worker's
  application, so Bookfolio also keeps its API DSN secret.
- The browser DSN is public. It is a constant in `src/shared/`, empty
  until the user gives it. Reason: Bookfolio also checks in its client
  DSN, and the web app, the Worker's policy, and the Mac build then read
  one value.
- The operator sets a retention of 90 days, admin access only, and spike
  protection in Better Stack, as Bookfolio does.

**Enablement.**

- The Worker reports when its secret holds a valid Better Stack DSN. A
  missing DSN turns reporting off. An invalid DSN writes one typed warning
  and turns reporting off. Reason: the always-on rules prefer graceful
  handling and keep a new rejection for the user. Bookfolio refuses to
  start instead.
- The DSN check accepts only
  `https://<key>@s<id>.<region>.betterstackdata.com/<id>`, with the same
  ID twice, as Bookfolio's API check does. Reason: a typo cannot send
  events to another host.
- The Worker's environment is `production` when `APP_ORIGIN` is
  `https://app.conductive.build`, and `development` in all other cases.
  Reason: a developer can test with a DSN of their own, and those events
  stay apart.
- The browser reports only from a production build with a release, when
  the browser DSN is set, and when the configured app origin is
  `https://app.conductive.build`. In the browser, that origin is the page
  origin. In the Mac window, it is the app origin of the build, because
  the page origin is `conductive-app://desktop`. Reason: local builds,
  local previews, and tests then send nothing, as in Bookfolio.

**Release.**

- The release is `conductive@<commit SHA>`. One build helper reads the
  commit, and `vite.config.ts` and `desktop/vite.config.ts` give it to the
  web app, the Worker, and the Mac window. A build outside a Git checkout
  sends events with no release. Reason: Bookfolio names each release by
  the commit that built it, and Conductive deploys a local build.

**Worker capture boundary.** It follows Bookfolio's API boundary.

- Each final response with a status from 500 to 599 gives one event: an
  unknown error, a thrown known error, or a returned response.
- A failed alarm of the `Workspace` Durable Object gives one event. The
  error is then thrown again, so that Cloudflare still retries the alarm.
- A failed cron run gives one event, and the error is then thrown again.
  The cron already catches a failed retry of the approval emails and
  writes a warning, so the inventory of Milestone 6 marks that warning.
- A catch that hides an unexpected failure gives one event, such as the
  runner message catch in `worker/chat/sockets.ts` and the org cleanup
  catch in `worker/members/cleanup.ts`. A normal result, such as a busy
  cleanup lease, stays silent (decision 1).
- A warning gives an event only when the inventory of Milestone 6 marks it
  as reported. A warning about a fault of the user's own code, such as a
  failed install script, stays in Workers Logs only.
- A 4xx response, a validation result, or a refused request gives no
  event.
- `@sentry/cloudflare` runs behind one Worker module, with the
  `nodejs_compat` flag on (decision 1). Only the integrations for errors
  and stacks stay on. Reason: Bookfolio uses the Sentry SDKs, and the SDK
  parses stacks and sends through `waitUntil`.

**Worker event fields.**

- Kept: the event ID, the time, the platform, the level, the environment,
  the release, and the SDK name and version.
- One exception. Its type is the error class name when that name is a
  plain identifier, else `Error`. Its value is the fixed text of its
  classification.
- At most 50 stack frames. Each frame keeps only the function, the bundle
  file name, the line, the column, and whether the frame is Conductive
  code.
- Tags: the component (`request`, `workspace`, or `cron`), the
  classification, the HTTP method, the route template, the status, the
  code of a known error, and the Cloudflare Ray ID. A reported warning
  adds its typed values that are codes, phases, numbers, or booleans.
- The Ray ID finds the same request record in Workers Logs, while the
  request records stay on. The open follow-up
  `plans/follow-ups/request-records-in-logs.md` decides that.
- The route template keeps each path segment that the app's own route
  lists name, and writes `:param` for every other segment. Reason: a
  segment can hold an ID, and the template still groups events by route.
- Never sent: error messages, URLs, paths, queries, headers, cookies,
  bodies, tokens, the IDs of users, orgs, workspaces, and sessions, typed
  values that are IDs, breadcrumbs, and every field that the list above
  does not keep.
- The filter runs in the SDK's `beforeSend`, so every event passes it,
  also from a direct SDK call. An event that the filter cannot rebuild is
  dropped. A second pass of the filter gives the same event. Reason:
  Bookfolio's last gate, with no new lint.
- Repeat suppression in each isolate: one event for each key in 60
  seconds, at most 60 events a minute, and at most 1,024 keys. The key is
  the classification, the exception type, the route template, and the
  first frame of Conductive code. Reason: Bookfolio's limits stop a loop
  from filling the quota.
- A failure to report never changes a response, an alarm, or a cron
  result.

**Browser capture.**

- `@sentry/react` starts before the first render, from one shared module
  that `src/main.tsx` and `desktop/renderer/main.tsx` call. Reason:
  Bookfolio uses `@sentry/react` in the browser.
- React's root callbacks `onUncaughtError`, `onCaughtError`, and
  `onRecoverableError` report, and so do the SDK's handlers of uncaught
  errors and unhandled rejections. No new error screen comes (decision
  2). The follow-up `plans/follow-ups/render-crash-blank-page.md` records
  the blank page after a render crash.
- Kept: the event ID, the time, the platform, the environment, the
  release, one exception with its type and a fixed classification, stack
  frames with only the function, the bundle file, the line, the column,
  and whether the frame is Conductive code, the debug IDs of the bundle
  files, the browser and system names and versions, the tags `platform`
  (`web` or `mac`), `classification`, and `screen`, and `user.id`.
- The `screen` tag is the `screen` field of the app's route, such as
  `workspace`. The address, the IDs, and the view path never go out.
  Reason: Bookfolio's screen tag also comes from a fixed route list.
- `user.id` is the Conductive user ID of the signed-in user. The app sets
  it after sign-in and clears it at sign-out. It never sends the GitHub
  login, the name, or the avatar. Reason: Bookfolio's client sends only
  the user ID, and decision 1 follows Bookfolio's allowlist.
- Never sent: messages, URLs, breadcrumbs, console output, request data,
  cookies, local variables, screenshots, file paths, and file content.
- The SDK keeps sessions, traces, replays, logs, client reports, and
  breadcrumbs off, and it stores nothing in the browser. Reason: Bookfolio
  turns them off, and the cookie text of the Privacy page stays true.
- Better Stack can store the IP address of each browser connection with
  the event (decision 3). The Privacy page says "can store" until the
  first real browser event shows what Better Stack keeps.

**Content security policy.**

- `appContentSecurityPolicy` adds the origin of the browser DSN to
  `connect-src` when the DSN is set. The Worker and the Mac build call the
  same function, so both policies match (decision 3).

**Source maps.**

- The client build makes hidden source maps. A `.assetsignore` file in
  `public/` keeps every `.map` file out of the deployed assets. Reason: no
  map ever ships, also when a later step fails.
- Agent call, 10 November 2026: all builds inject the same release and
  deterministic debug IDs without uploading. A separate uploader runs
  only with complete operator settings. This lets a matching local build
  upload maps for an automatically deployed commit, with no token in CI.
  The local proof compares JavaScript bytes, IDs, and actual upload
  manifests. The operator must compare the deployed modules too.
- Agent call, 10 November 2026: Mac builds inject debug IDs with maps and
  uploads off. Worker frames use synthetic root bundle names that match
  private legacy artifacts. Cloudflare's map upload stays off after
  Better Stack upload and cleanup. Both plugin and CLI telemetry stay off.
- When the operator's upload settings are present, `@sentry/vite-plugin`
  uploads the maps of the web app and the Worker under the release, and
  then deletes them. Without the settings, or when an upload fails, the
  build warns and goes on. Reason: Bookfolio uploads its maps privately,
  and the always-on rules keep a new failing gate for the user.
- The upload token is a Better Stack Telemetry API token. It stays in the
  shell of the operator who deploys, never in the repository, CI, or the
  Worker.
- Agent call, 10 November 2026: the upload settings are `SENTRY_AUTH_TOKEN`,
  `SENTRY_URL`, `SENTRY_ORG`, `SENTRY_WORKER_PROJECT`, and
  `SENTRY_BROWSER_PROJECT`. Separate project settings send each bundle to
  its own application. The public browser DSN lives in
  `src/shared/error-reporting.ts`.
- Mac builds upload no maps yet. A follow-up item records that step for
  the Mac release work of `plans/conductive-desktop-notarization.md`.

**Privacy page.**

- The Privacy page names Better Stack (decision 5). The "Legal pages"
  section of the marketing README states the rule: the page names each
  outside service that gets user data, except the cloud computer provider.
- The page says that Better Stack keeps each error report for 90 days, the
  retention that the operator sets. Reason: the page gives the retention
  of each kind of data that it can, and the operator controls this one.
- "Transfers to other countries" gets an entry for Better Stack from its
  published data processing terms, as the other providers have. The
  review sources of the marketing README get those terms.
- Milestone 2 also adds Resend to "External services" of the architecture
  doc, and the plan deletes `plans/follow-ups/privacy-invitation-email-data.md`.
  Reason: decision 5 answers that item's naming question with option A,
  and the Privacy page on `main` already names Resend and the verified
  emails. Only the architecture list and the invited email address remain.

**Order and verification.**

Agent calls after main integration, 10 November 2026: main's kind-based
typed-warning API and structured object log remain canonical. The
reporting layer selects safe fields from that API, with IDs kept log-only.
This supersedes the earlier branch-only warning modules and JSON-string
log design. Main's legal modules, `privacy.ts` and `privacy-uses.ts`, keep
all Better Stack facts and all current Mac and attachment facts. Its
architecture components and protocol list remain their canonical homes.
The integration retains main's completed doc splits and removes only
redundant branch copies after their facts and links move.

- Milestone 3 does the follow-up `typed-worker-warnings.md` first. Reason:
  one typed API then keeps free text out of both Workers Logs and Better
  Stack.
- No canary. Conductive has one deployment, and Bookfolio's first proof
  also used real events. The smoke test of Milestone 6 proves that
  Better Stack takes events from `@sentry/cloudflare`, and the post-merge
  check reads the first real events.

## Milestone 1: Mockups: the Privacy page words

Tags: mockup

Depends on: none

The Privacy page tells users about the error reports. Its text lives in
`src/marketing/privacy.ts`, and the mockup catalogue draws the same text.

- [x] In "What Conductive uses, and why", add the error reports: what a
      browser report holds, what a server report holds, and their use to
      find and fix failures.
- [x] In "Who gets your data", name Better Stack (decision 5), with its EU
      hosting, the data that it gets, and the IP address that it can store
      for each browser report.
- [x] In "Transfers to other countries", add Better Stack from its
      published data processing terms.
- [x] In "How long Conductive keeps data", say that Better Stack keeps
      each error report for 90 days.
- [x] Say that an org invitation keeps the email address that the admin
      invited, as option A of
      `plans/follow-ups/privacy-invitation-email-data.md` asks.
- [x] Check that the lawful basis paragraph covers the error reports. It
      names legitimate interests to operate and secure the service.
- [x] Run `npm run mockups:check`. Smoke-test the Privacy mockup and the
      built Privacy page.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show.

Evidence: `.context/better-stack-error-reporting/milestone-1-report.md`.

Agent call, 10 November 2026: the Privacy page's recipient and transfer
sections move to `src/marketing/privacy-recipients.ts`, to keep each file
below 300 lines. Its effective date is 10 November 2026. Milestone 2 names
the new file in the marketing README. It also states the operator's EU
region check, which the approved EU hosting requires. The existing Resend
transfer gap and the mockup footer gap get separate follow-up items.

## Milestone 2: Documentation and protocol

Depends on: 1

The docs state the requirements and the decisions in force for the work
below.

- [x] Write `docs/protocol/error-reporting.md`: the parts that report, the
      enablement, the capture boundary, the event fields of each part, the
      data that never goes out, the repeat limits, the release and the
      environment, the failure safety, the browser connection, and the
      retention and access. Put each decision in force next to its
      requirement: error events over log shipping (decision 1), the Worker
      and web app scope (decision 2), the direct browser connection
      (decision 3), and no uptime checks (decision 4).
- [x] Change the network rule of the content security policy in
      `docs/protocol/access-and-security.md`: pages can also call the
      origin of the browser error reports (decision 3).
- [x] Add Better Stack to "External services" and "Where data lives" in
      `docs/architecture.md`, and link the new doc under "Protocol docs".
- [x] Add Resend to "External services" too. Then delete
      `plans/follow-ups/privacy-invitation-email-data.md`, because this
      milestone and Milestone 1 apply its option A.
- [x] Add `CONDUCTIVE_ERROR_TRACKING_DSN` to the secrets of
      `docs/deployment.md`. Add the browser DSN, the upload settings, the
      build steps of a release with maps, and the Better Stack settings.
- [x] Link the new doc from the "Docs" list of `README.md`.
- [x] Add the naming rule of decision 5 to the "Legal pages" section of
      `src/marketing/README.md`. Add Better Stack's data processing terms
      to its review sources.
- [x] Read both legal pages in full, as the legal-pages rule says. Update
      each sentence that a changed fact touches.
- [x] Check each relative link of the changed Markdown files.

Evidence: `.context/better-stack-error-reporting/milestone-2-report.md`.

Agent calls, 10 November 2026: repeat suppression uses a sliding minute
and replaces the oldest sent key at the bound, as Bookfolio does. A partial
set of upload settings disables uploads with a warning. Browser startup
and transport failures leave the app usable. Neither diagnostics nor
build output may disclose a key. The browser uses the same strict DSN
parser as the Worker. These calls implement the approved privacy and
failure-safety rules. The source-map build investigation checks matching
local uploads for automatic deployments, with no upload token in CI.

## Milestone 3: Typed Worker warnings

Depends on: 2

Option D of `plans/follow-ups/typed-worker-warnings.md`: each warning
becomes fixed text with typed values, so that no free text reaches Workers
Logs or Better Stack.

- [x] Replace `warnWorker(message: string)` with a warning of a fixed text
      key and typed values: IDs, phases, numbers, booleans, and known
      codes. Accept IDs and codes only as checked or branded values.
- [x] Make `errorSummary` return typed values.
- [x] Mark each value kind as log-only or reportable. IDs stay log-only.
- [x] Move each consumer of the replaced way, with its tests.
- [x] Keep the regression test of the terminal start warning in
      `worker/terminal/service.test.ts`.
- [x] Delete the free-text API and
      `plans/follow-ups/typed-worker-warnings.md`.
- [x] Update `worker/README.md`.
- [x] Run the targeted tests and the early check.

Evidence: `.context/better-stack-error-reporting/milestone-3-report.md`
and `milestone-3-docs-report.md` in the same folder.

Agent call, 10 November 2026: the warning catalog has one typed object for
each warning, with checked private wrappers for diagnostic text. Each log
record separates `values` from log-only `ids`. Invalid diagnostic values
are omitted, without changing an app result.

## Milestone 4: Release, browser DSN, and source maps

Depends on: 2

- [x] Add one build helper that gives `conductive@<commit SHA>`, or no
      release outside a Git checkout. Use it in `vite.config.ts` for the
      web app and the Worker, and in `desktop/vite.config.ts` for the Mac
      window.
- [x] Add the shared module in `src/shared/` with the public browser DSN,
      empty for now, and its origin.
- [x] Turn on hidden source maps in the client build. Add
      `public/.assetsignore` with `*.map`.
- [x] Add `@sentry/vite-plugin` with `npm install`. It runs only when the
      upload settings are present. It uploads the maps of the web app and
      the Worker under the release, then deletes them. It warns and goes
      on when an upload fails.
- [x] Build without upload settings. Check that the deployable assets hold
      no `.map` file. Save the evidence under
      `.context/better-stack-error-reporting/`.

Evidence: `.context/better-stack-error-reporting/milestone-4-report.md`.
The upload instances are conditional. No-upload instrumentation also runs
without settings, as the design refinement above explains. The docs
implementor updates the frozen API's README and operator guide in the same
change. Three unused shared exports await their consumers in Milestones 5
and 7. The final gate keeps its exports check unchanged.

## Milestone 5: Worker error reporting module

Depends on: 3, 4

- [x] Add `@sentry/cloudflare` with `npm install`. Turn on
      `nodejs_compat` in `wrangler.jsonc`. Check that `npm run typecheck`
      still checks the Worker production code without Node types.
- [x] Add a Worker module with the DSN check, the environment, the
      release, the SDK setup, the allowlist filter in `beforeSend`, the
      route template, the repeat suppression, and one capture function for
      each classification.
- [x] Add `CONDUCTIVE_ERROR_TRACKING_DSN` to the Worker environment type.
- [x] Test with a fake transport and an injected clock, with no network:
  - [x] A hostile error and request: its message, a URL with a query,
        headers, and IDs reach no event.
  - [x] The filter drops an event that it cannot rebuild, and a second
        pass gives the same event.
  - [x] The route template keeps the known segments and replaces the
        others.
  - [x] The suppression limits for each key, for all keys, and for the
        number of keys.
  - [x] A missing DSN sends nothing. An invalid DSN writes one warning and
        sends nothing.
- [x] Run the targeted tests.

Evidence: `.context/better-stack-error-reporting/milestones-5-6-report.md`.

## Milestone 6: Worker capture points

Depends on: 5

- [x] Reconcile the reporting implementation with main's native runtime,
      attachments, lifecycle task and alarm changes, and canonical typed
      warnings. Preserve all main behavior and assertions. Re-inventory
      the new catches and warnings. Run the required proofs again on the
      integrated tree.
- [x] Report each final 5xx response of the Worker's `fetch` once, with
      the caught error when one exists.
- [x] Report a failed `alarm` of the `Workspace` Durable Object, then
      throw the error again.
- [x] Report a failed cron run, then throw the error again.
- [x] Write the inventory of the warnings and of the catches that hide an
      unexpected failure. Mark each warning as reported or log-only.
      Report each hidden failure, such as a failed runner message in
      `worker/chat/sockets.ts` and a failed org cleanup in
      `worker/members/cleanup.ts`. Keep a busy cleanup lease silent.
- [x] Test: an unknown error gives one 500 and one event. A 4xx gives no
      event. A returned 503 gives one event. A failed alarm gives one
      event and still throws. A failed org cleanup gives one event, and a
      busy lease gives none. A failed report does not change the
      response.
- [x] Update `worker/README.md`.
- [x] Smoke-test with the Worker DSN, when the user gives it. In
      `npm run dev`, set an invalid `CONDUCTIVE_MODELS` in `.dev.vars`, open
      `/api/models`, and check one `development` event with only the kept
      fields. This also proves that Better Stack takes events from
      `@sentry/cloudflare`. Without the DSN, record the step as blocked.

Evidence: `.context/better-stack-error-reporting/milestones-5-6-report.md`.
The live Worker smoke test was not run. No real DSN was provided. The
activation follow-up retains that blocked check. Native workerd tests
proved local SDK delivery and the default transport without a provider
account. The complete gate's preview failures are under diagnosis.

Agent calls, 10 November 2026: preserve safe causes through a bounded
private Durable Object handoff and remove it at trusted receivers and the
final public boundary. Capture final HTTP status after body limiting.
Use one isolated scope per operation and detached callback. Keep verified
diagnostic snapshots through both SDK filters. Use manual redirects in
the Worker transport because workerd rejects the browser's error mode.

## Milestone 7: Web app and Mac window reporting

Depends on: 4

- [x] Add `@sentry/react` with `npm install`.
- [x] Add the shared browser module: the enablement, the SDK setup with
      the allowlist filter in `beforeSend`, the `screen` tag, and
      `user.id`.
- [x] Call it before the first render in `src/main.tsx` and in
      `desktop/renderer/main.tsx`, and pass React's root error callbacks.
- [x] Set `user.id` after sign-in, and clear it at sign-out.
- [x] Add the browser DSN origin to `connect-src` in
      `appContentSecurityPolicy`, for the Worker and the Mac build.
- [x] Test: a hostile event loses every field that the list does not
      keep. The `screen` tag never holds an address. The enablement rules
      hold, also for the Mac window's app origin. The policy names the
      origin only when the DSN is set.
- [x] Update `src/app/README.md` and `desktop/README.md`.

Evidence: `.context/better-stack-error-reporting/milestone-7-report.md`
and `milestone-7-docs-report.md` in the same folder.

Agent calls, 10 November 2026: both filter stages use the same approved
snapshot and exact object identity. Original stacks pass the shared
message-prefix check, then the browser validates loaded bundle/debug-ID
pairs. A fresh native startup probe selects headerless parsing only where
the browser uses that format. Identity follows both ready and waiting
accounts and clears for other states. Real Chrome capture and the actual
default-disabled app were checked with a fake final transport.

## Milestone 8: Verification, commit, review, and pull request

Depends on: every other milestone

- [x] Preserve main's provider-account isolation and workspace-menu changes
      during final integration. Check the clean merges and rerun the gate
      on the integrated tree before the implementation commit.
- [x] Set the browser DSN constant when the user gives it. Without it, the
      browser stays off, and a follow-up item records the step.
- [x] Record a follow-up item for the source maps of Mac builds.
- [x] Run the targeted tests and the complete gate named in `AGENTS.md`.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives the decisions and the
      design calls of this plan with their dates, a permalink to this plan,
      and the follow-up items that the change adds.

The browser DSN remains empty. `better-stack-activation.md` retains its
activation and credentialed smoke steps. `mac-renderer-source-maps.md`
retains the Mac map work. The other post-merge tasks have standalone
source-map and first-event follow-up items. The branch also records the
existing Resend transfer, Worker fixture typecheck, and stale preview-link
problems without changing their unrelated behavior.

Verification evidence is under `.context/better-stack-error-reporting/`.
The first full gate stopped after branch-caused preview dependency
snapshot failures. Main passed the focused comparison. The fix retains
the live dependency object, and all 40 preview tests pass. A later early
gate run was interrupted for a clean merge of main's release 0.4.0.
`complete-gate-final.log` records the final integrated gate.

The later `complete-gate-verified.log` passed the full gate after the cache,
promise-observation, and callback-entry corrections. A subsequent fetch
found main's provider-account and workspace-menu changes. The branch
preserves those additions in merge `4b74089a` and checks the integrated
tree before the implementation commit. The tested snapshot is retained.

The final integrated gate passed in `complete-gate-ready.log`. It covers
all repository and runner tests, all static checks, the production build,
and strict mockups. The unchanged restore-watch test failed once in the
prior run and passed its single file rerun. Its existing follow-up keeps
the exact assertion and rerun result. No source or test rule changed for
that observation. Manual Markdown links pass. Live Better Stack checks
remain blocked by the missing credentials.

## Post-merge follow-up (non-blocking)

- [ ] Create the two Better Stack Errors applications in the EU region, if
      they do not exist yet. Set a retention of 90 days, admin access only,
      and spike protection.
- [ ] Set `CONDUCTIVE_ERROR_TRACKING_DSN` as a Worker secret. Deploy from a
      clean checkout with the upload settings. Check that the deployed
      assets hold no `.map` file.
- [ ] Read the first real events of the Worker and the browser. Check the
      environment, the release, the kept fields, the source frames, and the
      absence of every field that is never sent. Check whether Better Stack
      stores the browser IP address, and correct the Privacy words if they
      differ.
