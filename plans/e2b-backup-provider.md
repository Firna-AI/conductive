# E2B as a second sandbox provider

Status: Active. On branch `calummoore/e2b-backup-sandbox-provider`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

Boat runs every sandbox and every org image of Conductive (decisions 2 and
80). The provider groundwork on main, pull request #137 under decision
213 C, stores the provider account of each sandbox and saved snapshot,
routes each call by that account, keeps one org image for each org and
account, and runs one contract suite for every provider. This change adds
E2B as the second provider kind (decision 218). Each org runs on one
provider account. A new org gets its account by chance, from weights that
the operator sets with a slider in the operator section. The operator can
also move an org. A move builds the org image on the other account, and new
workspaces start there once that build succeeds. Existing orgs stay on
Boat, and each existing workspace stays on its account.

The change adds no automatic failover and no overflow by capacity, moves no
existing workspace, and adds no desktop stream on E2B, because the app
hides the Desktop tool for now. Decision 216, the computer tools on E2B, is
open, and it blocks only the computer tools of the E2B template. E2B's
terms bar giving its service to others without its written consent, so no
real org runs on E2B before E2B confirms the use. The user sends that
request to E2B now. Decisions 219, 220, and 221 are open too, and they
block parts of Milestones 1, 7, and 8. The notes, the reviews, and the
options checks are in `.context/e2b-backup-provider/`.

Contract owners:

- [Workspaces and sandboxes](../docs/protocol/workspaces-and-sandboxes.md),
  [Org image](../docs/protocol/org-image.md), and
  [Workspace life](../docs/protocol/workspace-life.md).
- [Isolation](../docs/protocol/isolation.md),
  [Terminal, previews, and desktop](../docs/protocol/terminal-previews-and-desktop.md),
  and [Agent tools](../docs/protocol/agent-tools.md).
- [Operator section](../docs/protocol/operator-section.md) and
  [Operator actions](../docs/protocol/operator-actions.md).
- The architecture docs:
  [components](../docs/architecture/components.md),
  [data and trust](../docs/architecture/data-and-trust.md), and
  [flows](../docs/architecture/flows.md). Also the
  [deployment inputs](../docs/deployment.md).
- The [sandbox provider README](../worker/sandbox/README.md), the
  [provider accounts page](../worker/lifecycle/provider-accounts.md), and
  the [sandbox software README](../image/README.md).
- The [operator README](../worker/operator/README.md) and the
  [operator section README](../src/shell/operator/README.md).

Replaced ways:

- Each create, build, refresh, and image read takes the default account
  `boat` → each takes the account of its org. Consumers: the
  `DEFAULT_PROVIDER_ACCOUNT` defaults in
  `worker/app-api/feature-settings-data.ts`, `worker/lifecycle/create-request.ts`,
  `worker/lifecycle/image-builds.ts`, `worker/lifecycle/published-image-data.ts`,
  `worker/lifecycle/workspaces.ts`, `worker/lifecycle/image-schedule.ts`,
  `worker/lifecycle/image-timers.ts`, `worker/lifecycle/org-image-data.ts`,
  and `worker/lifecycle/build-data.ts`. Also the first build of a new org in
  `worker/app-api/feature-org.ts`, the push refresh of one account in
  `worker/lifecycle/org-image-refresh-data.ts` and
  `worker/github/composition.ts`, and the Cron repair of the default account
  in `worker/lifecycle/repair-data.ts`. Also these calls that leave out the
  account: `worker/lifecycle/browser.ts`, `worker/tools/composition.ts`,
  `worker/tools/lists.ts`, `worker/app-api/feature-settings.ts`,
  `worker/members/composition.ts`, `worker/lifecycle/repair.ts`, and
  `worker/lifecycle/image-build-failure.ts`. The reads of older saved state
  keep their default: `worker/lifecycle/start-job-codec.ts`,
  `worker/lifecycle/image-timers.ts`, `worker/lifecycle/image-coordinator.ts`,
  and `worker/lifecycle/runtime.ts`. Moved in Milestone 3.
