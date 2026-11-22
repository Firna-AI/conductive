# Own computers and one host connection

Status: Active. On branch `calummoore/external-mac-linux-server-cloud-j9ih`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

Today each workspace runs on a cloud computer in a provider account of the
app, on Boat or E2B. The Worker reaches each cloud computer in two ways. The
agent runner opens one outbound WebSocket to the workspace Durable Object.
The Worker calls the provider's API for everything else: start, stop,
snapshots, commands, file reads, the terminal, and port previews. A user's
own server has no provider API, so the app cannot run a workspace there.

This change adds own computers: Linux servers that an org admin adds to the
app. Each workspace on an own computer runs in its own container there.
The change also moves every computer, cloud and own, onto one host
connection. A new host mode of the program `conductive` opens it from each
computer. Commands, file reads, the terminal, and previews then go over it.
The provider's API keeps only the life of the machine: create, get, stop,
resume, delete, auto-stop, and snapshots. The change does not cover native
workspaces on a Mac. That later change is the follow-up item
`plans/follow-ups/own-computers-native-mac.md`. The brainstorm notes are in
`.context/external-server/`.

A decision of this change carries the short name "own computer decision",
such as own computer decision 1.

Contract owners:

- `docs/protocol/own-computers.md`, a new protocol doc.
- `docs/protocol/host-connection.md`, a new protocol doc.
- [Workspaces and sandboxes](../docs/protocol/workspaces-and-sandboxes.md).
- [Provider accounts](../docs/protocol/provider-accounts.md).
- [Isolation](../docs/protocol/isolation.md) and
  [Access and security](../docs/protocol/access-and-security.md).
- [Sandbox software](../docs/protocol/sandbox-software.md).
- [Terminal](../docs/protocol/terminal.md),
  [Port previews](../docs/protocol/port-previews.md), and
  [Terminal, previews, and desktop](../docs/protocol/terminal-previews-and-desktop.md).
- The [architecture doc](../docs/architecture.md) and its pages under
  `docs/architecture/`.
- The [sandbox README](../worker/sandbox/README.md), the
  [lifecycle README](../worker/lifecycle/README.md), and the
  [previews README](../worker/previews/README.md).

Replaced ways:

- One `SandboxProvider` interface for the machine and for the work on it →
  a `MachineProvider` for the life of the machine, and a `MachineChannel`
  over the host connection for the work on it. Consumers:
  `worker/lifecycle/timed-provider.ts`, the provider fakes and contract
  fixtures in `worker/sandbox/*.test-support.ts`, and each consumer below.
  Moved in Milestones 6 to 8. Deleted in Milestone 9.
- Provider commands (`runCommand`, `startCommand`, `getCommandStatus`) →
  commands over the host connection. Consumers:
  `worker/lifecycle/start-command-execution.ts`,
  `worker/lifecycle/command-intents.ts`,
  `worker/lifecycle/build-execution.ts`,
  `worker/software-image/steps.ts`,
  `worker/lifecycle/image-sources/source-commands.ts`,
  `worker/lifecycle/continue.ts`, `continue-work.ts`,
  `continue-progress.ts`, `worker/lifecycle/repository-change.ts`,
  `repository-change-work.ts`, `repository-change-command.ts`,
  `repository-change-publication.ts`,
  `worker/lifecycle/retention-command.ts`,
  `worker/lifecycle/automatic-restart.ts`,
  `worker/lifecycle/software-restart.ts`,
  `worker/chat/attachment-download-process.ts`, and
  `worker/terminal/close.ts`, `service.ts`, `service-files.ts`,
  `support.ts`. Moved in Milestones 6 and 8. Deleted in Milestone 9, except
  the one bootstrap command that own computer decision 7 D keeps.
- Provider file reads (`fileInfo`, `readFile`) → file reads over the host
  connection. Consumers: `worker/files/boat.ts`, the fallback read of
  `worker/files/handlers.ts`. Moved in Milestone 7. Deleted in Milestone 9.
- Provider private ports (`privatePort`, `PortCredential`, the Boat port
  cookie, the E2B traffic token of a port) → streams over the host
  connection to a local port. Consumers: `worker/previews/ports.ts`,
  `worker/previews/provider.ts`, `worker/terminal/socket.ts`,
  `worker/sandbox/e2b/ports.ts`, the port routes in
  `worker/sandbox/routes.ts`, and the ingress identity check in
  `crates/cnd-relay/src/headers.rs`. Moved in Milestone 7. Deleted in
  Milestone 9.

## Decisions

Cal answered own computer decisions 1 to 7 on 22 November 2026, in the
brainstorm of this branch. Cal answered own computer decision 8 on the
same day, after the options check of decision 7 D.

### Own computer decision 1: Where the agents of an own computer run

- **Root question:** How can a workspace run its agents and tools on a Mac
  or Linux machine that the user provides, instead of on a cloud computer
  of the app?
