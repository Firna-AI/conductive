# Sandbox provider groundwork

Status: Active. On branch `calummoore/vercel-sandbox-provider`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

Every sandbox and every org image of Conductive runs in the app's own Boat
account (decisions 2 and 80). The Worker reaches Boat through
`SandboxProvider`, but Boat is also built into the records, the client
lookup, the org image record, and the port proxies. This change prepares the
Worker for more than one sandbox provider, and keeps Boat as the only one
(decision 213). Each record stores the provider account of its sandbox or
saved snapshot. The Worker picks the client by that account. The proxies
and the terminal take the port credential from the client. Contract tests
state what every provider must do. Decision 217 decides whether the org
image also gets one record for each provider in this change.

The behaviour stays the same, so no protocol doc changes. The change adds
no second provider, no overflow, no operator switch, and no capacity. The
choice of the second provider waits until after the launch (decision 213).
The brainstorm notes and sources are in `.context/vercel-provider/`. The
options checks are in `.context/sandbox-provider-groundwork/`.

Open decisions: 214, 215, and 217 wait for the user. Decision 217 blocks
Milestone 3. Decisions 214 and 215 block no milestone. Decision 216 waits
for the choice of the second provider.

Contract owners:

- The [architecture doc](../docs/architecture.md).
- The [sandbox provider README](../worker/sandbox/README.md).
- The [lifecycle README](../worker/lifecycle/README.md), the
  [previews README](../worker/previews/README.md), the
  [terminal README](../worker/terminal/README.md), and the
  [members README](../worker/members/README.md).
- The [test support README](../worker/test-support/README.md) and the
  [migrations README](../migrations/README.md).

Replaced ways:

- One Boat client for every sandbox call → the client of the provider
  account that each record stores. The old way is `sandboxProvider` and
  `orgSandboxProvider` in `worker/sandbox/client.ts`, and
  `deletedOrgProvider` in `worker/members/cleanup-provider.ts`, which gives
  one client for every resource of a deleted org. Consumers:
  `worker/app-api/archive.ts`, `worker/files/boat.ts`,
  `worker/lifecycle/cleanup.ts`, `worker/lifecycle/image-builds.ts`,
  `worker/lifecycle/input-activity-update.ts`,
  `worker/lifecycle/start-allocation-cleanup.ts`,
  `worker/lifecycle/start-coordinator.ts`,
  `worker/lifecycle/workspace-actions.ts`,
  `worker/members/cleanup-provider.ts`, `worker/members/cleanup.ts`,
  `worker/members/retention.ts`, `worker/previews/provider.ts`, and
  `worker/workspace.ts`. Also the test support and tests
  `worker/chat/integration/browser-runners.test-support.ts`,
  `worker/chat/integration/chat-create-journey.test.ts`,
  `worker/chat/integration/workspace-resume-response.test.ts`,
  `worker/lifecycle/workspace-runtime-test-worker.ts`, and
  `worker/operator/suspension-test-support.ts`. Moved and deleted in
  Milestone 4.
- One org image for each org, in `settings.org_image_name`,
  `settings.image_build_id`, and the refresh fields of `settings` → a record
  for each org and provider account. This way applies only when decision 217
  moves the org image in this change. Consumers:
  `worker/app-api/feature-settings-data.ts`,
  `worker/lifecycle/build-admission-data.ts`, `worker/lifecycle/build-data.ts`,
  `worker/lifecycle/disk-retention.ts`, `worker/lifecycle/first-image-build.ts`,
  `worker/lifecycle/image-builds.ts`, `worker/lifecycle/image-schedule.ts`,
  `worker/lifecycle/image-timers.ts`, `worker/lifecycle/published-image-data.ts`,
  `worker/lifecycle/repair-data.ts`, `worker/lifecycle/retention-command.ts`,
  `worker/lifecycle/settings-data.ts`, `worker/lifecycle/workspace-resume.ts`,
  `worker/members/creation-checkpoint.ts`, and `worker/members/deletion-data.ts`.
  Also the test support and tests
  `worker/chat/integration/outer-seed.test-support.ts`,
  `worker/lifecycle/first-build-admission.test.ts`,
  `worker/lifecycle/first-build-test-support.ts`,
  `worker/lifecycle/first-image-build.test.ts`,
  `worker/lifecycle/image-allocation-cleanup.test.ts`,
  `worker/lifecycle/image-deadlines.test.ts`,
  `worker/lifecycle/image-job-time-limit.test.ts`,
  `worker/lifecycle/image-lease-builds.test.ts`,
  `worker/lifecycle/image-refresh.test.ts`,
  `worker/lifecycle/image-sources/deadline.test.ts`,
  `worker/lifecycle/ownership-maintenance-test-support.ts`,
  `worker/lifecycle/published-image-creation.test.ts`,
  `worker/lifecycle/published-image-test-support.ts`,
  `worker/lifecycle/real-runtime-test-support.ts`,
  `worker/lifecycle/repair-budget.test.ts`,
  `worker/members/deletion-test-support.ts`, and
  `worker/operator/org-lifecycle.test.ts`. Moved in Milestone 3. Deleted as
  decision 217 says.
