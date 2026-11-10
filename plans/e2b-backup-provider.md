# E2B backup sandbox provider

Status: Active. On branch `calummoore/e2b-backup-sandbox-provider`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

Boat runs every sandbox and every org image of Conductive, in the app's own
Boat account (decisions 2 and 80). When Boat has an outage, refuses starts,
or ends the account, no user can create or resume a workspace. This change
adds E2B as a cold standby (decision 142). One operator request switches
new starts to E2B, and one request switches them back. Each workspace stays
on the provider of its first start. Each provider keeps its own copy of
each org image, and a switch builds the copies that the new provider lacks.

The change also moves the Desktop tab of both providers to a stream that
passes through the Worker (decision 143). The stream shows display `:0`,
where the agents' computer tools act. Boat's own desktop is a Moonlight
stream on a Boat host, and no sandbox port carries it. So a desktop service
in each org image streams `:0` through a private port. E2B workspaces get
the same computer tools as Boat workspaces. The change adds no automatic
failover, moves no existing workspace between providers, and adds no other
provider. The brainstorm notes, the sources, and the reports of the options
checks are in `.context/e2b-backup-provider/`.

Changed on 10 November 2026: the user chose decision 213 C of
`plans/sandbox-provider-groundwork.md` on 9 November 2026. It prepares for a
second provider with Boat as the only one, and it chooses the provider after
the launch. So it changed decision 142 B. Pull request #137 on main did the
shared work of Milestone 3, as the archived plan at commit `81a3ab93` says.
The Desktop tool is hidden for now, so decision 143 waits for its return.
Decisions 144 and 145 apply only to a cold standby. This plan waits for the
user's choice of when to add E2B, and in which role. The review of
10 November 2026 is in `.context/e2b-backup-provider/`.

Contract owners:

- [Workspaces and sandboxes](../docs/protocol/workspaces-and-sandboxes.md).
- [Access and security](../docs/protocol/access-and-security.md).
- [Operator actions](../docs/protocol/operator-actions.md).
- [Agent tools](../docs/protocol/agent-tools.md).
- The [architecture doc](../docs/architecture.md) and the
  [deployment inputs](../docs/deployment.md).
- The [sandbox provider README](../worker/sandbox/README.md) and the
  [sandbox software README](../image/README.md).
- The [desktop backend README](../worker/desktop/README.md) and the
  [Desktop tool README](../src/desktop/README.md).
- The [previews README](../worker/previews/README.md), the
  [terminal README](../worker/terminal/README.md), the
  [lifecycle README](../worker/lifecycle/README.md), and the
  [operator README](../worker/operator/README.md).

Replaced ways:

- The browser opens Boat's desktop URL, with its token in the fragment →
  the desktop stream of `:0` passes through the Worker (decision 143).
  Consumers:
  - `SandboxProvider.desktop` and `SandboxDesktop` in
    `worker/sandbox/provider.ts`, and the Boat `desktop` route and parser
    in `worker/sandbox/routes.ts` and `worker/sandbox/boat.ts`.
  - `worker/desktop/handler.ts`, its route in `worker/features/workspace.ts`,
    and the tests `worker/desktop/handler.test.ts` and
    `worker/features/tools-routes.test.ts`.
  - The desktop mapping of the tools adapter in `worker/previews/provider.ts`,
    and the desktop cases of `worker/previews/access.test.ts`,
    `worker/previews/org-suspension.test.ts`, and
    `worker/previews/test-support.ts`.
  - `src/shared/desktop.ts`, `src/desktop/desktopApi.ts`,
    `src/desktop/DesktopFrame.tsx`, `src/desktop/DesktopTool.tsx`, and
    `src/desktop/desktop.test.tsx`.
  - `src/shell/workspace/tools/ToolsWiring.test.tsx`,
    `src/test-support/fake-tool-routes.ts`,
    `src/test-support/fixtures/tools.ts`, and `src/terminal/dev/devServer.ts`.
  - The desktop stream origins of `CONDUCTIVE_FRAME_SOURCES`:
    `worker/configuration.ts`, `worker/env.ts`,
    `worker/security/desktop-assets.test.ts`, `desktop/scripts/build.ts`,
    `desktop/README.md`, `worker/README.md`, and "Frame sources" in
    `docs/deployment.md`.
  - The `desktop` action of the Boat key in `worker/sandbox/README.md`.
  - The exception of decision 117: "Desktop", "Orgs and workspaces", and
    "Content security policy" in `docs/protocol/access-and-security.md`,
    the suspension rules in `docs/protocol/operator-actions.md`, and the
    desktop lines of `worker/operator/README.md`.
  - "Terminal, previews, and desktop" in `docs/architecture.md`.
  - The follow-up item `plans/follow-ups/desktop-stream-after-access-loss.md`,
    which this change fixes with its option C.
  - Moved in Milestones 2, 9, and 10. Deleted in Milestone 11.