- **Options:**
  - **A.** One whole Linux server for each workspace, from a pool of the
    org. Effort: Large.
  - **B.** One container for each workspace on a Linux server, reached over
    an outbound computer connection. Effort: Large.
  - **C.** Native workspaces on a Mac or Linux server, with a macOS version
    of the sandbox software. Effort: Large.
  - **D.** B or C for own computers, and every computer, cloud and own,
    uses one host connection for commands, files, the terminal, and
    previews. Effort: Large.
- **Left out:** Mac commands only, and commands from a cloud agent to a
  server: the work does not start on the server. A runner that a person
  starts by hand: agents and automations create workspaces when no person
  is there. A self-hosted E2B cluster: it breaks decision 80 and gives no
  Mac. Inbound SSH: it fails behind NAT, and the app holds a shell key.
  Tailscale or ngrok: a Cloudflare Tunnel is better on every point. The Mac
  app as the host: C is better on every point. Machines in the org's own
  cloud account: it breaks decision 80.
- **Choice:** D, on 22 November 2026. The first recommendation was B.
- **Reason:** One path for every computer. New features then need one
  version and one set of tests, and a new provider needs only to run a
  Linux machine.

### Own computer decision 2: Who may add an own computer

- **Root question:** Who can trust a server with the work of the whole org?
- **Options:** **A.** Only admins, and each computer serves the whole org.
  **B.** Any member, for that member's workspaces only. **C.** Any member,
  for the whole org.
- **Choice:** A, on 22 November 2026.
- **Reason:** Root on the computer can read the workspace tokens, the env
  vars, and during turns the GitHub tokens and the allowed secret values of
  other members. Only admins change other org-wide settings (decision 57).

### Own computer decision 3: How a workspace chooses its computer

- **Root question:** Which work goes to an own computer?
- **Options:** **A.** A choice in New workspace, with the cloud computer as
  the default. Sub-workspaces and workspaces from agent tools take the
  computer of the calling workspace. Each automation has its own choice.
  **B.** An org setting sends all new work to the own computer. **C.** A
  setting for each repository.
- **Choice:** A, on 22 November 2026.
- **Reason:** It gives the most control and keeps the cloud as the default.

### Own computer decision 4: Release signatures

- **Root question:** How does a computer know that a release came from the
  app?
- **Options:** **A.** Keep the current rule: no signature, and only the
  deploy token writes the bucket. **B.** Sign each release, and the program
  checks the signature before it installs. **Left out:** manual updates on
  each server, because the product needs automatic updates.