- Boat's `_port_auth` cookie and Boat's `_token` and `_port_auth` query
  parameters in the proxies and the terminal → the port credential that the
  client gives. The old way is `PrivatePort` in `worker/sandbox/provider.ts`
  and `worker/sandbox/boat.ts`. Consumers: `worker/previews/handler.ts`,
  `worker/previews/headers.ts`, `worker/previews/origins.ts`,
  `worker/previews/ports.ts`, `worker/previews/proxy.ts`, the `privatePort`
  pass-through in `worker/previews/provider.ts`, and
  `worker/terminal/handler.ts`. Also the tests
  `worker/previews/headers.test.ts`, `worker/previews/transport.test.ts`,
  `worker/terminal/handler.test.ts`, and `worker/features/tools-routes.test.ts`.
  Moved and deleted in Milestone 5.

## Decisions

The numbers continue after decision 212, the highest number that another
open branch uses. The user chose decision 213 on 9 November 2026, in the
brainstorm of this branch. Decisions 214 to 216 came from the same
brainstorm. The options check of the same day added options to decisions
213 to 216, and it raised decision 217.

### 213. Prepare for a second provider, and keep Boat for now

The options check added E, F, G, and H after the user's answer. The answer
stands until the user changes it.

- **Severity:** Medium. **Effort:** Large.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `worker/sandbox/`, `worker/lifecycle/`, `worker/members/`,
  `worker/previews/`, `worker/terminal/`, `migrations/`, and the E2B plan on
  branch `calummoore/e2b-backup-sandbox-provider`.
- **Background:** Every second provider needs the same shared changes
  first. Milestone 3 of the E2B plan describes most of them, with Boat as
  the only client. No second provider can be ready for the launch, when
  Conductor Cloud goes read-only on 13 November and shuts down on
  20 November 2026.
- **Problem:** The E2B plan adds a provider for outages only. E2B Pro runs
  only 100 sandboxes at once, so it adds little launch capacity.
- **Impact if no action:** The E2B plan builds a backup that adds little
  capacity. An overflow provider later is a second build.
- **Root question:** Which second provider does Conductive add, and when?
  The options check wrote this root question, because C answers when.