- One Boat client for every sandbox call → the client of the provider that
  each record stores with its sandbox or snapshot. Consumers: the callers of
  `sandboxProvider` and `orgSandboxProvider` in `worker/app-api/archive.ts`,
  `worker/workspace.ts`, `worker/files/boat.ts`, `worker/lifecycle/cleanup.ts`,
  `worker/lifecycle/image-builds.ts`,
  `worker/lifecycle/input-activity-update.ts`,
  `worker/lifecycle/start-allocation-cleanup.ts`,
  `worker/lifecycle/start-coordinator.ts`,
  `worker/lifecycle/workspace-actions.ts`,
  `worker/members/cleanup-provider.ts`, and `worker/previews/provider.ts`.
  Also the test support and tests in
  `worker/chat/integration/browser-runners.test-support.ts`,
  `worker/chat/integration/chat-create-journey.test.ts`,
  `worker/chat/integration/workspace-resume-response.test.ts`,
  `worker/lifecycle/workspace-runtime-test-worker.ts`, and
  `worker/operator/suspension-test-support.ts`. Moved and deleted in
  Milestone 3.
- Boat's `_port_auth` cookie in the proxies → the port credential that the
  client of the provider gives. Consumers: `PrivatePort` in
  `worker/sandbox/provider.ts` and `worker/sandbox/boat.ts`, the pass-through
  in `worker/previews/provider.ts`, `worker/previews/headers.ts`,
  `worker/previews/origins.ts`, `worker/previews/ports.ts`, and `portRequest`
  of the terminal handler in `worker/terminal/handler.ts`. Also the tests
  `worker/previews/headers.test.ts`, `worker/previews/transport.test.ts`,
  `worker/terminal/handler.test.ts`, and
  `worker/features/tools-routes.test.ts`. Moved and deleted in Milestone 3.

## Decisions

The user answered decisions 142 and 143 on 8 November 2026, in the
brainstorm of this branch. The options check of the same day added options
to both, and it raised decisions 144 and 145. The numbers continue from
`plans/boat-native-remote-workspaces.md`, whose last decision is 141.

### 142. One provider blocks all work when it fails

Asked again on 8 November 2026: the options check added E, F, and G, and
the recommendation changed from C to E.

- **Severity:** High. **Effort:** Large.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `worker/sandbox/`, `image/`, and "The provider" in
  `docs/protocol/workspaces-and-sandboxes.md`.
- **Background:** Every sandbox and every org image is in the app's one
  Boat account. The files of a workspace exist only on the disk of its
  sandbox, and the app keeps no copy of user code. So a sandbox cannot move
  to another provider. Each provider needs its own copy of each org image.
  E2B costs about $0.33 an hour at Boat's size, and Boat costs $0.036.
- **Problem:** No second provider exists. Some Boat details are also
  outside `SandboxProvider`. The image scripts read Boat's env file, and
  previews and the terminal send Boat's port cookie.
- **Impact if no action:** In a Boat outage, no user can create or resume a
  workspace, and no build runs. If Boat ends the account, the app stops
  until a new provider is built.
- **Root question:** How does Conductive keep its users working when Boat
  cannot run their cloud computers?
- **Options:**
  - **A.** Prepare the exit only. Make the image scripts and the start path
    provider-neutral. Add shared contract tests for `SandboxProvider`, and
    write the steps to add E2B. An outage still blocks every start.
    Effort: Medium.
  - **B.** Cold standby. Build the E2B client, and record the provider of
    each workspace and each org image. An operator switch sends new starts
    to E2B. The E2B images build only after the switch, so the first starts
    wait up to 60 minutes. Existing workspaces wait for Boat.
    Effort: Large.
  - **C.** Warm standby with failover. As B, and each build and refresh also
    makes an E2B copy of the org image. A new start that Boat refuses or
    fails moves to E2B by itself. Orgs that the operator pins to E2B run
    there every day, so the path stays proven. E2B Pro costs $150 a month,
    plus the running time. Effort: Large.
  - **D.** Portable workspaces. As C, and the runner also saves the work of
    each workspace to a hidden ref on GitHub. A workspace whose provider
    fails can then start again on the other provider. Agent sessions and
    ignored files do not move. A file that the user did not want to push,
    such as a secret, can reach GitHub. Effort: Large.
  - **E.** Added by the options check: warm standby without failover. As B,
    and each build and each daily refresh also make the E2B copy of the org
    image. A switch then starts no build, so the first starts do not wait.
    An install script that fails on E2B shows to the operator before an
    outage. Cost: one more E2B start for each build and each org each day.
    Effort: Large.
  - **F.** Added by the options check: cold standby with a daily check. As B,
    and a scheduled job starts one E2B sandbox from the template each day,
    runs the software step, starts the runner of a test workspace, and
    deletes the sandbox. It reports each failure to the operator. Cost: a
    few minutes of E2B time a day. The first starts after a switch still
    wait. Effort: Large.
  - **G.** Added by the options check: standby copies of stopped workspaces.
    As B, and after each stop a job copies the home folder of the workspace
    into a paused sandbox in the app's E2B account. A workspace whose
    provider fails then resumes on E2B as of its last stop, with its agent
    sessions and ignored files. Cost: an E2B start and a full copy at each
    stop. Work after the last stop stays behind. Effort: Large.