- The day-14 restart of every account → the restart only of the accounts of
  the kind `boat`. Consumer: `worker/lifecycle/disk-retention.ts`. Moved in
  Milestone 3.
- One account configuration with a Boat organization ID → one configuration
  for each provider kind. Consumers: `worker/sandbox/accounts.ts`,
  `worker/sandbox/client.ts`, `worker/env.ts`, and
  `worker/sandbox/accounts.test.ts`. Moved in Milestone 4.

## Decisions

The numbers continue after decision 217, the highest number on main. The
operator section on main uses the numbers 142 to 147. So the earlier
decisions of this plan keep no number, as "Earlier decisions" below says.

### 218. A Boat outage still stops every start

Changed on 10 November 2026 by the options check: a new root question, and
options H, I, and J. The recommendation stays G.

- **Severity:** High. **Effort:** Large.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `worker/sandbox/accounts.ts`,
  `worker/lifecycle/org-image-data.ts`, and the follow-up item about the
  choice of a second provider, which this change deletes.
- **Background:** Decision 213 C built the groundwork with Boat only, and it
  moved the choice of a second provider to after the launch. On main, each
  org runs one build at a time. Each create, build, and refresh takes the
  account `boat` by default.
- **Problem:** Until a second provider runs, a Boat outage stops every
  start, build, and refresh.
- **Impact if no action:** An outage after the launch blocks all users until
  Boat recovers.
- **Root question:** How does Conductive keep starts, builds, and refreshes
  working for users when Boat cannot run them? The options check wrote
  this root question, because the first one named E2B and its role.
- **Options:**
  - **A.** Keep decision 213 C, and choose the provider from the launch
    data. No work now. Effort: Small.
  - **B.** Build the E2B side now, with no production use: the account
    kind, the adapter, its contract driver, the template, and the live
    checks. Effort: Large.
  - **C.** B, plus a warm standby for all orgs. Each build and each daily
    refresh also makes the E2B copy. One operator switch moves all new work
    at once. Effort: Large.
  - **D.** B, plus a cold standby for all orgs. The copies build after the
    switch, so the first starts wait. Effort: Large.
  - **E.** C, plus overflow. A create that Boat refuses for lack of capacity
    goes to E2B with no operator action. Effort: Large.
  - **F.** Added by the user's question: B, plus one provider for each org.
    Every workspace, build, and refresh of an org uses that org's provider.
    The operator sets the provider of an org that has no org image yet.
    Effort: Large.
  - **G.** F, plus an operator move. A move builds the org image on the
    other provider. When that build succeeds, the org's new work goes
    there. The existing workspaces stay on their provider until they are
    archived. Effort: Large.
  - **H.** Added by the options check: G in two steps. First build the
    account of each org, the weights, and the move, and test them with a
    second Boat account. Send the consent request to E2B at once. Build the
    E2B client, the template, and the live check only after E2B consents.
    The operator cannot try E2B through the app until then. Effort: Large.
  - **I.** Added by the options check: G, plus a bulk move. The Providers tab
    moves every org of one account to the other, through a queue within the
    limits of the target account. Each org still waits for its own build.
    Effort: Large.
  - **J.** Added by the options check: G, plus portable workspaces. Each stop
    also pushes the changes of the workspace to a hidden ref in its GitHub
    repository. When its account cannot start it, a resume makes a new
    sandbox on the org's account from that ref. Ignored files, such as
    installed dependencies, do not move. Effort: Large.
- **Left out:**
  - Another provider, because the user's message names E2B. This reason ends
    if E2B refuses its consent.
  - A second Boat account, because a Boat outage stops it too.
  - One org image that both providers boot from the app's storage, because
    the app must not hold a copy of each user's code.
- **Wider fix:** E. It moves new work to E2B by itself when Boat refuses a
  create for lack of capacity. An outage still needs an operator action.
  Only J also covers the existing workspaces.
- **Previous examples:** This plan chose a cold standby on 8 November 2026.
  Decision 213 C replaced it on 9 November 2026.