- **Options:**
  - **A.** E2B for outages only, as the E2B plan says. Effort: Large.
  - **B.** Vercel in place of E2B, for outages and for overflow. It gives
    10,000 sandboxes at once on Pro, at $0.17 to $0.27 an hour. Extra work:
    a proxy guards the public ports, the Worker starts the runner and the
    terminal at each resume, and the env file moves off the saved disk.
    Risk: Vercel's terms limit giving its service to other parties, so
    Vercel must confirm the use in writing. Effort: Large.
  - **C.** Do the groundwork now, with Boat as the only provider. Choose the
    provider after the launch, from the real peak and from Boat's record. A
    Boat outage still stops every start. Effort: Large.
  - **D.** Superserve in place of E2B, for outages and for overflow. It
    needs less adapter work than Vercel, because it has private ports with
    tokens, and it keeps paused sandboxes with no time limit. Risk: a
    company of 3 to 5 people, no published regions, no confirmed SOC 2, and
    terms that limit giving its service to other parties. The price is
    about 9 times Boat's. Effort: Large.
  - **E.** Added by the options check: change nothing now. Choose the
    provider after the launch, and build the groundwork with it in one
    branch. The seams then fit that provider. Risk: after a Boat outage,
    the whole build must finish before any start works. Effort: Small.
  - **F.** Added by the options check: store the Boat organization as the
    provider account. New work goes to a new Boat organization that holds
    only the app's work, as `plans/follow-ups/separate-boat-organization.md`
    asks. Old records keep working in the old organization. Cost: a second
    key, a second organization ID, a second Boat plan, and a protocol change
    while two organizations exist. Effort: Large.
  - **G.** Added by the options check: Sprites on Fly.io in place of E2B,
    for outages and overflow. A Sprite keeps its disk, and an idle Sprite
    pays only for storage. Its Hero plan runs 100 at once. The limits of
    larger plans and the port access are not confirmed. Effort: Large.
  - **H.** Added by the options check: an own fleet of sandbox machines. It
    removes the vendor's terms and its hourly markup. Cost: weeks of work,
    and servers and on-call duty to run. Effort: Large.
- **Left out:**
  - Two new providers together, because one provider can fill both roles.
  - More Boat organizations only for their limits, because a seat on Boat's
    $2000 plan adds full limits with no code. F keeps a second organization
    for a different reason: isolation and a real second account.
  - Daytona, because its largest self-serve tier pools 500 vCPU, about 125
    sandboxes at 4 vCPU. So it adds little capacity, as E2B does.
  - Modal, because decision 2 found about 13 times Boat's price, more than
    B costs.
  - Cloudflare's sandboxes, because their Docker storage does not survive a
    sleep, and a sandbox holds at most 20 GB of disk.
  - Portable workspaces, option D of decision 142, because alone they fail
    the goal: they need a second provider to move to.
- **Wider fix:** B or D. Either one gives one layer for all providers, and
  that layer serves overflow and outages.
- **Previous examples:** Decision 2 left Vercel Sandbox out for price on
  5 November 2026. On 8 November 2026, the user chose E2B as a cold standby
  (decision 142 of the E2B plan). Its option A, "prepare the exit only", is
  a smaller form of C.
- **Related:** Decision 142 of the E2B plan: the options conflict, and C
  changes it. Decision 216 applies when a second provider is chosen. F and
  option E of decision 214 both give the app its own Boat organization.
- **Recommendation:** C. No second provider can help the launch, and the
  launch data will show which provider the app needs. The options check
  also recommends C. E is cheaper only if the chosen provider reshapes the
  seams. B best protects the codebase once users need more capacity than
  Boat sells. The first recommendation was B.
- **Action:** ask the user, because C changes decision 142, which chose E2B
  as a cold standby.
- **Chosen:** C, by the user on 9 November 2026. This changes decision 142
  of the E2B plan. The groundwork here takes the place of Milestone 3 of
  that plan.

### 214. Launch demand can pass Boat's limits

Open. It needs a change of the Boat account, not of the code, so it blocks
no milestone. The options check changed the root question and added D, E,
F, and G. The recommendation changed from A to E.

- **Severity:** High. **Effort:** Small.
- **Source:** Design.
- **Category:** Performance.
- **Location:** None. The plan is a setting of the Boat account.
- **Background:**
  - All orgs share the limits of the app's Boat account (decision 80). The
    product is free, with no limits for each user (decision 81).
  - Boat's $20 plan runs 100 sandboxes at once, and at most 36 starts in a
    minute and 1,200 in a day with paid extra starts. The $2000 plan runs
    2,000 at once, and at most 270 starts in a minute and 14,400 in a day.
  - Each extra seat on the $2000 plan adds a full set of limits. The plan
    price comes back as compute time at $0.036 an hour.
  - The app's own work also uses starts: the first build of each new org,
    the daily refresh of each org, a refresh after a push at most every 30
    minutes, and the restart near day 14.
  - The app shares the "Firna" Boat organization with other work
    (decision 137), so that work uses the same limits.