- **Left out:**
  - An even split of new workspaces across both providers. It is C with
    more pinned orgs, so it is a detail of C.
  - A second Boat organization or a higher Boat plan. Each raises the start
    limits, but neither helps in a Boat outage or when Boat ends the
    account.
  - Self-hosted E2B, or E2B in the app's own cloud. B gives the same cover
    at a lower price, with no servers to run.
  - A Rust gateway service on `futex-ai/sandbox`. It adds a deployed service
    and a network hop, and decision 61 keeps the backend on Cloudflare
    until the Rust move.
  - Daytona, Sprites on Fly.io, or Vercel Sandbox, because the task message
    names E2B.
- **Wider fix:** D. It is the only option that also covers the work of
  existing workspaces up to the failure. G covers existing workspaces only
  as of their last stop.
- **Previous examples:** Decision 2 chose Boat on 5 November 2026 and left
  E2B out for price. The architecture doc keeps `SandboxProvider` "so that
  a later change can add another provider". `futex-ai/sandbox` holds the
  Rust crates `sandbox-e2b` and `sandbox-boat`, from the archived "E2B
  Sandbox Interface Plan" workspaces of September 2026. Decision 43 option C
  proposed a GitHub backup branch, and the user chose the day-14 restart.
- **Related:** Decisions 144 and 145 apply only under B and F.
- **Recommendation:** E. The first recommendation was C, and the options
  check recommended F. E makes a switch work at once, shows a failing
  install script before an outage, and removes decisions 144 and 145. F is
  cheaper, but the first starts after a switch still wait. D best covers
  existing workspaces, but it can push unwanted files to GitHub.
- **Action:** ask the user, because options B to G change decision 2, which
  says that Boat runs every sandbox.
- **Chosen:** B, by the user on 8 November 2026. The agent recommended C.
  The options check added E, F, and G after this answer.
- **Changed:** by decision 213 C, chosen by the user on 9 November 2026:
  prepare for a second provider with Boat only, and choose the provider
  after the launch.

### 143. Browsers cannot open a private E2B desktop

Asked again on 8 November 2026: the options check changed the root
question, added C and D, and the recommendation changed from A to C.

- **Severity:** Medium. **Effort:** Large.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `SandboxProvider.desktop` in `worker/sandbox/provider.ts`,
  "Desktop" in `docs/protocol/access-and-security.md`, and "Computer tools"
  in `docs/protocol/agent-tools.md`.
- **Terms:**
  - **Preview domain:** `conductive.page`, the separate domain for port
    previews. Code on it never shares a site with the app.
  - **Computer tools:** the MCP server `computer` that the agents use for
    browser work. On Boat it is the Cua Driver, which acts on display `:0`.
- **Background:** The Desktop tab shows the live desktop of the sandbox,
  where the computer tools work. Today the Worker gets a short-lived Boat
  URL with its token in the fragment. The browser then plays the stream
  directly (decision 117). The terminal shows sandbox output in the app's
  own client, over a socket on the app hostname.
- **Problem:** A private E2B port answers only requests that have the
  traffic token header. A browser cannot add that header to a page or a
  socket. A public port breaks the rule that a private port never answers
  without its token.
- **Impact if no action:** The Desktop tab does not work for workspaces on
  E2B.
- **Root question:** How does a user watch the desktop where the agents'
  computer tools work, on either provider, under the 30-second rule?
- **Options:**
  - **A.** Show no desktop stream for E2B workspaces in the first version.
    The tab says that the desktop is not available for this workspace.
    Effort: Small.
  - **B.** Send the stream through the Worker, on its own hostname of the
    preview domain. Use the grants and cookies of port previews. The Worker
    adds the token. Effort: Large.
  - **C.** Added by the options check: a viewer in the app, as the terminal
    has. The Desktop tool shows the stream in the app's own VNC viewer,
    such as noVNC from npm. Its socket uses the app hostname, behind its
    gate. The Worker connects the socket to the private desktop port, with
    the port credential and the desktop password. It needs no preview
    hostname, launch page, grant, or credential cookie. Risk: the viewer
    reads bytes from untrusted sandbox code on the app origin, as xterm.js
    does for the terminal. It adds an npm dependency. Effort: Large.
  - **D.** Added by the options check: Boat's own stream through the Worker,
    for Boat workspaces. The Worker serves Boat's viewer on a preview
    hostname and keeps the token on the server. E2B workspaces use B or C.
    Risk: Boat does not document the token format as a contract, and a
    Worker cannot relay media that does not use a WebSocket.
    Effort: Large.
