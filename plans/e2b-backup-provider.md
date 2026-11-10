# E2B as a second sandbox provider

Status: Active. [PR #193](https://github.com/Firna-AI/remote-code/pull/193) is open as a draft on `calummoore/e2b-backup-sandbox-provider`. The plan stays while its real-provider checks remain incomplete.

Boat runs every sandbox and every org image of Conductive (decisions 2 and
80). The provider groundwork on main, pull request #137 under decision
213 C, stores the provider account of each sandbox and saved snapshot,
routes each call by that account, keeps one org image for each org and
account, and runs one contract suite for every provider. This change adds
E2B as the second provider kind (e2b decision 222). Each org runs on one
provider account for its whole life. A new org gets its account by chance,
from weights that the operator sets with a slider in the operator section.
When an operator creates an org, the operator can choose its account
instead. Only operators see that choice. Existing orgs stay on Boat.

The change moves no org and no workspace between accounts, and it adds no
automatic failover and no overflow by capacity. Agents on E2B get no
computer tools for now (decision 216 A). The app hides the Desktop tool, so
E2B gets no desktop stream. E2B's terms bar giving its service to others
without its written consent, so no real org runs on E2B before E2B
confirms the use. The user sends that request to E2B now. The notes, the
reviews, the options checks, and a draft of the request are in
`.context/e2b-backup-provider/`.

Contract owners:

- [Workspaces and sandboxes](../docs/protocol/workspaces-and-sandboxes.md),
  [Org image](../docs/protocol/org-image.md),
  [Workspace life](../docs/protocol/workspace-life.md), and
  [Orgs and members](../docs/protocol/orgs-and-members.md).
- [Isolation](../docs/protocol/isolation.md),
  [Terminal, previews, and desktop](../docs/protocol/terminal-previews-and-desktop.md),
  and [Agent tools](../docs/protocol/agent-tools.md).
- [Operator section](../docs/protocol/operator-section.md).
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

- Allocation cleanup uses an active provider client to recover identity
  through create → identity-only E2B cleanup, with proved no-resource
  outcomes and tombstones. Consumers: `worker/lifecycle/start-allocation-cleanup.ts`,
  `worker/lifecycle/image-allocation.ts`, `worker/lifecycle/build-execution.ts`,
  and `image/e2b/live-resources.ts`. Moved in Milestone 5, with the live
  check updated in Milestone 6. Boat keeps its existing behavior.

## Decisions

The user answered every decision of this plan on 10 November 2026. The
original answer numbers followed decision 217, then the highest on main. The
operator section on main uses the numbers 142 to 147, so the earlier
decisions of this plan keep no number, as "Earlier decisions" below says.
The full text of decisions 218 to 221, with every option and each options
check, is in this plan at
[commit 237fb84](https://github.com/Firna-AI/remote-code/blob/237fb8485d3e2d4a5819611730a6aa3e7d514c24/plans/e2b-backup-provider.md).

The prefix `e2b` names this provider change, under main's current rule for
later changes. Its live provider-choice record is e2b decision 222. The
user answered it as 218.
Main's preview change uses 218 and 219 for other choices. The branch-local
renumber keeps the original answer and leaves the global numbering rule
unchanged. Historical answer numbers below keep their original form.

### e2b decision 222. A Boat outage still stops every start

Original answer number: 218. The choice and its date are unchanged.

- **Root question:** How does Conductive keep starts, builds, and refreshes
  working for users when Boat cannot run them?
- **Options:** A, keep decision 213 C and wait for the launch data. B, the
  E2B side with no production use. C, a warm standby for all orgs. D, a cold
  standby for all orgs. E, C with overflow by capacity. F, one provider
  account for each org. G, F with an operator move. The options check added
  H, G with the E2B work after E2B consents, I, a bulk move, and J,
  portable workspaces.
- **Left out:** another provider, because the user named E2B. A second Boat
  account, because a Boat outage stops it too.
- **Recommendation:** G. The first recommendation was C. The options check
  also recommended G.
- **Chosen:** G, by the user on 10 November 2026, with these refinements:
  - A new org gets its account by chance, from weights that the operator
    sets with a slider in the operator section.
  - In a later answer of the same day, the user dropped the move for now.
    When an operator creates an org, the operator chooses its account
    instead, and only operators see that choice. So the org of an operator
    can run on E2B for tests.
  - This changes decision 213 C, which chose the provider after the launch.

### 219. Members see a move build as their own failure

Does not apply. The user chose no move for now on 10 November 2026. The
operator chooses the account of an org when the operator creates it.

### 220. A move waits behind a stuck build

Does not apply, for the same reason as decision 219.

### e2b decision 221. The operator section names the providers

- **Root question:** How does an operator know which provider runs each
  account, while users still never learn the provider?
- **Options:** A, show the account IDs, such as `boat` and `e2b`, on
  operator screens. B, show labels from the settings. C, show neutral
  numbers.
- **Chosen:** A, by the user on 10 November 2026, as recommended. Operator
  screens show the account IDs. This includes the account choice that only
  operators see when they create an org. User-facing text for every other
  person still names no provider (decision 80).

### e2b decision 216. Agents on E2B get no computer tools

- **Chosen:** A, by the user on 10 November 2026: E2B starts with no
  computer tools, and B, the Cua Driver in the E2B template, comes later.
  The agent recommended B. `plans/follow-ups/second-provider-computer-tools.md`
  now holds B as a post-merge task.

### Earlier decisions

The full record is in this plan at
[commit 6262d08](https://github.com/Firna-AI/remote-code/blob/6262d084c6fdae8e4a1014b01f0e84eeebc39ff9/plans/e2b-backup-provider.md).

- On 8 November 2026, the user chose a cold standby on E2B with one
  operator switch for all orgs. Decision 213 C replaced it on 9 November
  2026, and decision 218 G replaced that on 10 November 2026.
- On 8 November 2026, the user chose one desktop stream through the Worker
  for both providers. The Desktop tool is now hidden.
  `plans/follow-ups/desktop-stream-on-own-domain.md` holds the same
  replacement transport, with the E2B reason.
- Two open questions about the wait after a global switch do not apply
  under decision 218 G.

## Design

These are agent calls of 10 November 2026. The user can change each one.

### Accounts and records

- E2B is the second provider kind, `e2b`, as e2b decision 222 says.
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
- Each org stores its provider account, and it keeps that account for its
  whole life. Existing orgs get `boat`. The image readers and the starts
  of creates, builds, and refreshes take the account of the org in place
  of the default.
- The Cron repair and the push refresh use the org image record of the
  account of each org.
- One org still runs one build at a time.
- The Worker keeps the traffic token of each E2B sandbox encrypted in a new
  table. Reason: E2B gives it at create and resume, and a connect that
  reads it resumes a paused sandbox. A read of the sandbox gives the envd
  token, so the Worker does not store that token. The new table only adds
  data, as the rules for a schema change after the launch ask.
- E2B runs in its EU cluster, near the workspace objects in Western Europe.
  The E2B project holds only the app's sandboxes and snapshots. Every E2B
  sandbox has private traffic.
- Only accounts of the kind `boat` get the day-14 restart, because E2B
  keeps a paused sandbox with no time limit.

### E2B sandboxes

- The E2B template has Boat's machine size, 4 vCPU and 8 GiB, and the
  software of `BASE_IMAGE` in `src/shared/base-image.ts`. Reason: the
  protocol gives one machine size, and the Cloud computer tab lists one
  base image.
- The E2B template has no computer tools, as decision 216 A says. The
  runner then warns that the computer tools are unavailable, and the agents
  run without them, as the runner already does when a sandbox has no
  `computer` entry.
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

### Weights and the operator's choice

- When a person who is not an operator creates an org, the Worker draws its
  account once, from the weights, before the first build of the org starts.
- The weights are an app setting in D1, with 100% for `boat` by default.
  Only a configured account can have a weight.
- When an operator creates an org, the create screen shows the account
  choice: "By weights", `boat`, or `e2b`. "By weights" is the default. The
  choice lists only configured accounts. Reason: the operator can then put
  a test org on each provider.
- The Worker reads the account choice only from an operator. From anyone
  else, it ignores the choice and draws from the weights. Reason: a person
  who is not an operator must not pick a provider, and an ignored field adds
  no new refusal.
- The operator section shows the weights in a new tab, Providers, as a
  slider between `boat` and `e2b`, with the number of orgs on each account.
  The Orgs tab and the page of an org show the account of each org. The
  mockups can move the slider to another place.
- Operator screens name the accounts by their IDs, as e2b decision 221 A says.
  No screen for other people names a provider.
- Each change of the weights records the operator and the time, as the
  pause and the suspensions do.
- No code keeps real orgs off E2B. The operator keeps the E2B weight at 0%,
  and puts only test orgs on E2B, until E2B consents in writing. Reason:
  only the operator sets the weights and the choice, and a code gate adds
  a new refusal.
- E2B's terms bar giving access to its service to others, under "Prohibited
  Conduct", item 2, unless E2B authorizes it in writing. Item 9 also bars
  third-party applications that interact with the service without consent.
  The user asks E2B for that consent now, not after the merge.

### Implementation calls of 10 November 2026

These are agent calls within the approved requirements.

- The mockups share the slider, account choice, and account counts with the
  app. These parts import no fixture. This keeps the visual spec and the
  app aligned.
- A single configured account shows its full share without a slider.
  Create org still offers By weights and that account.
- The org-create catalogue keeps one main screen and puts its other
  states on linked child pages. This preserves every state and the
  catalogue's limit of five screens on a page.
- The operator reads and changes weights at `/api/operator/providers`.
  An omitted `providerAccount` in Create org means By weights.
- `SANDBOX_PROVIDER_ACCOUNTS` is JSON text in a Worker secret. The shared
  reader parses it into account configurations. This supports real secret
  bindings and local `.dev.vars` files without publishing account keys.
- Effective weights exclude accounts removed from configuration. They
  normalize the remaining shares. With none left, new orgs use the default
  `boat` share and the Worker logs a safe warning. Existing orgs and saved
  resources keep their accounts. This follows the configured-account and
  graceful-handling rules.
- A stale or unconfigured operator account choice uses By weights and a
  safe warning. This keeps new assignments on configured accounts without
  a new refusal.
- A draw uses 48 bits from the hash of a fresh random token. Effective
  shares use largest remainder rounding, with account ID as the tie break.
- A weight save compares effective shares. An equal distribution keeps
  its raw setting, operator, and time. A concurrent write retries against
  the current setting before it records one atomic change.
- The Providers page uses the slider for two accounts. With more accounts,
  it shows one percentage field for each ID and the total. This preserves
  every configured account without a configuration refusal.
- An operator's optional account-list read never blocks Create org. By
  weights stays usable while that read loads or fails.
- Operator suspension and lift warnings name `boat` when they describe
  day-14 disk loss. This applies the approved retention rule and the
  operator naming exception without another account read.
- The retention check covers active workspaces and deleted orgs. Both
  paths must skip accounts whose kind is not `boat`.
- E2B stores durable create claims and snapshot mappings beside encrypted
  traffic tokens. A lost response must not cause a second create or
  snapshot request.
- A temporary command supervisor records output bytes and the timeout
  result under `/run`. E2B does not return the timeout result that the
  existing command contract needs.
- A private TCP relay handles E2B previews of localhost listeners. E2B's
  ingress reaches the sandbox network address. The relay accepts only a
  port and forwards to loopback. It keeps no token.
- The shared preview relay reads E2B's sandbox ID and configured domain
  from a small root-owned file under `/run`. This preserves its host
  checks for E2B's outer port. It strips provider headers before the app.
- Allocation cleanup gets an identity-only E2B client. It never creates,
  connects, or bootstraps a sandbox. A proved no-resource result becomes a
  tombstone before cleanup finishes. An ambiguous result stays pending.
- Only a source-certified no-resource refusal permits another create or
  snapshot attempt. The existing lifecycle retry sets its time. Unknown
  outcomes never repeat a mutation.
- Main's archived-workspace restore window applies to either provider.
  E2B keeps Stop, Restore, and expiry deletion. Only Boat gets a vendor
  disk restart during that window.
- Main's shared software-image cache stays account-scoped. Without a
  matching ready image, the first build keeps the existing full install
  from its own provider base. E2B never starts from a Boat cache entry.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The operator section shows the weights and the account of each org, and
the create screen shows the account choice to operators.

- [x] Add the Providers tab to the operator mockups: the slider between
      `boat` and `e2b`, and the number of orgs on each account.
- [x] Add the account of each org to `OperatorOrgsScreen` and
      `OperatorOrgScreen` in `docs/mockups/src/screens/`.
- [x] Add the account choice to `CreateOrgScreen`, and to each other screen
      that creates an org, in a state that only an operator sees: "By
      weights", `boat`, and `e2b`.
- [x] Run `npm run mockups:check`. Smoke-test the changed pages with
      `npm run mockups:serve`.
- [x] Update the design and the TODOs of this plan for each problem that the
      mockups show.

Evidence: `.context/e2b-backup-provider/milestone-1-report.md` and `m1/`.

## Milestone 2: Documentation and protocol

Depends on: 1

The protocol docs, the architecture docs, and the deployment guide state
the second provider, the weights, and the operator's choice.

- [x] Update "The provider" in `docs/protocol/workspaces-and-sandboxes.md`:
      two providers, one account for each org for its whole life, the
      weights of new orgs, the operator's choice, one machine size, and the
      account IDs on operator screens (decision 221 A).
- [x] Update `docs/protocol/orgs-and-members.md`: the account choice that
      only operators see when they create an org.
- [x] Update `docs/protocol/org-image.md`: the org image of the account of
      each org, and its builds and refreshes there.
- [x] Update `docs/protocol/workspace-life.md`: the day-14 restart applies
      only to Boat.
- [x] Update `docs/protocol/isolation.md`: the E2B key, the E2B project, the
      fixed routes and reply budgets of each provider, private traffic, and
      the stored traffic token.
- [x] Update `docs/protocol/terminal-previews-and-desktop.md`: the port
      credential of each provider, in place of Boat's port cookie.
- [x] Update `docs/protocol/operator-section.md`: the Providers tab, the
      account of each org, and the weights as a third setting, beside the
      codes and the pause of decision 160. This changes the rule of
      decision 143 that the section changes no other setting.
- [x] Update "Computer tools" in `docs/protocol/agent-tools.md`: agents on
      E2B have no computer tools for now (decision 216 A).
- [x] Give the rule on Boat in `AGENTS.md`, which `CLAUDE.md` links to, the
      exception for operator screens of decision 221 A.
- [x] Update the architecture docs: components, data and trust, and flows.
- [x] Update `docs/deployment.md`: the E2B account in
      `SANDBOX_PROVIDER_ACCOUNTS`, the three requests to E2B support, E2B
      Pro before a real org, and E2B's written consent.
- [x] External docs: read `src/marketing/privacy.ts` and
      `src/marketing/terms.ts` in full, and give the facts of a second
      provider: the account, the country of E2B, its region, and the
      transfer safeguards. Delegate this TODO to the
      `external docs implementor`.
- [x] Check each relative link of each changed Markdown file.

Evidence: `.context/e2b-backup-provider/milestone-2-internal-report.md`
and `milestone-2-external-report.md`.

## Milestone 3: The account of each org

Depends on: 2

Each org has one provider account, and new orgs get it from the weights or
from the operator's choice. Boat stays the only configured account, so the
behaviour stays the same.

- [x] Add the shared account lookup and JSON-secret reader. Preserve the
      pinned `boat` account and safe recovery of malformed configuration.
      Its four account tests pass.
- [x] Add a D1 migration with the account of each org, `boat` for each
      existing org, and the weights setting. Read the `databases` skill
      first.
- [x] Set the account of a new org once, when the org is created, before
      Create org starts its first build in `worker/app-api/feature-org.ts`:
      the operator's choice from an operator, otherwise a draw from the
      weights.
- [x] Move each consumer of the default account under "Replaced ways" to the
      account of the org. Keep the default only for older saved state.
- [x] Make the Cron repair and the push refresh use the record of each
      org's account.
- [x] Run the day-14 restart only for accounts of the kind `boat`.
- [x] Test the draw, the operator's choice, an ignored choice from a person
      who is not an operator, the account of each create, build, and
      refresh, the repair, and the restart rule.
- [x] Update the provider accounts page and the lifecycle README.

Evidence: `.context/e2b-backup-provider/milestone-3-report.md`.

## Milestone 4: E2B client for lifecycle and snapshots

Depends on: 2 and the shared account lookup of 3. Final integration and
combined checks also depend on the rest of 3.

An E2B client implements the lifecycle and snapshot methods of
`SandboxProvider`. No org uses it yet.

The account lookup is complete. The adapter can now run beside the
remaining org routing work. The agents own different files and share one
test lane.

- [x] Add the kind `e2b` and its account configuration. Handle each
      exhaustive switch over the kind.
- [x] Add `worker/sandbox/e2b/` with a fixed list of E2B control routes:
      create, read, delete, pause, resume, timeout, the list by metadata,
      and snapshot create, read, and delete. Use the shared bounded JSON
      reader and safe typed errors with no provider text.
- [x] Each create sets private traffic, a filesystem-only pause at its
      timeout, its template or snapshot, and metadata with its idempotency
      key. Recover an ambiguous create through the metadata list, and never
      send a second create.
- [x] Map the E2B states to `SandboxState`. Map `stop` to a filesystem-only
      pause, `resume` to a resume that boots from the disk, and
      `setAutoStop` to the timeout.
- [x] Map the app's snapshot names to E2B snapshot IDs, so that
      `getSnapshot` and `deleteSnapshot` find each snapshot.
- [x] Add the table of the traffic tokens, encrypted.
- [x] Add a fake E2B server to `worker/test-support/` and an E2B contract
      driver. Run the lifecycle, snapshot, and error contracts with it.
- [x] Add "The app's E2B account" to `worker/sandbox/README.md`.

Evidence: `.context/e2b-backup-provider/milestone-4-report.md`.

## Milestone 5: E2B client for commands, files, and ports

Depends on: 4

The E2B client implements the rest of `SandboxProvider`.

- [x] Add the fixed envd routes: process start, file read, file write, and
      file info, with the envd token from a read of the sandbox.
- [x] `runCommand` waits up to 600 seconds, as on Boat.
- [x] `startCommand` writes the output and the exit code of a detached
      command to files in a private folder. `getCommandStatus` reads them
      from the saved byte offsets, within the 18 MiB budget.
- [x] `readFile` keeps the 5 MiB limit and the size result. `writeFile`
      uses the envd upload.
- [x] Write the env file at each create and resume, with mode 600.
- [x] `privatePort` gives the E2B port origin and the traffic token as a
      header credential. `desktop` and `fork` give typed errors.
- [x] Support E2B's validated ingress identity in the shared preview
      relay. Preserve Boat's host checks. Strip provider headers before
      forwarding HTTP and WebSocket requests to the app.
- [x] Make E2B allocation cleanup recover only identity, without create,
      connect, or bootstrap. Handle proved absence and retry races.
- [x] Retry only certified no-resource create and snapshot refusals.
      Preserve ambiguous-operation protection. Test the actual lifecycle
      retry and cleanup callers.
- [x] Run the command, file, and port contracts with the E2B driver.

Evidence: `.context/e2b-backup-provider/milestone-5-report.md`.

## Milestone 6: E2B template and org image builds

Depends on: 2 and the agreed private-port interface for the template and
relay. Live-check code also needs the stable client interface of 4.
Real image builds and runtime checks depend on 5.

Org images build on E2B, and an E2B sandbox runs the workspace software.

The template, relay, and live-check code use agreed interfaces and can run
beside the client work. Real provider checks wait for the complete client.

- [x] Add the E2B template under `image/e2b/`: Ubuntu 24.04, the software
      of `BASE_IMAGE`, Docker, 4 vCPU, and 8 GiB, with no computer tools.
      Add a developer script that builds the template and prints its ID.
- [x] Add an E2B mode to the live check in `image/`, beside the Boat mode.
- [x] Use identity-only allocation recovery in the live-check cleanup
      journal. Preserve pending unknown operations and tombstone proved
      no-resource outcomes. Verify provisioned disk size from provider
      metadata and report filesystem capacity separately.
- [ ] In a live E2B sandbox, confirm that systemd starts the enabled
      services at boot, and that `/run` is not on the saved disk. Needs:
      an E2B key, and filesystem-only snapshots turned on by E2B support.
- [ ] Run builds on E2B through the E2B client: the first from the template,
      and a later one from the E2B org image. `install.sh` and the terminal
      install run unchanged. Save the output under
      `.context/e2b-backup-provider/`. Needs: an E2B key.
- [x] Update `image/README.md`.

Template and relay evidence:
`.context/e2b-backup-provider/milestone-6-template-report.md`.
Live-check code evidence: `.context/e2b-backup-provider/milestone-6-report.md`.
Real template builds and runtime checks remain unverified.

## Milestone 7: Weights and the operator's choice in the Worker

Depends on: 3 and the account configuration of 4.

The operator section can read and set the weights, and the create of an
org takes the operator's choice.

These routes use saved assignment data and configured account IDs. They
can run beside the command, file, and port client work of 5.

- [x] Add the operator routes of the weights, with the gate and the
      `operator_required` answer of the other operator routes. A weight can
      name only a configured account.
- [x] Record the operator and the time of each weight change.
- [x] Add the account of each org and the number of orgs on each account to
      the operator replies.
- [x] Give operators the list of configured accounts for the create screen.
      Take the account choice of Create org only from an operator.
- [x] Test the routes, the record of each change, and the account choice.
- [x] Update the operator README and the provider accounts page.

Evidence: `.context/e2b-backup-provider/milestone-7-report.md`.

## Milestone 8: Weights and the operator's choice in the app

Tags: ui

Depends on: 1, 7

The operator section and the create screen show what the mockups show.

- [x] Add the Providers tab with the slider and the counts.
- [x] Add the account of each org to the Orgs tab and the page of an org.
- [x] Add the account choice to each screen that creates an org, only for
      operators.
- [x] Test each state, also that a person who is not an operator sees no
      choice. Update the operator section README.

Evidence: `.context/e2b-backup-provider/milestone-8-report.md` and `m8/`.

## Milestone 9: Live check through the app

Depends on: 6, 8

The operator creates a workspace on each provider through the app.

- [ ] As an operator, create a test org on `e2b`. Create a workspace, run a
      chat turn, and open the terminal and a preview. Create a second test
      org on `boat`, and create a workspace there. Save the output under
      `.context/e2b-backup-provider/`. Needs: an E2B key, and
      filesystem-only snapshots turned on by E2B support.

## Milestone 10: Verification, commit, review, and pull request

Depends on: 1, 2, 3, 4, 5, 6, 7, 8, 9

The complete change passes the gate and the review.

- [x] Preserve latest main's gateway, runner-version, preview, file-mention,
      terminal, and model changes. Match a runner-version lookup with the
      saved provider account as well as the org and image name.
- [x] Run the targeted tests and the complete gate, `npm run check`.
- [x] Fix the confirmed command-completion race, use one provider header
      list in preview checks, and link current provider plan limits.
      Repeat the affected checks and the complete gate.
- [x] Integrate main's archive restore and shared software images. Keep
      E2B archive recovery read-only and skip its vendor disk restarts.
      Verify same-account software-image selection and template fallback.
- [x] Resolve the PR's newer-main conflict. Preserve repository-build
      notices and .context attachments, and keep new repository/build
      queries on the fixed org account. Run targeted checks and final CI.
- [x] Match main's file-write contract on E2B: create missing parents and
      replace the destination only after a complete validated upload.
      Preserve old bytes and clean the temporary file after failure.
- [x] Commit with Conventional Commits and push the branch.
- [x] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [x] Open the pull request. Its description gives the decisions and the
      design calls of this plan with their dates, a permalink to this plan,
      and the follow-up items that the change adds.

Evidence: `.context/e2b-backup-provider/complete-gate-1.log` and
`combined-smoke/result.json`. Real E2B checks above remain blocked.
Round 1 review and checks: `.context/reviews/calummoore/e2b-backup-sandbox-provider/`.
Combined integration gate: `.context/e2b-backup-provider/complete-gate-3.log`.
PR conflict integration: `.context/e2b-backup-provider/merge-8-backend-integration.md`
and `merge-8-file-write-integration.md`. Final CI remains in progress.

## Post-merge follow-up (non-blocking)

- [ ] Set the E2B account on the deployed Worker. Make the three requests to
      E2B support, and move the E2B project to Pro.
- [ ] Keep every real org off E2B until E2B's written consent arrives.
- [ ] On the deployed app, create a test org on `e2b` as an operator, and
      create a workspace there.