- **Problem:** The current Boat plan is not recorded. The plan records of
  5 November 2026 say $20, and a launch can need more.
- **Impact if no action:** At the limit, new and resumed workspaces fail,
  just when most new users arrive.
- **Root question:** How do new and resumed workspaces keep starting during
  the launch peak? The options check wrote this root question, because the
  first one named only more supply.
- **Options:**
  - **A.** Move the Boat account to the plan that fits the expected peak,
    such as $500 or $2000. Size it by the starts in a minute as well as by
    the day. Turn on invoiced extra starts. Ask Boat for a custom plan if
    needed. No code. Risk: Boat's own machines can still run out, and a
    Boat outage still stops all starts. Effort: Small.
  - **B.** Build Vercel overflow before the launch. It cannot be ready
    before 13 November, and a rushed provider adds risk at the launch.
    Effort: Large.
  - **C.** Admit new users only as fast as capacity allows, with a waitlist
    or invite codes. It changes decision 81. Effort: Medium.
  - **D.** Added by the options check: cut the app's own starts during the
    launch. Skip the daily refresh of an org with no workspace start in
    7 days, and allow at most one refresh after a push in 2 hours. It
    changes the rules of "The org image" in the protocol. Effort: Medium.
  - **E.** Added by the options check: before the launch, give the app its
    own Boat organization on the plan that A sizes. This is option B of
    `plans/follow-ups/separate-boat-organization.md`. Cost: a second Boat
    plan. Each existing org needs a new build, and test workspaces lose
    their sandboxes. It changes decision 137. Effort: Small.
  - **F.** Added by the options check: log a Worker warning when Boat's
    replies show few starts left, and at each `limit_reached` reply. Then
    raise the plan in time. Risk: a fast spike can pass the limit before a
    person acts. Effort: Small.
  - **G.** Added by the options check: during the launch, stop idle
    sandboxes sooner, for example after 10 minutes. This frees running
    slots, and Boat does not count a resume that takes back a machine that
    it still holds. It changes decisions 11 and 29. Effort: Small.
- **Left out:** Several workspaces in one sandbox, because it breaks
  decision 4 and cannot be ready for the launch. E2B for overflow, because
  E2B Pro runs only 100 sandboxes at once.
- **Wider fix:** None here. Decision 213 gives the structural fix.
- **Previous examples:** The options check of decision 34 found the $20
  limits on 5 November 2026. Decision 23 set limits for each user, and
  decision 45 removed them. Decision 137 kept the shared organization for
  the first deployment.
- **Related:** Option F of decision 213 also gives the app its own Boat
  organization, after the groundwork.
- **Recommendation:** E. It is A in an organization of the app's own: the
  app gets the whole plan, the key reaches only the app's sandboxes, and
  the move costs least before real users arrive. The first recommendation
  was A, and the options check recommends A.
- **Action:** ask the user, because only the user can change the Boat plan
  and its spend, and E changes decision 137.

### 215. Users get no reason when capacity is full

Open. A busy message is a separate change from this groundwork, so this
decision blocks no milestone. The options check changed the root question,
the impact, and the action reason, and it added E and F. The recommendation
changed from B to F.

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `worker/lifecycle/provider-retry.ts:47`,
  `worker/lifecycle/start-failure.ts:44`, and "A failed first start" in
  `docs/protocol/create-a-workspace.md`.
- **Background:**
  - Boat refuses a start with `rate_limited` when a start limit is reached,
    with the next free time. It refuses with `limit_reached` when every
    sandbox slot is in use, with only a wait. Boat does not count a refused
    start.
  - The Worker retries with backoff for up to 10 minutes. When the wait is
    longer than that, the start fails at once.
  - A refused build or refresh fails with "The cloud computer image could
    not build. Check the log and try again."
  - "A failed first start" already says that members see the cause of the
    failure.
- **Problem:** The workspace then shows "The cloud computer could not
  start. Try again." Nothing says that all cloud computers are busy, or when
  to try again.
- **Impact if no action:** At the launch, users see failures with no
  reason, and they cannot tell a busy app from a broken one.