- **Related:** Decision 216 applies under B to G.
- **Recommendation:** G. The first recommendation was C. One provider for
  each org keeps the one build per org that main already has, and it
  removes the second copies and the global switch. A move gives each org a
  way out of an outage, at the cost of one build. Choose C only if every
  org must switch at once. The options check also recommends G. Choose H
  if E2B's terms must hold before any E2B work starts.
- **Action:** ask the user, because options B to G change decision 213 C.
- **Chosen:** G, by the user on 10 November 2026, with two refinements. A
  new org gets its provider by chance, from weights that the operator sets
  with a slider in the operator section. The operator can also move an
  org, also for tests, so that the operator can create a workspace on each
  provider. This changes decision 213 C.

### 219. Members see a move build as their own failure

Changed on 10 November 2026 by the options check: a new root question,
options D and E, and the recommendation changed from B to D.

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `worker/lifecycle/image-builds.ts`, the Settings mark in
  `src/shell/list/Sidebar.tsx`, and the Cloud computer tab in
  `src/app/computer-model.ts`.
- **Background:** A move builds the org image on the other account with the
  build code of the org. The Cloud computer tab of the org lists each
  build. When the newest build failed, the Settings link shows a mark, and
  the tab offers Try again. Each build job row keeps the install script, the
  repositories, and their folders that its build ran.
- **Problem:** Members see a move build as a build of their own. A failed
  move gives them a mark and a Try again that builds on the old account,
  though their image still works. A move build also applies a saved script
  that nobody built yet.
- **Impact if no action:** Admins see failures that they cannot fix.
- **Root question:** What do members see of a move, and what does the move
  change for them? The options check wrote this root question, because the
  move can also apply a script that nobody built.
- **Options:**
  - **A.** Members see the move build as any build. A failed move build
    gives the mark and Try again, as today. Effort: Small.
  - **B.** Members see the move build while it runs. A failed move build
    gives no mark and no Try again, because the image of the org still
    works. The operator sees the failure. Effort: Small.
  - **C.** Members do not see the move build. Only the operator section shows
    it. A Build computer of an admin waits until the move build ends.
    Effort: Medium.
  - **D.** Added by the options check: B, and the move build rebuilds the
    image that members use now. It copies the install script, the settings
    revision, the repositories, and their folders from the build records of
    the newest good image. So a saved script that nobody built cannot fail
    the move or reach members without Build computer. Effort: Medium.
  - **E.** Added by the options check: B, and a failed move build stays in
    the history with its log and a note. The note says that new workspaces
    still start from the current image. Admins can then find a script that
    fails only on the new cloud computer. E can join D. Effort: Small.
- **Left out:**
  - A move that waits until the saved scripts match the last good build,
    because D gives the same image with no wait and no refusal.
  - A Try again that retries the move, because admins then see a provider
    failure that they cannot fix.
- **Wider fix:** D. It keeps the rule of B for the mark, and it keeps the
  image that members use, whatever the saved settings hold.
- **Previous examples:** None found.
- **Related:** Decision 220: both are about the build of a move.
- **Recommendation:** D. The first recommendation was B, and the options
  check recommends D. D keeps the view of B, and a move cannot fail or
  change the cloud computer because of a script that nobody built.
- **Action:** ask the user, because a move build is behaviour at a boundary
  that no requirement covers.

### 220. A move waits behind a stuck build

Changed on 10 November 2026 by the options check: a new root question, and
options D and E. The recommendation stays B.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `startImageBuild` in `worker/lifecycle/image-builds.ts`.
- **Background:** One org runs one build at a time. When a build runs, a new
  build request gets the running build back. Each build has a 60-minute
  limit from its start.
- **Problem:** A move to E2B waits until a running Boat build of the org
  ends. A build that gets only provider errors fails after 10 minutes, the
  provider retry window. A build that hangs with no error holds the move for
  up to 60 minutes.
- **Impact if no action:** The orgs that the operator moves in an outage
  start later, by 10 minutes to an hour.