- **Left out:** A public desktop port, because a private port must never
  answer without its token. Screenshots in place of a stream, because the
  protocol asks for a live desktop.
- **Wider fix:** C. Like B, it gives every provider one desktop path through
  the Worker, and it uses the socket path that the terminal already has.
- **Previous examples:** Decision 117 accepted that an open Boat desktop
  stream continues after the user loses access. Its follow-up item
  `plans/follow-ups/desktop-stream-after-access-loss.md` asks for option C
  of that item: the stream through the Worker.
- **Related:** Decision 142. This item applies only when decision 142 is
  not A.
- **Recommendation:** C. The first recommendation was A. C keeps the user's
  choice of one stream through the Worker for both providers, and it
  reuses the terminal's socket path and access check, with no new hostname
  or cookie. B keeps one advantage: a bug in the viewer stays on the
  preview domain.
- **Action:** ask the user, because B, C, and D change the desktop rules of
  decision 117, and B and C have real trade-offs.
- **Chosen:** B, by the user on 8 November 2026, "for both providers". The
  agent recommended A. The options check added C and D after this answer.

### 144. A queued first start has no time limit

Changed on 8 November 2026 by the second options check: a new root
question, option D, and the recommendation changed from B to D.

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** "Time limits of builds and starts" in
  `docs/protocol/workspaces-and-sandboxes.md`, `insertBuild` and
  `readCreationImage` in `worker/lifecycle/`, and Milestone 7.
- **Background:** Under decision 142 B or F, the copies of the org images on
  E2B build only after a switch. A create in an org with no copy on E2B
  must wait for that build. Decision 128 gives a whole build 60 minutes and
  a whole start 20 minutes, each from the moment that it began. The code
  counts a build from its request.
- **Problem:** A build can wait in a queue for a free sandbox, so the
  60-minute limit does not bound the wait of a create. A start limit that
  begins only when the image is ready does not cover the whole start, as
  decision 128 requires.
- **Impact if no action:** A create can wait with no limit, or the plan
  changes decision 128 without a user decision.
- **Root question:** What does a create do while its org has no ready copy
  of the org image on the active provider, what limits the whole wait, and
  what does the user see?
- **Options:**
  - **A.** Keep decision 128. The wait counts in the 20-minute start limit.
    When the image is not ready in time, the create fails with the
    time-limit message, and the build goes on. A retry after the build
    starts at once. A needs the same waiting phase as B, because the create
    code refuses a create with no image. Effort: Medium.
  - **B.** Give the wait its own limit of 80 minutes from the create, for a
    queue and a 60-minute build. The 20-minute start limit begins when the
    image is ready. This changes decision 128. Effort: Medium.
  - **C.** Refuse a create while the org image builds on the new provider.
    The composer keeps the message, and a notice says that the cloud
    computer is being prepared. Effort: Medium.
  - **D.** Added by the second options check: the create follows the
    deadline of its build. A switch build counts its 60 minutes from its
    request, with its time in the queue. A waiting create gets one deadline
    at the create: the deadline of its build plus 20 minutes. A failed or
    late build fails each waiting create at once. The start steps show that
    one deadline, and a create waits at most 80 minutes. Cost: time in the
    queue uses part of the 60 minutes of a build. D changes the text of
    decision 128, but it keeps one limit for each whole job from its start.
    Effort: Medium.
- **Left out:**
  - A create from the bare E2B template, because a new workspace must start
    from the newest good org image.
  - A create on the old provider, because the old provider cannot start
    sandboxes in an outage.
  - A copy with only the repository of the create, because decision 13
    gives each org one image with every chosen repository.
- **Wider fix:** D. The create takes its deadline from its build, so every
  create stays limited whatever the queue does.
- **Previous examples:** Decision 128 set the time limits of builds and
  starts.
- **Related:** Decision 142: this item applies only when decision 142 is B
  or F. Decision 145 sets how often the wait happens.
- **Recommendation:** D. The first recommendation was B. D limits the queued
  build and the create with the build's own 60-minute limit, and no create
  fails while its build still runs. C is the cheaper choice when a user can
  send each first message after a switch again.
- **Action:** ask the user, because B and D change decision 128, and no
  recorded user decision covers that change.

### 145. Switch builds can cost more than they save

Changed on 8 November 2026 by the second options check: a new root
question, options D, E, and F, and the recommendation changed from C to E.

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** Milestone 7, and "The org image" in
  `docs/protocol/workspaces-and-sandboxes.md`.
- **Background:** Under decision 142 B or F, the copies on E2B build only
  after a switch. One E2B build costs at most about $0.33. The larger costs
  are the sandbox slots that new workspaces need, and the daily refresh of
  each new copy. E2B Pro runs 100 sandboxes at once, and Hobby runs 20.
- **Problem:** Builds for every org at the switch fill the sandbox slots
  with orgs that start no workspace. Builds at the first create of each org
  make each first start wait for a whole build. At a switch back, the
  copies on Boat can be out of date.