- **Root question:** What happens to a start, a build, or a refresh when no
  cloud computer is free? The options check wrote this root question,
  because builds and refreshes also reach the limit.
- **Options:**
  - **A.** No change. Effort: Small.
  - **B.** Say that all cloud computers are busy, and give the time when
    Try again can work. Effort: Small.
  - **C.** Add a queue. The start waits in line, shows that it waits for a
    free cloud computer, and starts when one is free. The 20-minute start
    limit of decision 128 then includes the wait. Effort: Medium.
  - **D.** Limit the running cloud computers of each user, so that one user
    cannot take every slot. It changes decision 81. Effort: Medium.
  - **E.** Added by the options check: a start that the provider refuses for
    capacity keeps retrying until its 20-minute limit. A start step says
    that it waits for a free cloud computer. Risk: the waiting starts have
    no order. Effort: Medium.
  - **F.** Added by the options check: one typed capacity failure, with its
    wait when the provider gives one. Starts, resumes, builds, and refreshes
    show it in place of the generic text. The Boat adapter maps its 429
    replies and its 503 `out_of_capacity` reply to it. Effort: Medium.
- **Left out:** Overflow to a second provider, because decision 213 chose
  to wait.
- **Wider fix:** F. It shows the cause on every path that reaches the limit,
  and a later provider maps its own replies to the same failure.
- **Previous examples:** Decision 130 keeps a failed first start in the
  error state with Try again. Decision 23 set limits for each user, and
  decision 45 removed them.
- **Recommendation:** F. It covers every path that reaches the limit, and a
  later provider needs no change there. The first recommendation was B. C
  best protects users, but it needs a new waiting state.
- **Action:** ask the user, because the wait time and the texts for a
  resume, a build, and a refresh are new behaviour at a boundary that no
  requirement covers.

### 216. Agents on a second provider have no computer tools

Waits for the choice of the second provider (decision 213). The options
check added C, D, and E. The recommendation changed from A to B.

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** "Computer tools" in `docs/protocol/agent-tools.md`, and
  `runner/src/providers/computer-mcp.ts`.
- **Background:** The app hides the Desktop tool, but the agents still get
  Boat's `computer` MCP server for browser work. Boat writes its entry into
  `/home/user/.claude.json` at each start, and the runner only passes it on.
  The server needs a screen and Chrome in the sandbox.
- **Problem:** On a second provider, the runner finds no `computer` entry.
  It warns and runs the agents without browser tools.
- **Impact if no action:** Agents in workspaces on the second provider
  cannot open or test a web page in a browser.
- **Root question:** Do agents get browser tools on every provider?
- **Options:**
  - **A.** Start without computer tools on the second provider, and add B
    later. The runner already runs the agents without them. It changes
    "Computer tools" in the agent tools protocol. Effort: Small.
  - **B.** Install our own computer tools in the image of the second
    provider: a virtual screen, Chrome, and the open-source Cua Driver,
    registered as `computer`. Effort: Medium.
  - **C.** Added by the options check: ship a headless browser MCP server,
    such as Playwright MCP, with the runner software. The runner uses it
    when a sandbox has no `computer` entry. Cost: a browser download in each
    build, browser tools only, and a change to "Computer tools".
    Effort: Medium.
  - **D.** Added by the options check: install our own screen, Chrome, and
    Cua Driver as `computer` in the shared software step, on every provider.
    Cost: the app then owns the driver on Boat too, and "Computer tools"
    changes. Effort: Large.
  - **E.** Added by the options check: the Worker calls the provider's
    computer-use API through the workspace MCP server, and the provider key
    stays in the Worker. Cost: it works only where a provider sells such an
    API, such as Superserve, and each action makes a round trip.
    Effort: Large.
- **Left out:** A browser outside the sandbox, because it needs a preview
  viewer that is not a user session, and the preview rules do not allow
  one.
- **Wider fix:** D. One set of tools then works on every provider, with no
  drift between two sets.
- **Previous examples:** On 8 November 2026, the E2B plan chose to install
  the Cua Driver on E2B.
- **Related:** Decision 213. This decision applies when a second provider
  is chosen.