- **Root question:** How soon does a moved org get new workspaces on the new
  account when the org has a build in progress? The options check wrote
  this root question, because the first one named the mechanism.
- **Options:**
  - **A.** The move waits until the running build ends, then builds on the
    new account. It needs a saved move that starts after that build.
    Effort: Medium.
  - **B.** The move ends the running build of the old account. That build
    fails, as a build of a suspended user does, and the move build starts
    at once. Effort: Small.
  - **C.** Allow one running build for each account of an org, so that the
    move build runs beside the old build. Effort: Large.
  - **D.** Added by the options check: the move waits, as in A, unless the
    operator ends the build. The Move dialog shows a running build of the
    old account and offers to end it. Effort: Medium.
  - **E.** Added by the options check: the move ends a running refresh at
    once, and it waits for a running build of the install script. A refresh
    only fetches commits, so ending it loses nothing. Effort: Medium.
- **Left out:**
  - A move that refuses while a build runs, because it adds a refusal and
    the operator must still wait.
  - A move that ends only a stuck build, because a hang shows no error that
    the Worker can find.
- **Wider fix:** C. It removes the wait for each build on another account.
- **Previous examples:** The groundwork of decision 213 C kept one build and
  one image coordinator for each org.
- **Related:** Decision 219: under B, members see the ended build.
- **Recommendation:** B. A move matters most in an outage, and then the old
  build cannot finish anyway. The Move dialog says that the move ends the
  running build. C costs much more for a rare case. The options check also
  recommends B.
- **Action:** ask the user, because B ends a build that an admin started,
  and A and B have real trade-offs.

### 221. The operator section names the providers

Changed on 10 November 2026 by the options check: a new root question, and
the wider fix. The recommendation stays A.

- **Severity:** Low. **Effort:** Small.
- **Source:** Design.
- **Category:** UX wording.
- **Location:** "The provider" in `docs/protocol/workspaces-and-sandboxes.md`,
  and the operator section in `src/shell/operator/`.
- **Background:** Decision 80 says that user-facing text never names Boat:
  in the app, the Mac app, the marketing site, Get started, and the legal
  pages. Its reason is that the app can move to another provider later.
  The operator section is part of the web app, and only operators see it.
- **Problem:** The slider and the account of each org must tell the
  providers apart. No rule says how the operator section names them.
- **Impact if no action:** Milestones 1 and 8 cannot write the labels of the
  slider and of each org.
- **Root question:** How does an operator know which provider runs each
  account, while users still never learn the provider? The options check
  wrote this root question, because in an outage the operator must know
  which account is Boat.
- **Options:**
  - **A.** Show the account IDs, such as `boat` and `e2b`. The protocol then
    lets operator screens name a provider. Effort: Small.
  - **B.** Show a label for each account from the Worker settings, such as
    "Primary" and "Backup". No screen names a provider. Effort: Small.
  - **C.** Show neutral numbers, such as "Provider 1" and "Provider 2".
    Effort: Small.
- **Left out:**
  - No account names on operator screens, because the slider and Move need
    a target.
  - A provider name on member screens, because decision 80 stays.
- **Wider fix:** None. Each stored record keeps its account ID, so an old ID
  never gets a new provider, and a label can name a provider too.
- **Previous examples:** Decision 80 hid the provider from users on
  5 November 2026.
- **Related:** None.
- **Recommendation:** A. Only operators see the section, and the operator
  must know which provider each account is. The reason of decision 80, a
  later change of provider, still holds, because the IDs come from the
  settings. The options check also recommends A.
- **Action:** ask the user, because A changes the scope of decision 80, and
  no recorded user decision covers that change.

### 216. Agents on E2B get no computer tools

Open. The decision lives in
`plans/follow-ups/second-provider-computer-tools.md`, with its options A to
E. Decision 218 chose E2B, so the decision now waits for the user. It
blocks only the computer tools TODO of Milestone 6. This plan recommends B:
a screen, Chrome, and the Cua Driver in the E2B template, registered as
`computer`.