- **Choice:** B, on 22 November 2026. It changes the rule in force in
  [Releases](../docs/protocol/sandbox-software.md#releases).
- **Reason:** A leak of the deploy token must not reach customer servers.

### Own computer decision 5: The form of an own computer

- **Root question:** What do users need from their own computer: more power
  and private access, or Mac tools?
- **Options:** **A.** Linux containers only. **B.** Native workspaces only,
  on a Mac or Linux server. **C.** Linux containers first, and a native Mac
  version as a later change.
- **Choice:** C, on 22 November 2026.
- **Reason:** A container runs the same software as a cloud computer, so it
  fits own computer decision 1. The Mac version follows when users need
  Xcode.

### Own computer decision 6: The order of the switch-on

- **Root question:** How do we prove the host connection safely before real
  users depend on it?
- **Options:** **A.** Own computers first, then every cloud computer.
  **B.** The cloud computers of the app's own org first, behind a switch
  for each org, then own computers, then the other orgs step by step.
  **C.** Build all parts and switch them on together.
- **Choice:** C, on 22 November 2026. The recommendation was B.
- **Reason:** Cal chose one switch-on. So the merge of this change switches
  on the host connection for every computer and adds own computers. No
  switch for each org exists. Milestones 5 and 15 test the change on real
  computers before the merge.

### Own computer decision 7: Computers that do not have the host program

The options check of 22 November 2026 added option C and changed the
recommendation from B to C. Its report is in
`.context/own-computers/options-check-decision-7.md`. Cal then proposed a
migration of the computers of the transition, which became option D.

- **Severity:** High. **Likelihood:** Common. **Effort:** Large.
- **Source:** Design.
- **Category:** Product bug.
- **Location:** `worker/lifecycle/start-command-execution.ts:103`
- **Background:**
  - A stopped cloud computer can resume weeks later with its old sandbox
    software, as [Updates](../docs/protocol/sandbox-software.md#updates)
    says. E2B keeps a stopped disk with no limit.
  - A start applies a release that the computer downloaded before its stop,
    or during the start. The runner unit runs `conductive update apply`
    before it starts, and only when `/run/conductive/workspace-ready`
    exists (`image/release/conductive-runner.service:10`). The update check
    runs 30 seconds after boot (`image/conductive-update-check.timer:5`).
  - The E2B template has no program `conductive`
    (`image/e2b/Dockerfile:1-9`, `image/e2b/install-base.sh:1-36`). Each
    first build on `e2b` and each Boat software image build start from a
    base image without it, and install it through provider commands
    (`worker/lifecycle/software-bootstrap.ts:26-52`).
  - Each org image that was saved before the merge has no host program.
    Creates, builds, and refreshes start from those images.
  - The release installer starts no stopped service (`image/install.md:186-187`).
    So an idle install on a running computer opens no host connection
    until the next boot.
  - The version pin holds a runner protocol version
    (`docs/protocol/version-pins.md:49-51`). The host mode keeps the runner
    protocol, so the pin cannot find a computer without the host program.
- **Problem:** Own computer decision 1 moves all work on a computer onto the
  host connection. A computer without the host program, or with an older
  host protocol, cannot get that work. The `plans` skill makes a path that
  stays for deployed computers a decision for the user.
- **Impact if no action:** After the merge, these fail:
  - each resume of a stopped workspace, and each resume after Restore
  - each create from an org image that was saved before the merge
  - each build and refresh from such an image, and each first build on
    `e2b`
  - each Boat software image build, so each deploy run fails
  - the day-14 restart command (`worker/lifecycle/retention-command.ts:37-50`)
  - the terminal, previews, files, Continue, and Restart of each computer
    that runs at the deploy
- **Root question:** After the merge, how does each computer that cannot
  open the current host connection keep working? This covers a stopped
  computer, a computer that runs at the deploy, and a build computer.
- **Options:**
  - **A.** Keep the provider path for each computer that does not open the
    host connection. Two paths stay. They stay for good, because stopped
    E2B disks and builds from a base image never get the host program by
    themselves. Effort: Medium.
  - **B.** At each start, when the computer does not open the host
    connection in time, the Worker runs one fixed provider command. It
    installs the newest release and starts the host program. All other
    work then uses the host connection. Costs and risks:
    - The provider interface keeps that one command for good, because
      builds from a base image always need it.
    - The Worker checks the signature of the release before it gives its
      digest to the command, because an old program cannot check it.
    - The first start of each old computer takes longer. It fails when the
      release server does not answer.
    - It changes rules in force: a start then waits for a new release
      (`docs/protocol/sandbox-software.md:76-79`, `:122-125`, `:129-131`).
    - It must not let a runner below protocol 2 start again, as
      `docs/protocol/version-pins.md:28-35` says.
    - It misses computers that run at the deploy, and machines with an
      older host protocol after a later change.
    Effort: Medium.
  - **C.** B, made wider so that it covers every machine and every moment.
    - The Worker records the host protocol version of each org image,
      software image, and machine, as it records the runner protocol of
      each build (`worker/lifecycle/build-admission-data.ts:69-80`).
    - A start or a build from a source without the current version runs
      the bootstrap at once. The wait stays only as a fallback.
    - A machine that connects with an older host version gets the same
      bootstrap. So the Worker serves only the current host version.
    - A computer that runs at the deploy gets the bootstrap at its first
      operation that needs the host connection. The bootstrap installs the
      new release next to the running one and starts only the host
      program, so no turn stops.
    - The release installer starts the host service at each apply.
    - Boat and E2B keep the one provider command of B. Own computers run
      the same bootstrap as a fixed container operation.
    - The costs and risks of B apply, except the computers that B misses.
      It also adds a D1 column with a migration, one more container
      operation, and more tests. A running computer holds two releases
      until its next install.
    Effort: Large.
  - **D.** A migration job at the deploy, with the bootstrap of B as the
    safety net.
    - The job installs the host program on each running computer. Own
      computer decision 8 says how, because Restart ends each running turn
      (`docs/protocol/restart-the-software.md:26-29`).
    - It starts each stopped computer briefly, installs, and stops it
      again. The restart near day 14 is the model on Boat
      (`docs/protocol/stop-and-resume.md:103-111`). On E2B, the brief start
      is a new kind of start. The job does the same for each archived
      computer in its 14-day Restore window. That is new behaviour.
    - It runs no startup script and no agent, and the computer gets no
      secrets, as for the day-14 restart of an archived computer. It gets
      only a new machine token, so that the host program can connect.
    - It builds each org image once, so that new workspaces start with the
      host program.
    - It paces its starts by operator settings for each provider account:
      starts per hour and computers at once. The app knows no limit of
      either account (`plans/follow-ups/launch-capacity-boat-limits.md:23`).
    - The bootstrap of B covers what the job does not reach: a workspace
      that a member opens before the job reaches it, a computer of a
      suspended owner or org after the lift, a failed step of the job, and
      each build from a base image.
    - The Worker records the host protocol version of each machine. A
      machine that connects with an older host version gets the bootstrap.
      A later host protocol change runs the same job again.
    - Cost: one start and some minutes for each stopped or archived
      workspace, also for a workspace that nobody opens again. The number of
      workspaces in production is not known here, so the length of the job
      is not known until it counts them.
    Effort: Large.
- **Left out:**
  - Refuse to start an old computer: it breaks the rule that older runners
    must keep working (`CLAUDE.md`, Status).
  - Rebuild each org image before the merge: stopped disks keep their old
    software. Also, under own computer decision 6 no release holds the host
    program before the merge.
  - Ship the host program in a release before the switch: it breaks own
    computer decision 6, and it does not reach computers that stopped
    before that release.
  - Keep provider commands only for the start steps, and wait for an idle
    install: the terminal, previews, and files fail until that install,
    and a busy runner can delay it for hours.
- **Wider fix:** D. It ends the transition when the job completes, and the
  same job serves each later host protocol change.
- **Previous examples:** The startup bootstrap installs a missing program
  through a fixed provider command
  (`worker/lifecycle/software-bootstrap.ts:54-84`). Restart in the
  workspace header does the same for a running computer
  (`worker/lifecycle/software-restart.ts:36-49`). The restart near day 14
  starts each stopped Boat computer briefly in the background.
- **Recommendation:** D. It ends the transition when the job completes, it finds
  failures before members open their workspaces, and it needs less special
  logic than C. The first recommendation was B, then C.
- **Choice:** D, on 22 November 2026.
- **Reason:** Cal proposed the migration for the part of the problem that
  comes only from the transition. The bootstrap stays for the lasting
  part: builds from a base image and later host protocol changes.
- **Note:** The first text of this decision left out a start in the
  background, because the app avoids a start that no user asked for. That
  rule stays for Resume and Restore (`docs/protocol/stop-and-resume.md:67-68`,
  `docs/protocol/workspace-life.md:193-196`). The day-14 restart is already
  a start in the background for disk retention. Cal's choice of D makes
  the job a second exception, and Milestone 9 records it in the protocol
  docs.
- **Options check of D:** a second check on 22 November 2026 found that D
  as first written ended every running turn, left an install pending that
  the next start rolls back, and installed the old release before the
  deploy publishes the new one. Milestone 9 holds the fixes. The running
  computers are own computer decision 8.

### Own computer decision 8: The install on a computer that runs at the deploy

- **Severity:** High. **Likelihood:** Common. **Effort:** Medium.
- **Source:** Design.
- **Category:** Product bug.
- **Location:** `worker/lifecycle/software-restart.ts:36-49`
- **Background:**
  - Restart in the workspace header downloads the newest release and
    restarts the runner. That ends each running turn and each process that
    an agent started, such as a dev server
    (`docs/protocol/restart-the-software.md:26-29`).
  - An idle computer installs a new release by itself, after 2 minutes
    with no turn (`docs/protocol/sandbox-software.md:140-147`). With the
    Milestone 4 change, the installer then starts the host service.
  - A computer with a running turn waits for that install. Two releases
    must not mix in the tool calls of one turn
    (`docs/protocol/sandbox-software.md:90-91`).
- **Problem:** Until a busy computer installs, it has no host connection.
  Its terminal, previews, and files then fail.
- **Impact if no action:** Either the deploy ends the running turns of
  every busy workspace, or those workspaces lose their tools until their
  turns end.
- **Root question:** How does a computer that is busy at the deploy get the
  host program without losing its running work?
- **Options:**
  - **A.** Restart the runner, as Restart does. Each running turn ends.
    Effort: Small.
  - **B.** Wait for the idle install. A busy computer has no terminal,
    previews, or files until its turns end, up to hours. Effort: Small.
  - **C.** Use the idle install first. For a computer that stays busy,
    install the new release beside the running one and start only the host
    program. No turn ends, and every tool works. The old relay checks the
    Host header (`crates/cnd-relay/src/headers.rs:14-46`), so the host
    program sends the header that it accepts. Effort: Medium.
- **Left out:** Delay the deploy until no turn runs: turns of automations
  and background work can run at any time.
- **Wider fix:** C.
- **Previous examples:** The idle update of
  [Sandbox software](../docs/architecture/sandbox-software.md#releases-and-updates).
- **Recommendation:** C. No turn ends, and the tools keep working.
- **Choice:** A, on 22 November 2026. The recommendation was C.
- **Reason:** Cal chose the simple path. The migration job restarts the
  runner of each running computer, as Restart does. Each running turn and
  each process that an agent started ends, as after any restart of the
  runner. The terminal shells keep running
  (`docs/protocol/restart-the-software.md:26-29`).

## Design calls

These are agent calls, made on 22 November 2026.

- Users see the name "own computer". The cloud computer keeps its name.
- Own computers use no cloud hours. Billing decides the rest when it
  starts.
- Each machine, cloud or own container, runs the program `conductive` in
  host mode as a system service. It opens one WebSocket to
  `/v1/host` on `api.conductive.build`. Reason: the same outbound pattern as
  the runner and the Mac app, with no open port.
- The host connection is separate from the runner connection. Reason: the
  runner protocol stays the same, so older runners keep working. The host
  protocol has its own version from its first release.
- The host connection ends in a new Durable Object for each machine, the
  machine object. The workspace object and the build code call it. Reason:
  build computers have no workspace object.
- Each machine gets a random machine token at each create and resume, in
  its env, as it gets the workspace token today. The Worker keeps only its
  hash.
- The host connection carries only fixed operations: run a command, start
  a command, read its status, read file info, read a file, and open a
  stream to a fixed list of local ports. It has no general pass-through.
- Each own computer runs the host program in computer mode, as a systemd
  user service of a dedicated user, with rootless Podman. It opens one
  computer connection to `/v1/computer`, to a computer object for each
  own computer. That connection carries only fixed container operations:
  create, get, start, stop, delete, save an image, and run the bootstrap.
  The bootstrap operation checks the signature of the Worker's release,
  installs it in the container, and starts the host program. Agent call,
  23 November 2026: decision 7 D needs it for a container with an older
  host program, and it adds no pass-through.
- Each container runs the same sandbox software as a cloud computer,
  including the host program in host mode. So the host connection is the
  same for both kinds.
- The app publishes a signed container base image with each deploy: the
  Ubuntu 24.04 base of the E2B template and the newest release. Each own
  computer builds its own org image from it, and refreshes it, as a cloud
  account does.
- An admin sets the number of workspaces that run at once on each own
  computer. The default gives each workspace 4 vCPU and 8 GB, the size of a
  cloud computer.
- An own computer is Linux on x86_64 only, because that is the one release
  target today.
- A new provider kind, `own`, implements the `MachineProvider` over the
  computer object. Each workspace and org image on an own computer records
  its computer ID.
- A workspace never moves between a cloud computer and an own computer, as
  no sandbox moves between accounts.
- One own computer serves one org. The Worker checks the org of the
  computer before each call.
- A start on an offline own computer fails at the 20-minute start limit,
  with Try again. The stop rule stays.
- Archive deletes the container 14 days later, at once when the computer
  is connected, or at its next connection.
- When an admin removes a computer, the Worker revokes its token. Its
  workspaces keep their chat. The app does not delete their files on the
  server.
- The desktop stays on the provider path. Only Boat has it, and the app
  hides it.
- Each release has an Ed25519 signature over its manifest. The signing key
  is a deploy secret. The public key is a constant in the program. A
  release of the program with that key refuses each unsigned or wrongly
  signed release.
- Previews and the terminal go through the machine object. Milestone 5
  measures their speed. If it is too slow, a Cloudflare Tunnel on the app's
  account is the fallback, and that change comes back as a decision.
- This branch is the primary branch of the plan. A sub-workspace builds
  each milestone and merges into it, as the `delegating` skill says.
- The operator section shows the number and the state of the own computers
  of each org, and no content.

These are agent calls, made on 23 November 2026, for problems that the
mockups of Milestone 1 showed.

- The settings tab is named Own computers, and it follows Cloud computer.
  Reason: users see the name "own computer", and a tab named Computers
  beside Cloud computer reads as a list of every computer.
- The computer choice of New workspace and of the automation form shows
  only while the org has an own computer. It follows the branch control,
  and Section in the automation form. Reason: a choice of one computer adds
  nothing, and most orgs have none.
- The menu of the choice keeps an own computer without a good build in its
  place, off, with the note of when it is ready. An offline own computer
  stays on, and a notice over the composer says that the workspace starts
  when the computer connects. Reason: a computer without an image cannot
  start a workspace, as a repository that waits for its build cannot, and
  a start on an offline computer waits for it.
- Each own computer reports its vCPUs, its memory, and its system at each
  connection. The default limit is one workspace for each 4 vCPU and 8 GB,
  and at least one. A lower limit stops no running workspace, and it
  applies to the next starts. Reason: the default needs the size of the
  server, and a change of a setting must not end running work.
- Each own computer has a page in the org settings: its facts, its builds
  in the build card of the Cloud computer tab, its limit, and Remove
  computer. Reason: each computer builds its own image, so an admin needs
  its log, its saved message, and Try again.
- A build of the org, from Build computer, a saved repository change, or
  the daily refresh, runs on the cloud computer and on each own computer,
  at once or at its next connection. Build computer and Try again on the
  page of an own computer build that computer alone. The Cloud computer tab
  says that own computers build its repositories, scripts, and env vars.
  Reason: one setup of the org reaches every computer, so a repository that
  an admin adds reaches each computer before a workspace there uses it.
- Add computer asks only for a name. The install command holds a one-time
  code that works once, within 1 hour. Close keeps the code, and the list
  shows the computer as Waiting to connect with Show command, or with New
  code after the code expired. The dialog says that people with root access
  to the server can read the work, the env vars, and the allowed secrets of
  each workspace on it. Reason: the install can take minutes on the server,
  a short life limits a stolen command, and own computer decision 2 names
  that access as the risk.
- Remove computer asks first. It stops each running workspace of the org on
  the computer, then revokes the token of the computer. Its workspaces show
  a refused start that names the computer. Reason: no workspace keeps
  running where the app cannot reach it, and a refused start keeps the
  chat.
- An automation whose own computer an admin removed turns off, with a
  notice, as after the removal of its repository. Its runs never move to
  the cloud computer by themselves. Reason: a move would run the work in
  another place than its owner chose.
- In a workspace on an own computer, each text that names the cloud
  computer of the workspace names the own computer: the first step of a
  start, the saved message of a failed start, and the menu of the header
  state, whose first line says where the workspace runs. Reason: a member
  needs to know where the work runs when a start waits or fails.
- The operator page of an org shows an Own computers box only when the org
  has own computers: their number, the count of each state, and the
  workspaces that run on them, without names. Reason: the design call above
  allows the number and the state, and no content.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

Every screen that own computers add or change.

- [x] Add the Computers tab of the org settings: the list of own computers
      with name, state, workspaces that run, and the limit. Show the admin
      view and the read-only member view.
- [x] Add the Add computer flow: the name, the one-line install command
      with its one-time code, the wait for the first connection, and an
      expired code.
- [x] Add the computer states: connected, offline, image build, image build
      failed, full, and Remove with its confirmation.
- [x] Add the computer choice to New workspace, as a page and as a dialog,
      with the cloud computer as the default. Show an offline and a full
      own computer.
- [x] Add the computer choice to the automation form.
- [x] Show an own computer in the workspace: the start failure on an
      offline computer with Try again, and the name of the computer where
      the cloud computer shows today.
- [x] Add the own computers of an org to the operator org page.
- [x] Run `npm run mockups:check`. Smoke-test the changed pages.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

The docs state the requirements and the decisions in force for the work
below. The legal pages and the guides change in the same milestone, as
`CLAUDE.md` says.

- [x] Add `docs/protocol/host-connection.md`: the host mode, the machine
      token, the operations, the streams, the version, the bootstrap, and
      the migration job of own computer decision 7.
- [x] Add `docs/protocol/own-computers.md`: who adds a computer, the
      install, the computer token, containers, the org image of each
      computer, the limit, offline starts, stop, Archive, removal, and the
      computer choice of New workspace, sub-workspaces, agent tools, and
      automations.
- [x] Update `docs/protocol/workspaces-and-sandboxes.md`: decision 80 now
      has the own computer exception, and decision 4 holds for each
      container.
- [x] Update `docs/protocol/provider-accounts.md`, `isolation.md`,
      `access-and-security.md`, `sandbox-software.md` with the signatures
      and the base container image, `org-image.md`, `create-a-workspace.md`,
      `workspace-life.md`, `stop-and-resume.md`, `terminal.md`,
      `port-previews.md`, `terminal-previews-and-desktop.md`,
      `file-server.md`, `automations.md`, `sub-workspaces.md`,
      `operator-section.md`, and `pricing.md`.
- [x] Update `docs/architecture.md` and `docs/architecture/components.md`,
      `data-and-trust.md`, `flows.md`, `sandbox-software.md`,
      `protocol-docs.md`, and `protocol-docs-workspaces.md`.
- [x] Read the Terms in `src/marketing/terms.ts`, `terms-work.ts`, and
      `terms-org.ts`, and the Privacy page in `src/marketing/privacy.ts`
      and `privacy-recipients.ts`, in full. Update each sentence that
      restates a changed fact. Set the effective date of the Terms.
- [ ] Get Cal's approval of the new Terms and Privacy text before the
      merge.
- [x] Read each guide in `src/marketing/docs/` in full. Update each
      sentence that restates a changed fact. Add a guide for own computers.
- [x] Check each relative link of each changed Markdown file.

## Milestone 3: Release signatures

Depends on: 2

Each release has a signature, and the program checks it before it installs.

- [ ] Add the signature to the deploy run that publishes a release.
- [ ] Check the signature in the updater before each download is used. The
      updater uses the `cli-updater` crate of `futex-ai/cli-release`, so a
      sub-workspace in that repository adds the check. Branch: to be set.
- [ ] Keep older programs working: they read the same release files and
      ignore the signature.
- [ ] Test a good, an unsigned, and a wrongly signed release.

## Milestone 4: Host connection

Depends on: 2

The host mode, the machine object, and the route. No consumer uses them yet.

- [ ] Add the host protocol types to `crates/cnd-runner-interface/`, and
      regenerate `src/shared/generated/`.
- [ ] Add the host mode to `conductive`, with its system service and its
      reconnect. The release installer starts the host service at each
      apply, because today it starts no stopped service
      (`image/install.md:186-187`).
- [ ] Add the machine token at create and resume, and keep its hash.
- [ ] Add the `/v1/host` route and the machine object.
- [ ] Add the operations and the streams to a fixed list of local ports.
- [ ] Test each operation, a dropped connection, a wrong token, and an
      unknown protocol version.

## Milestone 5: Speed of previews and the terminal

Depends on: 4

- [ ] Measure a dev server preview and a busy terminal through the machine
      object, against the provider path, on Boat and on E2B. Save the
      results under `.context/own-computers/`.
- [ ] If the host connection is clearly slower, stop and bring the
      Cloudflare Tunnel fallback to Cal as a decision.

## Milestone 6: Commands over the host connection

Depends on: 4

- [ ] Split `SandboxProvider` into `MachineProvider` and `MachineChannel`.
- [ ] Add the host channel. Keep the provider path as a converter for a
      computer that does not open the host connection.
- [ ] Move the start steps, Continue, the repository change, the retention
      command, the restarts, and the attachment downloads to the channel.
- [ ] Move each test with every assertion.

## Milestone 7: Terminal, previews, and files over the host connection

Depends on: 5, 6

- [ ] Move the terminal socket to a host stream to the terminal port.
- [ ] Move the previews and the files preview to a host stream to the
      relay port. Let the relay accept a stream from the host program.
- [ ] Move the fallback file read to the channel.
- [ ] Keep the proxies' header and cookie rules on the preview domain.

## Milestone 8: Builds over the host connection

Depends on: 6

- [ ] Move the org image builds, the refreshes, the software image build,
      and the image sources to the channel.

## Milestone 8a: Mockups of the migration job and removed computers

Tags: mockup

Depends on: 2

The docs of Milestone 2 found two screens with no mockup.

- [ ] Add the migration job to the Providers tab of the operator section:
      the count by account and state, the expected starts and days, the
      pace settings, the progress, the failures, Pause, Continue, and the
      limit to one org.
- [ ] Show the bar of a removed workspace on a removed own computer. It
      says that the files stay on that server, and gives no delete date.
      Agent call, 23 November 2026: the Remove question already says that
      the app deletes no file on the server.
- [ ] Run `npm run mockups:check`. Smoke-test the changed pages.
- [ ] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 9: Old computers, and removal of the provider path

Depends on: 7, 8

Own computer decision 7 D: a migration job brings each computer of the
transition onto the host connection, and the bootstrap covers the rest.
The second options check gave most of these TODOs. Its report is in
`.context/own-computers/options-check-decision-7-d.md`.

- [ ] Give the Worker the version and the digest of its own release at
      the deploy. The release files upload before the Worker
      (`.github/workflows/deploy.yml:181`), but the latest release file is
      published after it (`deploy.yml:298`, `:329`). Pin the bootstrap and
      the job to that release. The deploy run starts the job after the
      publish.
- [ ] Add the bootstrap: one fixed provider command that installs the
      pinned release and starts the host program. The Worker checks the
      signature of the release before it gives its digest to the command.
      Run it at each kind of start when the host connection does not come
      in time: create, resume, the day-14 restart, also after a lift, a
      build, a refresh, and the software image build. Run it also for a
      machine that connects with an older host version.
- [ ] Keep each install across a stop. Today an install that no runner
      confirms rolls back at the next runner start, and its version is then
      rejected (`crates/cnd-cli/src/update/engine.rs:40-70`). The new
      updater marks a release that no runner started yet, and its next
      apply starts that release. Test a brief-start install, then a resume.
- [ ] Record the host protocol version of each machine at each connection.
      Keep the previous Worker working on the new column.
- [ ] Add the migration job. Run each step in the workspace object: a
      stopped computer as a disk maintenance step that a resume ends first,
      and an archived computer as a phase of the archive maintenance. Check
      the owner and the org before each step. Resume with a provider stop
      after 1,800 seconds.
- [ ] At a brief start, give only a new machine token, and no workspace
      token, env var, or secret. The install is done when the host program
      connects with the current host version. Revoke the token at the stop.
- [ ] Choose the computers of the job by state. A stopped workspace and an
      error-state workspace whose stop is confirmed get the brief start. A
      failed Restart counts as running. Skip and report: a workspace that is
      creating or starting, a workspace with no sandbox, a sandbox under
      cleanup, a workspace of a deleted org, an account that is not
      configured, a provider error or a missing disk, and an archived
      workspace whose Restore ends within a day. Pace each workspace by its
      own account.
- [ ] Install on each running computer as own computer decision 8 A says:
      download the pinned release, then restart the runner, as Restart
      does (`worker/lifecycle/software-restart.ts:36-49`). Restart today
      needs a member (`software-restart.ts:125-137`), so the job calls the
      same steps as a trusted job of the workspace object. Each running
      turn ends, as after any restart of the runner.
- [ ] After a confirmed brief stop, record the stop time
      (`worker/lifecycle/confirmed-stop.ts:20-34`). A day-14 restart that
      falls due during the job does the install.
- [ ] Pace the job by operator settings for each account: starts per hour
      and computers at once, with a low default. Back off at each
      `rate_limited` or capacity reply. Do the running computers first.
- [ ] Before the first start, count the computers of each account by state
      and kind. Give an operator route with the count, the expected starts,
      the expected days, the progress, and the failures. Add the routes that
      pause and continue the job, and that limit it to one org. Milestone 9b
      builds the screens.
- [ ] Refresh each org image once on the current account of its org, as
      the daily timer does. Skip an image that is already new. Report each
      org with no active admin. Do not refresh an image on an old account.
- [ ] At the first step after the deploy, run the bootstrap for work that
      held a provider command at the deploy. Then read the journal of that
      command under `/tmp/conductive-lifecycle` over the host connection
      (`worker/lifecycle/command-intents.ts:13-33`).
- [ ] Keep the env write of an E2B resume through envd
      (`worker/sandbox/e2b/client.ts:71-75`) when the provider commands go.
- [ ] Add a rerun of the job for a later host protocol change.
- [ ] Test a running, a stopped, an archived, a suspended, and an
      error-state computer, a failed step, and an open, an Archive, and a
      Restore while the job runs.
- [ ] Delete each provider command, file read, and port method, and each
      converter, except what decision 7 D keeps: the bootstrap command, the
      E2B env write, and the desktop route (`worker/sandbox/boat.ts:96-100`).
- [ ] Delete the port credentials, the E2B port traffic token, and the
      relay's ingress identity check.
- [ ] Update the rules in force that the bootstrap and the job change, in
      `docs/protocol/sandbox-software.md`, `version-pins.md`,
      `stop-and-resume.md`, `isolation.md`, `workspace-life.md`,
      `suspension-workspaces.md`, and `restart-the-software.md`. Update the
      guide `src/marketing/docs/workspaces.md` when it changes. Read both
      legal pages again. The bootstrap must not let a runner below protocol
      2 start again.
- [ ] Update the sandbox README and the lifecycle README.

## Milestone 9b: Migration job screens

Tags: ui

Depends on: 8a, 9

- [ ] Build the migration job box of the Providers tab, as Milestone 8a
      draws it.

## Milestone 10: Own computer records and the computer connection

Depends on: 4

- [ ] Add a D1 migration for the own computers of each org, their token
      hashes, and the computer ID of each workspace, org image, and
      automation. Keep the previous Worker working on the new schema.
- [ ] Add the admin routes: add with a one-time code, list, set the limit,
      and remove.
- [ ] Add the admin routes that the mockups show: a new code for a
      computer that waits, the removal of a computer that never connected,
      and a build of one computer.
- [ ] Add the `/v1/computer` route and the computer object.
- [ ] Test the org check, a stolen code, a removed computer, and a member
      who is not an admin.

## Milestone 11: The host program on an own computer

Depends on: 3, 10

- [ ] Add the computer mode of `conductive`: the install command, the
      rootless Podman check, the systemd user service, and the health
      report.
- [ ] Publish the signed container base image with each deploy.
- [ ] Add the container operations, with the bootstrap operation.
- [ ] Report the vCPUs, the memory, and the system of the computer at each
      connection, for the Own computers tab.

## Milestone 12: Workspaces on own computers

Depends on: 9, 11

- [ ] Add the `own` provider kind over the computer object.
- [ ] Build and refresh the org image on each own computer.
- [ ] Apply the limit, the offline start, Archive, and removal.
- [ ] Pass the computer choice through New workspace, sub-workspaces, the
      agent tools, and automations.
- [ ] Add the counts of the operator section.
- [ ] Let a repository that waits follow the build of the chosen computer
      in New workspace.

## Milestone 13: Own computer screens

Tags: ui

Depends on: 1, 12

- [ ] Build the Computers tab and the Add computer flow.
- [ ] Build the computer choice of New workspace and of the automation
      form.
- [ ] Build the workspace states and the operator counts.
- [ ] Build the bar of a removed workspace on a removed own computer, as
      Milestone 8a draws it.

## Milestone 14: Agent tools and guides

Depends on: 12

- [ ] State in `docs/protocol/workspace-calls.md` and
      `docs/protocol/create-call-lists.md` that a create from a workspace
      tool takes the computer of the calling workspace, as own computer
      decision 3 A says. The create call gets no computer parameter.

## Milestone 15: Tests on real computers

Depends on: 9, 13, 14

- [ ] On a real Linux server in a test org: add the computer, create a
      workspace, chat, use the terminal and a preview, stop, resume,
      Continue, and Archive.
- [ ] On Boat and on E2B: create a workspace, resume an old stopped
      workspace, and run a first build.
- [ ] Test each computer that has no host program or an older one: a
      create from an org image of before the change, a refresh of such an
      image, a Boat software image build, a day-14 restart, and a computer
      that runs when the change deploys.
- [ ] Make old workspaces with the code of `main`, then run this branch on
      the same D1. Limit the job to one test org. Test a running turn during
      the job, an open during the job, an error-state workspace, a workspace
      on an old account after a switch, work in flight at the deploy, and
      the window before the publish. Measure one brief start on Boat and on
      E2B.

## Milestone 16: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run the targeted tests, the Rust checks, and the complete gate named
      in `CLAUDE.md`.
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
      the follow-up items that the change adds, and each breaking change.

## Post-merge follow-up (non-blocking)

- [ ] After the deploy, create a workspace on an own computer in the app's
      own org, and resume one old stopped workspace on Boat and on E2B.