- **Impact if no action:** Milestone 7 cannot choose which copies build,
  when, and in which order.
- **Root question:** After a switch, which copies on the new provider are
  missing or out of date, and in which order and on which trigger do they
  build?
- **Options:**
  - **A.** At the switch, build the image of every org that has a good
    image on the old provider. Effort: Small.
  - **B.** Build the image of an org at its first create after the switch.
    Effort: Small.
  - **C.** At the switch, build the images of the orgs with a workspace
    start in the last 14 days. Build each other org at its first create.
    Effort: Small.
  - **D.** Added by the second options check: C in order of use. At the
    switch, queue the builds of the active orgs by their last workspace
    start, newest first. A create moves the build of its org to the front.
    Other orgs build at their first create. Effort: Small.
  - **E.** Added by the second options check: D with current copies. Each
    switch, in both directions, also builds each org whose copy on the new
    provider is out of date. A copy is out of date when its settings
    revision, its repository list, or its runner protocol version differs
    from the newest good image. Effort: Medium.
  - **F.** Added by the second options check: prepare, then switch. An
    operator request builds the copies of D on the standby provider and
    moves no create. The switch then builds only the copies that are still
    missing. It does not help in a sudden outage. Effort: Medium.
- **Left out:** Builds at each build and each refresh, because that is
  decision 142 E.
- **Wider fix:** E. One rule covers a missing copy, an out-of-date copy,
  and an old runner, at each switch in both directions.
- **Previous examples:** None found.
- **Related:** Decisions 142 and 144.
- **Recommendation:** E. The first recommendation was C. E keeps the cost
  limit of C, gives a waiting create the next free build slot, and builds
  the out-of-date copies at a switch back.
- **Action:** ask the user, because the options trade E2B cost against the
  wait of first starts, and no option is clearly best.

## Design

These are agent calls of 8 November 2026. The user can change each one.

### Providers and records

- E2B is the backup, because the task message names it.
- The E2B client is TypeScript in the Worker, behind `SandboxProvider`, with
  a fixed route list, as the Boat client has. It uses no E2B SDK. Reason:
  the review focus allows only a fixed list of provider routes, and the
  response budgets of decision 84 need control of each reply. The crate
  `sandbox-e2b` in `futex-ai/sandbox` is the reference for the create
  recovery, the snapshot recovery, and the port token.
- Each record that holds a sandbox ID or a snapshot name also holds its
  provider. Existing rows get `boat`.
- Each org keeps one copy of its org image for each provider, and each
  provider can run one build of an org at a time. Reason: `settings` holds
  one image name for each org today, and one running build for each org
  lets a retrying Boat build block an E2B build.
- A copy whose runner protocol version differs from the Worker's counts as
  out of date. Reason: the Worker accepts only the current version in the
  runner's first message.
- A workspace stays on the provider of its first start. Its resumes, stops,
  archive, cleanup, terminal, previews, and desktop use that provider.
  Reason: the app keeps no copy of user code, so the files cannot move.
- The active provider is an app setting in D1, and only the operator
  changes it. Reason: in an outage, a request works at once, and a deploy
  is slower. The suspension route already gives the gate and the operator
  check.
- E2B runs in its EU cluster, near the workspace objects in Western Europe.
- The E2B project holds only the app's sandboxes and snapshots, as the Boat
  organization does. Every E2B sandbox has private traffic.
- The Worker keeps the traffic token of each E2B sandbox encrypted in D1.
  Reason: E2B gives it at create and resume, and a connect that reads it
  resumes a paused sandbox. A read of the sandbox gives the envd token
  without a resume, so the Worker does not store that token.
- User-facing text names neither provider (decision 80). The privacy page
  and the terms say "cloud computer providers".

### E2B sandboxes

- The E2B template has Boat's machine size, 4 vCPU and 8 GiB, and the
  software of `BASE_IMAGE` in `src/shared/base-image.ts`. Reason: the
  protocol gives one machine size, and the Cloud computer tab lists one
  base image.
- The deployment guide asks E2B support for three things: the EU cluster,
  filesystem-only pauses and snapshots, and a disk of 51 GB, as Boat's
  default size has. Reason: E2B refuses filesystem-only snapshots until
  support turns them on, and its Pro disk is 20 GiB.
- E2B workspaces get the same computer tools as Boat workspaces. The
  template installs the open-source Cua Driver, under the MIT license, with
  Xorg on display `:0` at 1920 by 1080 and Chrome. It registers the driver
  as the MCP server `computer` for Claude and Codex, as Boat does. Reason:
  the protocol gives every sandbox these tools.
- An E2B stop is a pause in the filesystem-only mode. So a stop ends every
  process, as the protocol says. A resume boots from the disk, and the
  startup script runs, as on Boat.