### Earlier decisions

The full record is in this plan at
[commit 6262d08](https://github.com/Firna-AI/remote-code/blob/6262d084c6fdae8e4a1014b01f0e84eeebc39ff9/plans/e2b-backup-provider.md).

- On 8 November 2026, the user chose a cold standby on E2B with one
  operator switch for all orgs. Decision 213 C replaced it on 9 November
  2026, and decision 218 G replaced that on 10 November 2026.
- On 8 November 2026, the user chose one desktop stream through the Worker
  for both providers. The Desktop tool is now hidden.
  `plans/follow-ups/desktop-stream-on-own-domain.md` holds the same
  replacement transport, and this change adds the E2B reason to it.
- Two open questions about the wait after a global switch do not apply
  under decision 218 G.

## Design

These are agent calls of 10 November 2026. The user can change each one.

### Accounts and records

- E2B is the second provider kind, `e2b`, as decision 218 says.
- The E2B client is TypeScript in the Worker, behind `SandboxProvider`, with
  a fixed route list, as the Boat client has. It uses no E2B SDK. Reason:
  the isolation rules allow only a fixed list of provider routes, and the
  reply budgets of decision 84 need control of each reply. The crate
  `sandbox-e2b` in `futex-ai/sandbox` is the reference for the create
  recovery, the snapshot recovery, and the port token.
- Each provider kind has its own account configuration. A Boat account has
  an API key and an organization ID. An E2B account has an API key, the
  domain of the EU cluster, and a template ID. The E2B account has the ID
  `e2b` in `SANDBOX_PROVIDER_ACCOUNTS`.
- Each org stores its provider account. Existing orgs get `boat`. The image
  readers and the starts of creates, builds, and refreshes take the account
  of the org in place of the default.
- The Cron repair advances the org image record of the account of each org.
- One org still runs one build at a time. A move build waits for a running
  build of the org.
- The Worker keeps the traffic token of each E2B sandbox encrypted in a new
  table. Reason: E2B gives it at create and resume, and a connect that
  reads it resumes a paused sandbox. A read of the sandbox gives the envd
  token, so the Worker does not store that token. The new table only adds
  data, as the rules for a schema change after the launch ask.
- E2B runs in its EU cluster, near the workspace objects in Western Europe.
  The E2B project holds only the app's sandboxes and snapshots. Every E2B
  sandbox has private traffic.
- User-facing text names no provider (decision 80). The operator section
  names the accounts as decision 221 says.
- Only accounts of the kind `boat` get the day-14 restart, because E2B
  keeps a paused sandbox with no time limit.

### E2B sandboxes

- The E2B template has Boat's machine size, 4 vCPU and 8 GiB, and the
  software of `BASE_IMAGE` in `src/shared/base-image.ts`. Reason: the
  protocol gives one machine size, and the Cloud computer tab lists one
  base image.
- The deployment guide asks E2B support for three things: the EU cluster,
  filesystem-only pauses and snapshots, and a disk of 51 GB, as Boat's
  default size has. Reason: E2B refuses filesystem-only snapshots until
  support turns them on, and its Pro disk is 20 GiB.
- An E2B stop is a pause in the filesystem-only mode. So a stop ends every
  process, as the protocol says. A resume boots from the disk, and the
  startup script runs, as on Boat.
- Each E2B snapshot of an org image is filesystem-only too. Reason: a
  memory snapshot can keep a clone token or another secret of the build,
  and no saved snapshot may hold a secret.
- The E2B client writes the env vars to `/run/ascii-secrets/env.sh` at each
  create and resume, where Boat puts them. A live check confirms that
  `/run` is not on the saved disk of E2B. If it is, the client writes the
  file to a path that is not saved, and the image scripts read it there.
- A detached E2B command writes its output to files in the sandbox, and the
  client reads those files from the saved byte offsets. Reason: the app
  stores byte offsets, and E2B has no reads from an offset.
- The file read limit stays 5 MiB. A file write uses the envd upload.
- On E2B, `desktop` returns a typed error, because the app hides the Desktop
  tool. `fork` returns a typed error too, because no production code calls
  it. E2B leaves out the optional `hydrated` field.

### Weights and moves

- When an org is created, the Worker draws its account once, from the
  weights, before the first build of the org starts. The weights are an app setting in D1, with 100% for `boat` by
  default. Only a configured account can have a weight.
- A new tab of the operator section, Providers, shows the weights as a
  slider between `boat` and `e2b`, and the number of orgs on each account.
  The mockups can move the slider to another place.
- The Orgs tab and the page of an org show the account of each org. The page
  of an org offers Move.
- A move reuses a current org image on the target account, or it builds
  one. A current image has the same settings revision, repositories, and
  runner protocol version as the newest good image of the org. When the
  image is ready, the org's account changes. Until then, new workspaces
  start on the old account.
- A failed move build leaves the org on its old account. The page of the
  org shows the failure. Decision 219 says what members see.
- A move build follows the rules of an automatic refresh: it needs an admin
  who is not suspended. It keeps the build kind `build`, because open tabs
  refuse a kind that they do not know. Decision 219 says what it builds.
- A move of an org with no good image changes the account at once, and the
  next build of the org runs there. When the first build of the org still
  runs, decision 220 settles that build first.
- A move of a suspended org changes nothing, and it answers as a build of a
  suspended org does.
- A move back during a move build ends that build, and the org stays on its
  account. A running build of the old account follows decision 220.
- A move that reuses an image also moves the refresh of the org to the new
  account.
- Each change of the weights and each move records the operator and the
  time, as the pause and the suspensions do.
- Each existing workspace stays on its account until it is archived.
- No real org gets a weight or a move to E2B before E2B confirms in writing
  that the app may give its sandboxes to the app's users. Reason: E2B's
  terms bar it, under "Prohibited Conduct", item 2, unless E2B authorizes
  it in writing. Item 9 also bars third-party applications that interact
  with the Services without consent. Option H of decision 218 reads that
  item to cover the E2B work itself.
- No code keeps real orgs off E2B. The operator keeps the E2B weight at 0%,
  and moves only a test org, until E2B consents. Reason: only the operator
  sets the weights, and a code gate adds a new refusal.
- The user asks E2B for that consent now, not after the merge, because each
  real org on E2B waits for it.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The operator section shows the weights of new orgs, the account of each
org, and the move. The labels wait for decision 221, and the member view of
a move build waits for decision 219.

- [ ] Add the Providers tab to the operator mockups: the slider between
      `boat` and `e2b`, and the number of orgs on each account.
- [ ] Add the account of each org to `OperatorOrgsScreen` and
      `OperatorOrgScreen` in `docs/mockups/src/screens/`.
- [ ] Add Move to `OperatorOrgScreen`: the action, the confirm dialog that
      says that existing workspaces stay, the running move build, and a
      failed move.
- [ ] Draw what members see of a move build on the Cloud computer tab, as
      decision 219 says.
- [ ] Run `npm run mockups:check`. Smoke-test the changed pages with
      `npm run mockups:serve`.
- [ ] Update the design and the TODOs of this plan for each problem that the
      mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

The protocol docs, the architecture docs, and the deployment guide state
the second provider, the weights, and the move.

- [ ] Update "The provider" in `docs/protocol/workspaces-and-sandboxes.md`:
      two providers, one account for each org, the weights of new orgs,
      the move, the hidden names, and one machine size.
- [ ] Update `docs/protocol/org-image.md`: the org image of each account,
      the builds and refreshes on the org's account, and the move build.
- [ ] Update `docs/protocol/workspace-life.md`: the day-14 restart applies
      only to Boat.
- [ ] Update `docs/protocol/isolation.md`: the E2B key, the E2B project, the
      fixed routes and reply budgets of each provider, private traffic, and
      the stored traffic token.
- [ ] Update `docs/protocol/terminal-previews-and-desktop.md`: the port
      credential of each provider, in place of Boat's port cookie.
- [ ] Update `docs/protocol/operator-section.md`: the Providers tab, the
      account and Move of an org, and the weights as a third setting, beside
      the codes and the pause of decision 160. This changes the rule of
      decision 143 that the section changes no other setting. Update
      `docs/protocol/operator-actions.md` for the move.
- [ ] Update "Computer tools" in `docs/protocol/agent-tools.md` as decision
      216 says.
- [ ] Update the architecture docs: components, data and trust, and flows.
- [ ] Update `docs/deployment.md`: the E2B account in
      `SANDBOX_PROVIDER_ACCOUNTS`, the three requests to E2B support, E2B
      Pro before a real org, and E2B's written consent.
- [ ] External docs: `src/marketing/privacy.ts` and `src/marketing/terms.ts`
      give the facts of a second provider: the account, the country of
      E2B, its region, and the transfer safeguards. Delegate this TODO to
      the `external docs implementor`.
- [ ] Under decision 221 A, give the rule on Boat in `AGENTS.md`, which
      `CLAUDE.md` links to, the same exception for operator screens.
- [ ] Check each relative link of each changed Markdown file.

## Milestone 3: The account of each org

Depends on: 2

Each org has one provider account, and new orgs get it from the weights.
Boat stays the only configured account, so the behaviour stays the same.

- [ ] Add a D1 migration with the account of each org, `boat` for each
      existing org, and the weights setting. Read the `databases` skill
      first.
- [ ] Draw the account of a new org from the weights, once, when the org is
      created, before Create org starts its first build in
      `worker/app-api/feature-org.ts`.
- [ ] Move each consumer of the default account under "Replaced ways" to the
      account of the org. Keep the default only for older saved jobs.
- [ ] Make the Cron repair and the push refresh use the record of each
      org's account.
- [ ] Run the day-14 restart only for accounts of the kind `boat`.
- [ ] Test the draw, the account of each create, build, and refresh, the
      repair, and the restart rule.
- [ ] Update the provider accounts page and the lifecycle README.

## Milestone 4: E2B client for lifecycle and snapshots

Depends on: 3

An E2B client implements the lifecycle and snapshot methods of
`SandboxProvider`. No org uses it yet.

- [ ] Add the kind `e2b` and its account configuration. Handle each
      exhaustive switch over the kind.
- [ ] Add `worker/sandbox/e2b/` with a fixed list of E2B control routes:
      create, read, delete, pause, resume, timeout, the list by metadata,
      and snapshot create, read, and delete. Use the shared bounded JSON
      reader and safe typed errors with no provider text.
- [ ] Each create sets private traffic, a filesystem-only pause at its
      timeout, its template or snapshot, and metadata with its idempotency
      key. Recover an ambiguous create through the metadata list, and never
      send a second create.
- [ ] Map the E2B states to `SandboxState`. Map `stop` to a filesystem-only
      pause, `resume` to a resume that boots from the disk, and
      `setAutoStop` to the timeout.
- [ ] Map the app's snapshot names to E2B snapshot IDs, so that
      `getSnapshot` and `deleteSnapshot` find each snapshot.
- [ ] Add the table of the traffic tokens, encrypted.
- [ ] Add a fake E2B server to `worker/test-support/` and an E2B contract
      driver. Run the lifecycle, snapshot, and error contracts with it.
- [ ] Add "The app's E2B account" to `worker/sandbox/README.md`.

## Milestone 5: E2B client for commands, files, and ports

Depends on: 4

The E2B client implements the rest of `SandboxProvider`.

- [ ] Add the fixed envd routes: process start, file read, file write, and
      file info, with the envd token from a read of the sandbox.
- [ ] `runCommand` waits up to 600 seconds, as on Boat.
- [ ] `startCommand` writes the output and the exit code of a detached
      command to files in a private folder. `getCommandStatus` reads them
      from the saved byte offsets, within the 18 MiB budget.
- [ ] `readFile` keeps the 5 MiB limit and the size result. `writeFile`
      uses the envd upload.
- [ ] Write the env file at each create and resume, with mode 600.
- [ ] `privatePort` gives the E2B port origin and the traffic token as a
      header credential. `desktop` and `fork` give typed errors.
- [ ] Run the command, file, and port contracts with the E2B driver.

## Milestone 6: E2B template and org image builds

Depends on: 5

Org images build on E2B, and an E2B sandbox runs the workspace software.

- [ ] Add the E2B template under `image/e2b/`: Ubuntu 24.04, the software
      of `BASE_IMAGE`, Docker, 4 vCPU, and 8 GiB. Add a developer script
      that builds the template and prints its ID.
- [ ] Add the computer tools to the template, as decision 216 says. This
      TODO waits for decision 216.
- [ ] Add an E2B mode to the live check in `image/`, beside the Boat mode.
- [ ] In a live E2B sandbox, confirm that systemd starts the enabled
      services at boot, and that `/run` is not on the saved disk. Needs:
      an E2B key, and filesystem-only snapshots turned on by E2B support.
- [ ] Run builds on E2B through the E2B client: the first from the template,
      and a later one from the E2B org image. `install.sh` and the terminal
      install run unchanged. Save the output under
      `.context/e2b-backup-provider/`. Needs: an E2B key.
- [ ] Update `image/README.md`.

## Milestone 7: Weights and moves in the Worker

Depends on: 3, 5

The operator section can read and set the weights, and move an org. The
move waits for decisions 219 and 220.

- [ ] Add the operator routes of the weights, with the gate and the
      `operator_required` answer of the other operator routes. A weight can
      name only a configured account.
- [ ] Add the account of each org and the number of orgs on each account to
      the operator replies.
- [ ] Add the move route. It reuses a current org image on the target
      account or builds one. It changes the org's account when the image is
      ready, and it records a failed move. A repeat starts no second build.
- [ ] Handle the cases of the design: an org with no good image, a
      suspended org, a move back, a running build as decision 220 says, and
      the refresh of a reused image.
- [ ] Record the operator and the time of each weight change and each move.
- [ ] Keep a move build to an account with no image from counting as the
      first good build of the org, so that it starts no added build.
- [ ] Keep the cleanup of an ended build on the old account from holding
      back the refresh of the new account.
- [ ] Test the routes, the draw with weights, the reuse, the build, the
      failure, and the account of the next create.
- [ ] Update the operator README and the provider accounts page.

## Milestone 8: Weights and moves in the operator section

Tags: ui

Depends on: 1, 7

The operator section shows the Providers tab, the account of each org, and
Move, as the mockups show.

- [ ] Add the Providers tab with the slider and the counts.
- [ ] Add the account of each org to the Orgs tab and the page of an org.
- [ ] Add Move to the page of an org, with its dialog, its running build,
      and its failure.
- [ ] Test each state, and update the operator section README.

## Milestone 9: Live check through the app

Depends on: 6, 8

The operator creates a workspace on each provider through the app.

- [ ] Move the operator's own test org to E2B. Create a workspace, run a
      chat turn, and open the terminal and a preview. Move the org back to
      Boat, and create a workspace there. Save the output under
      `.context/e2b-backup-provider/`. Needs: an E2B key, and
      filesystem-only snapshots turned on by E2B support.

## Milestone 10: Verification, commit, review, and pull request

Depends on: 1, 2, 3, 4, 5, 6, 7, 8, 9

The complete change passes the gate and the review.

- [ ] Run the targeted tests and the complete gate, `npm run check`.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
- [ ] Delete `plans/follow-ups/second-provider-computer-tools.md` when the
      template applies decision 216.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives the decisions and the
      design calls of this plan with their dates, a permalink to this plan,
      and the follow-up items that the change adds.

## Post-merge follow-up (non-blocking)

- [ ] Set the E2B account on the deployed Worker. Make the three requests to
      E2B support, and move the E2B project to Pro.
- [ ] Keep every real org off E2B until E2B's written consent arrives.
- [ ] On the deployed app, move a test org to E2B, create a workspace, and
      move it back.