- **Recommendation:** B. It keeps the "Computer tools" rule with no
  protocol change, and users cannot see the provider, so a missing browser
  would have no visible reason. The first recommendation was A. D best
  protects the codebase.
- **Action:** ask the user, because the options trade the work of the first
  version against the same tools on every provider, and no option is
  clearly best.

### 217. The deployed Worker still reads the old org image fields

New on 9 November 2026, from the options check.

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small.
- **Source:** Design.
- **Category:** Product bug.
- **Location:** Milestone 3, the org image fields of `settings`, and
  "When a deploy fails" in `docs/automatic-deploys.md`.
- **Background:** Milestone 3 would move the org image of each org from
  `settings` to a record for each org and provider account. A deploy applies
  the D1 migrations first, and the old Worker runs on the new schema until
  the upload. A rollback restores an old Worker, but it does not undo a
  migration.
- **Problem:** When this change drops the old fields, the old Worker fails
  during that window, and a rollback to it fails too. When the change keeps
  them, the old way stays after the plan, and only a user decision can keep
  it for a deployed Worker.
- **Impact if no action:** Builds and new workspaces can fail for some
  minutes at the deploy, and a rollback cannot restore a working Worker.
- **Root question:** When and how does the org image get one record for each
  provider account, with no break for the deployed Worker?
- **Options:**
  - **A.** Move it in this change. Keep the old fields, unread. Drop them in
    a follow-up change after one good deploy. A rollback then reads the
    image as of the migration. Effort: Small.
  - **B.** As A, and the new code also writes the old fields until the
    follow-up drops them. A rollback then reads the newest image. Cost: a
    converter that writes two places. Effort: Small.
  - **C.** Move it and drop the old fields in this change. Accept a short
    failure window at the deploy, and no rollback. Effort: Small.
  - **D.** Leave the org image in `settings` for now. Move it in the plan of
    the second provider, which also decides whether one org can build on two
    providers at once. This removes Milestone 3 and its risk from this
    change. Cost: the provider plan grows by about 30 files. Effort: Small.
- **Left out:** A deploy that uploads the Worker before the migrations,
  because the new Worker then runs on the old schema.
- **Wider fix:** None. Each destructive migration needs its own order.
- **Previous examples:** `migrations/202611070003_creation_image_leases.sql`
  dropped and renamed a lease table in one deploy.
- **Related:** Decision 213, which chose the groundwork.
- **Recommendation:** D. The org image is the seam that the chosen provider
  will most likely reshape, because each provider builds images in its own
  way, and the move needs two deploys. B keeps the most of the groundwork
  with a safe rollback.
- **Action:** ask the user, because the user decides how long an old way
  stays for a deployed Worker.

## Design

These are agent calls of 9 November 2026. The user can change each one.

- Build only the Boat side of each seam. Reason: code that the product
  never runs is dead code, so a header credential, command output files,
  and a service start by command wait for a provider that needs them.
- Shape each seam so that it can take the differences in the provider
  table of the brainstorm: a port cookie or a port header, output by offset
  or from files, and systemd or a start command. Reason: the next provider
  then adds code beside Boat's, and moves no caller again.
- Each record stores a provider account: the key of one client that the
  Worker configures. Production configures one account, `boat`, from
  `BOAT_API_KEY` and `BOAT_ORG_ID`. Each account has a provider kind, a
  string type with one value, `boat`, and each switch over the kind is
  exhaustive. Reason: the type check then finds each place that a new
  provider must handle, and a second account of the same kind needs only
  configuration.
- Tests configure a second Boat account, on a second organization of the
  fake Boat server. Reason: each lookup, routing, and cleanup test can then
  fail, also while production has one account.
- Agent call, 9 November 2026: the trusted Worker environment can add
  accounts through a readonly `SANDBOX_PROVIDER_ACCOUNTS` map. It cannot
  replace the built-in `boat` account. Reason: tests can use a second real
  account boundary while production still reads its one Boat account from
  `BOAT_API_KEY` and `BOAT_ORG_ID`.
- Agent call, 9 November 2026: resource identity includes both the account
  and the sandbox ID or snapshot name. The migration keeps all workspace
  rows, child rows, numbers, counters, and triggers when it replaces the
  global sandbox uniqueness with account-scoped uniqueness. Reason: two
  accounts can return the same resource ID.