- Each E2B snapshot of an org image is filesystem-only too. Reason: a
  memory snapshot can keep a clone token or another secret of the build,
  and no saved snapshot may hold a secret.
- E2B workspaces get no day-14 restart, because E2B keeps a paused sandbox
  with no time limit.
- The E2B client writes the env vars to the file where Boat puts them,
  `/run/ascii-secrets/env.sh`, at each create and resume. Reason: the
  image scripts and services then stay the same for both providers.
- A detached E2B command writes its output to files in the sandbox, and the
  client reads those files from the saved byte offsets. Reason: the app
  stores byte offsets, and the client must give the same reads as Boat.
- The file read limit stays 5 MiB on both providers.
- The deployment guide asks for E2B Pro before a real switch. Reason: Hobby
  limits a sandbox to 1 hour of running without a pause, and to 20 at once.

### The switch

- A switch sets the active provider for new creates, builds, and refreshes.
  The copies on the other provider stay.
- A switch build follows the rules of an automatic refresh: it needs an
  admin who is not suspended. It shows in the build list as any build does.
- A switch to E2B needs the E2B settings. Without them, the route answers
  with an error and changes nothing.

These calls hold only under decision 142 B or F. Decisions 144 and 145
settle the rest.

- A waiting create keeps the provider of its create, also after a switch
  back.
- When the build of a waiting create fails, the create fails as a failed
  start, with a message that says that the cloud computer of the org could
  not be prepared.
- An org with no admin who is not suspended gets no switch build. Its
  waiting create fails at once, with the same message.
- After a failed switch build, a create in that org starts no new build for
  30 minutes, the limit of a refresh. Such a create fails at once, with the
  same message.
- Switch builds take at most half of the provider's sandbox limit, so new
  workspaces keep the other half.

### The desktop

- The desktop stream shows display `:0`, where the computer tools act.
  Reason: the protocol says that the Desktop tab shows the desktop of the
  computer tools.