- Each table that holds a sandbox ID or a saved snapshot name gets its own
  `provider_account` column. Existing rows get `boat` from the column
  default, and so do the rows that the old Worker writes during a deploy.
  Every writer of the new code sets the account itself. Reason: the one
  record of every computer, in `plans/follow-ups/computer-ledger.md`, is a
  large change of its own, and a column for each table keeps this change
  local. The ledger can own the account when it lands.
- A stored account that the Worker does not configure fails the call with a
  typed error. A cleanup never counts such a record as removed. Reason:
  otherwise a sandbox whose account is lost would leak as "already gone".
- Agent call, clarified 9 November 2026: new builds and refreshes use the
  default account, `boat`. A new workspace, also Try again of a failed first
  start, takes the account of its selected org image's published build.
  Production has only the `boat` account. Every later sandbox call uses
  the workspace's stored account. Reason: an image can create a sandbox
  only in its own account, and a workspace's files stay on that disk.
- The workspace Durable Object stores the account with the image name and
  the allocated sandbox of each start job. Reason: a start resumes from that
  storage after a restart.
- One org keeps one running build at a time. Reason: `runningBuild` and the
  build coordinator assume one build for each org, and with one account the
  behaviour stays the same. The provider plan decides about parallel builds.
- The image scripts keep Boat's env file path, `/run/ascii-secrets/env.sh`,
  and systemd. A second provider puts its env file at the same path, on
  storage that its saved disk does not keep. When it cannot, the env file
  seam comes with that provider. Reason: on Vercel, `/run` is on the saved
  disk, so a plain write there would save the secrets.
- The `hydrated` field of a sandbox stays an optional Boat detail. Reason:
  only Boat restores a disk in the background.
- `SandboxProvider.fork` has no production caller, so the contract suite
  leaves it out. Reason: a contract for it would make every provider build
  a method that the product never calls.
- The work starts now. The pull request merges after the launch rush, when
  the user decides. Reason: the change touches every start path, and it
  adds no capacity by itself.
- User-facing text does not change, and it names no provider (decision 80).

## Milestone 1: Documentation — completed

Depends on: none

The architecture doc and the area READMEs say that each record stores its
provider account, and that Boat is the only provider. The protocol docs
stay as they are, because the behaviour stays the same.

- [x] Update `docs/architecture.md`: the Worker reaches each provider
      through the client of the stored account, D1 and the workspace object
      hold the account of each sandbox and saved snapshot, and Boat is the
      only provider.
- [x] Read `src/marketing/terms.ts` and `src/marketing/privacy.ts` in full.
      Update each sentence that restates a fact that this milestone
      changes.
- [x] Check each relative link of each changed Markdown file.

## Milestone 2: Provider account of each sandbox and saved snapshot — completed

Depends on: 1

Each record that holds a sandbox ID or a saved snapshot name also holds its
provider account. Boat stays the only provider, and the behaviour stays the
same.

- [x] Read the `databases` skill and `migrations/README.md`.
- [x] Search `migrations/` for every column that holds a sandbox ID or a
      saved snapshot name. Today these tables have one: `workspaces`,
      `image_builds`, `image_build_jobs`, `lifecycle_sandbox_cleanup`,
      `image_leases`, `workspace_creation_plans`, `image_source_jobs`,
      `org_deletion_resources`, `terminal_credentials`, and
      `preview_hostnames`. Decision 217 sets what happens to `settings`.
- [x] Add one D1 migration with a `provider_account` column on each such
      table, as the design says.
- [x] Each writer sets the account of the sandbox or snapshot that it
      records, and each reader returns it.
- [x] Store the account in each start job of the workspace Durable Object,
      beside the image name and the allocated sandbox.
- [x] Keep every existing test green. Add the tests that a create, a build,
      and a cleanup record store the account of a second test account.
- [x] Update the lifecycle, members, and migrations READMEs.

Evidence: `.context/sandbox-provider-groundwork/reports/lifecycle-accounts.md`,
`reports/tool-member-accounts.md`, `reports/account-readmes.md`, and
`migration-proof.log` in that evidence directory.