- A desktop service in each org image streams `:0` through a VNC server and
  websockify on a private port. On Boat, the VNC server attaches to Boat's
  own Xorg `:0`. On E2B, the template gives `:0`. Reason: Boat's desktop is
  a Moonlight stream on a Boat host, with no port that the Worker can
  reach, as
  [Boat's desktop guide](https://docs.boat.dev/desktop-streaming/urls-and-security)
  shows.
- Each build installs the desktop service after `install.sh`, as it
  installs the terminal.
- A password for each workspace guards the desktop port, as a password
  guards the terminal. Reason: sandbox code can make a port public.
- The desktop stream follows the 30-second access rule of decision 70. The
  exception of decision 117 ends.
- Key input and clicks in the desktop count as activity, as the protocol
  defines activity. The stream alone is not activity.
- The desktop keeps mouse and keyboard input, as Boat's viewer has.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The start of a new workspace can wait for the org image on the new
provider, and a failed wait needs its message. The Desktop tool keeps its
look and its states.

- [ ] Add to `docs/mockups/src/fixtures/starting.ts` a create log that first
      waits for the cloud computer of the org, with the time of the wait.
      Add its limit text, as decision 144 says. Skip this TODO when
      decision 142 is E.
- [ ] Add the message of a create that fails because the build of the org's
      cloud computer failed. Show it where the mockups show the other failed
      creates.
- [ ] Check `docs/mockups/src/components/tools/DesktopView.tsx` against the
      answer to decision 143. Keep its look when its states stay
      Connecting, Live, and an error with Try again.
- [ ] Run `npm run mockups:check`. Smoke-test the changed pages with
      `npm run mockups:serve`.
- [ ] Update the design and the TODOs of this plan for each problem that the
      mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

The protocol docs, the architecture doc, and the deployment guide state the
backup provider, the switch, the computer tools, and the desktop stream
through the Worker.

- [ ] Update `docs/protocol/workspaces-and-sandboxes.md`:
  - [ ] "The provider": Boat runs new sandboxes by default, and E2B is the
        backup. Add the operator switch, the stay of each workspace on its
        provider, and the copy of each org image for each provider.
  - [ ] "The org image": the builds of each provider, as decision 142 says.
  - [ ] "Create a workspace", "Start steps", and "Time limits of builds and
        starts": the wait for the org image, as decision 144 says.
  - [ ] "Stop and resume": the day-14 restart applies only to a provider
        that deletes the disk of a long stop.
  - [ ] "Files and changes": the reason of the 5 MiB limit covers both
        providers.
  - [ ] "Desktop": the stream of `:0` passes through the app
        (decision 143).
- [ ] Update `docs/protocol/access-and-security.md`:
  - [ ] "Orgs and workspaces" and "What a sandbox holds": the fixed routes
        and the reply budgets of each provider, and the end of the decision
        117 exception.
  - [ ] "The app's Boat key": the rules of each provider key, the E2B
        project, private traffic, and the stored traffic tokens.
  - [ ] "Terminal", "Port previews", and "Proxies and ports": the port
        credential of the provider, in place of Boat's port cookie.
  - [ ] "Desktop": the path that decision 143 chooses, the password, and the
        30-second rule. "Content security policy": no desktop stream
        origins.
- [ ] Update `docs/protocol/operator-actions.md`: add "Choose the sandbox
      provider", with the route, the gate, and the reply. Remove the
      desktop exception from the suspension rules.
- [ ] Update "Computer tools" in `docs/protocol/agent-tools.md`: the Cua
      Driver tools on every sandbox, on display `:0`.
- [ ] Update `docs/architecture.md`: the terms, the Worker and Boat
      components, the create and desktop flows, the data table, and the
      trust boundaries.
- [ ] Update `docs/deployment.md`: the E2B secret and variables, the E2B
      project, the three requests to E2B support, private traffic, and Pro
      before a real switch.
- [ ] External docs: `src/marketing/privacy.ts` and `src/marketing/terms.ts`
      say "cloud computer providers". Delegate this TODO to the
      `external docs implementor`.
- [ ] Check each relative link of each changed Markdown file.

## Milestone 3: Provider of each sandbox and snapshot

Depends on: 2

Replaced on 10 November 2026: pull request #137 on main did this work under
decision 213 C. A rewrite of this plan removes this milestone.

Each record stores the provider of its sandbox or snapshot, and the Worker
picks the client by that provider. Boat stays the only client, and the
behaviour stays the same.

- [ ] Add a D1 migration with a `provider` column, default `boat`, on each
      table that holds a sandbox ID or a snapshot name. Search `migrations/`
      for every such column. Read the `databases` skill first.
- [ ] Move the org image name from `settings` to a record for each org and
      provider. Allow one running build for each org and provider.
- [ ] Add the provider type to `worker/sandbox/provider.ts`. Replace
      `sandboxProvider` and `orgSandboxProvider` with functions that take
      the provider. Move each consumer under "Replaced ways", then delete
      the old functions.
- [ ] Give `PrivatePort` a provider credential: a cookie or a header. Move
      the preview proxy and the terminal to it, and keep the drop of a
      browser copy. Delete the Boat cookie code of the proxies.
- [ ] Keep every existing test green. Add the test that a stored provider
      reaches its client.
- [ ] Update the sandbox, lifecycle, previews, and terminal READMEs.

## Milestone 4: E2B client for lifecycle and snapshots

Depends on: 3

An E2B client implements the lifecycle and snapshot methods of
`SandboxProvider`. No production path uses it yet.

- [ ] Add `worker/sandbox/e2b/` with a fixed list of E2B control routes:
      create, read, delete, pause, resume, timeout, the list by metadata,
      and snapshot create, read, and delete. Use the shared bounded JSON
      reader and safe typed errors with no provider text.
- [ ] Each create sets private traffic, a filesystem-only pause at its
      timeout, its template or snapshot, and metadata with its idempotency
      key.
- [ ] Recover an ambiguous create through the metadata list. Never send a
      second create.
- [ ] Map the E2B states to `SandboxState`. Map `stop` to a filesystem-only
      pause, and `resume` to a resume that boots from the disk.
- [ ] Store the traffic token of each E2B sandbox encrypted in D1.
- [ ] Read `E2B_API_KEY`, the E2B domain of the EU cluster, and the template
      ID. Without them, the Worker gives no E2B client.
- [ ] Add a fake E2B server to `worker/test-support/`. Test each route, each
      budget, the recovery, and the errors.
- [ ] Add "The app's E2B project" to `worker/sandbox/README.md`.

## Milestone 5: E2B client for commands, files, and ports

Depends on: 4

The E2B client implements the rest of `SandboxProvider`, except the
desktop.

- [ ] Add the fixed envd routes: process start, file read, file write, and
      file info, with the envd token from a read of the sandbox.
- [ ] `runCommand` waits up to 600 seconds, as on Boat.
- [ ] `startCommand` writes the output and the exit code of a detached
      command to files in a private folder. `getCommandStatus` reads them
      from the saved byte offsets, within the 18 MiB budget.
- [ ] `readFile` keeps the 5 MiB limit and the size result.
- [ ] Write the env file at each create and resume, with mode 600, where
      Boat puts it.
- [ ] `privatePort` gives the E2B port origin and the traffic token as a
      header credential.
- [ ] Test each method against the fake E2B server.

## Milestone 6: E2B template and org image builds

Depends on: 5

Org images build on E2B, and an E2B sandbox runs the workspace software and
the computer tools.

- [ ] Add the E2B template under `image/e2b/`: Ubuntu 24.04, the software
      of `BASE_IMAGE`, Docker, Xorg on `:0`, Chrome, the Cua Driver
      registered as `computer` for Claude and Codex, 4 vCPU, and 8 GiB. Add
      a developer script that builds the template and prints its ID.
- [ ] Add an E2B mode to the live check in `image/`, beside `LiveBoat`.
- [ ] In a live E2B sandbox, confirm that systemd starts the enabled
      services at boot, and that the computer tools take a screenshot of
      `:0`. Needs: an E2B key from the user.
- [ ] Run builds on E2B through the E2B client: the first starts from the
      template, a later one from the E2B org image. `install.sh` and the
      terminal install run unchanged. Each build saves a filesystem-only
      snapshot. Save the output under `.context/e2b-backup-provider/`.
      Needs: an E2B key.
- [ ] Update `image/README.md`.

## Milestone 7: Operator switch

Depends on: 6

The operator switches new starts between Boat and E2B. This milestone waits
for decision 142, and under B or F also for decisions 144 and 145.

- [ ] Add the active provider to D1, with `boat` as the default.
- [ ] Add the operator route of the switch, with the gate and the
      `operator_required` answer of the suspension route. A repeat changes
      nothing.
- [ ] Make the org images on the new provider as decisions 142 and 145
      say. Keep the builds within the provider's limit of sandboxes at
      once.
- [ ] New creates, builds, and refreshes use the active provider. Every
      other call uses the stored provider. Only Boat workspaces get the
      day-14 restart.
- [ ] A create in an org with no ready image on the active provider follows
      decision 144. A failed build fails the create with its message.
- [ ] Test the route, the builds, the waits, and the provider of each call.
- [ ] Run the live check through the app: switch to E2B, create a
      workspace, run a chat turn, and open the terminal and a preview. Then
      switch back. Save the output under `.context/e2b-backup-provider/`.
      Needs: an E2B key.
- [ ] Update the operator and lifecycle READMEs.

## Milestone 8: Desktop service in the org image

Depends on: 2

Each org image gets a desktop service that streams `:0` on a private port,
on both providers.

- [ ] Add the desktop installer and its systemd service: a VNC server on
      `:0` and websockify on a private port, with a password for each
      workspace.
- [ ] Each build runs the installer after `install.sh`, as it runs the
      terminal installer.
- [ ] Give each workspace its desktop password at each start, as it gets
      its terminal password.
- [ ] Test the installer and the service text, as the terminal tests do.
- [ ] In a live Boat sandbox, check that the service streams the desktop
      where the computer tools act. Save the output under
      `.context/e2b-backup-provider/`.

## Milestone 9: Desktop stream through the Worker

Depends on: 3, 6, 8

The Worker serves the desktop stream on the path that decision 143
chooses, beside the old Boat URL route. This milestone waits for decision
143.

- [ ] Add the desktop socket and its route, as decision 143 says: a
      preview-domain hostname with a grant and a credential cookie for B,
      or a socket on the app hostname for C.
- [ ] Connect the stream to the desktop port, with the port credential and
      the desktop password. Forward only the allowed headers.
- [ ] Check the viewer's access before each request, and every 15 seconds
      on an open socket. Close the socket within 30 seconds after the
      viewer loses access.
- [ ] Count key input and clicks as activity. Do not count the stream.
- [ ] Keep the Boat URL route until Milestone 11.
- [ ] Test each rule. Update the desktop and previews READMEs.
- [ ] Check the stream live on Boat and on E2B. Save the output under
      `.context/e2b-backup-provider/`. Needs: an E2B key.

## Milestone 10: Desktop tool on the new stream

Tags: ui

Depends on: 1, 9

The Desktop tool shows the stream through the Worker. This milestone waits
for decision 143.

- [ ] Show the stream in the Desktop tool, as decision 143 says: a frame of
      the launch address for B, or the app's VNC viewer for C. It shows
      Connecting, Live, and the error with Try again, as the mockup shows.
- [ ] Move the desktop tests and the fake tool routes to the new stream,
      with every assertion that still applies.
- [ ] Delete the UI code of the Boat desktop URL.
- [ ] Update `src/desktop/README.md`.

## Milestone 11: Remove the Boat desktop URL

Depends on: 10

No code uses the Boat desktop URL.

- [ ] Delete the remaining Worker consumers of the old desktop way under
      "Replaced ways".
- [ ] Remove the desktop stream origins from the frame sources of the Worker
      and the Mac build. Both keep the preview domain.
- [ ] Remove the `desktop` action from the Boat key setup.
- [ ] Delete `plans/follow-ups/desktop-stream-after-access-loss.md`, which
      this change fixes.
- [ ] Search `docs/`, `plans/`, and every `README.md` for the removed names.
      Update each live reference.

## Milestone 12: Verification, commit, review, and pull request

Depends on: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11

The complete change passes the gate and the review.

- [ ] Run the targeted tests and the complete gate, `npm run check`.
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

- [ ] Set the E2B secret and variables on the deployed Worker. Make the
      three requests to E2B support.
- [ ] Run a switch drill on the deployed app: switch to E2B, create a
      workspace, chat, and open the terminal, a preview, and the desktop.
      Then switch back to Boat.