## Milestone 3: One org image for each org and provider account

Depends on: 2. Waits for decision 217. Under its option D, this milestone
is removed.

Each org keeps one org image for each provider account. With one account,
the behaviour stays the same.

- [ ] Add a D1 migration with a record of the org image for each org and
      account: the image name, its build, and the refresh fields. Copy the
      fields of `settings` into it with the account `boat`.
- [ ] Move each consumer under "Replaced ways" to the new record, with every
      assertion of its tests.
- [ ] Keep, write, or drop the old fields of `settings`, as decision 217
      says.
- [ ] Keep one running build for each org, as the design says.
- [ ] Update the lifecycle, members, and migrations READMEs.

## Milestone 4: The client of the stored account

Depends on: 2

The Worker picks the client by the stored account. New work uses the
default account, `boat`.

- [ ] Add the provider kind and the account configuration to
      `worker/sandbox/`, as the design says. Production reads one account
      from `BOAT_API_KEY` and `BOAT_ORG_ID`.
- [ ] Add a lookup that gives the client of an account, with and without the
      membership check. Give no provider key to its caller. An unknown
      account fails with a typed error.
- [ ] Add the default account for new creates, builds, and refreshes.
- [ ] Move each consumer of `sandboxProvider`, `orgSandboxProvider`, and
      `deletedOrgProvider` under "Replaced ways". A deleted org gets the
      client of each resource from the account of that resource. Then delete
      the three functions.
- [ ] Keep every existing test green. Add the tests that a record of the
      second test account reaches its own fake organization, and that a
      cleanup never counts a record of an unknown account as removed.
- [ ] Update the sandbox, lifecycle, and members READMEs.

## Milestone 5: The port credential of the client

Depends on: 4

The previews and the terminal take the port credential from the client.
Boat's credential stays its `_port_auth` cookie.

- [ ] Give `PrivatePort` a credential that the client builds. The
      credential says how the Worker sends it to the port, and which
      browser cookies, headers, and query parameters the proxies must drop.
      Boat's names its `_port_auth` cookie and its `_token` and
      `_port_auth` query parameters.
- [ ] Move the preview proxy, the `privatePort` pass-through, and the
      terminal to the credential. Keep the drop of a browser copy of the
      credential.
- [ ] Delete the Boat cookie and query code of the proxies and the
      terminal.
- [ ] Keep every assertion of the moved tests, such as each check of
      `_port_auth=server-port-token` on the request to the port.
- [ ] Update the previews, terminal, and sandbox READMEs.

## Milestone 6: Contract tests for `SandboxProvider`

Depends on: 4, 5

One shared suite states what the callers rely on from each provider
method. It runs against the fake Boat server.

- [ ] Read the `testing` skill.
- [ ] Add the suite with moved assertions only: lifecycle states, a safe
      retry of a create, saved snapshots, commands that wait and detached
      commands with their offsets, file reads with the 5 MiB limit, the port
      credential, and the typed errors. Leave `fork` out, as the design
      says.
- [ ] Move each assertion of the Boat adapter tests that every provider
      must meet into the suite, with no assertion lost. Keep Boat's route,
      header, and response budget tests beside the Boat adapter.
- [ ] Update the test support and sandbox READMEs.

## Milestone 7: Verification, commit, review, and pull request

Depends on: 1, 2, 3, 4, 5, 6

The complete change passes the gate and the review.

- [ ] Run the targeted tests and the complete gate, `npm run check`.
- [ ] Run the live check of `image/` on Boat: create a workspace, run a
      chat turn, open the terminal and a preview, then stop, resume, and
      archive. Save the output under `.context/sandbox-provider-groundwork/`.
      Needs: a Boat key from the user.
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

## Post-merge follow-up (non-blocking)

- [ ] Choose the second provider from the launch data, as decision 213
      says: the real peak, Boat's record, the answers of Vercel and
      Superserve about their terms, Sprites, and an own fleet. Decision 216
      then applies.
- [ ] Under option A or B of decision 217, drop the old org image fields of
      `settings` after one good deploy.
