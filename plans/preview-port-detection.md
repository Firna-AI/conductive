# Detected ports in the Preview tool

Status: Active. On branch `calummoore/preview-port-detection-brainstorm`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

The Preview tool asks the user to type the port of a web server in the
cloud computer. The protocol says that the app does not discover ports. A
user often does not know the port, for example when an agent started the
server. On 9 November 2026, the user asked for detected ports that open a
preview with one click. The port field stays as a backup.

The runner in each cloud computer watches the listening TCP ports. It
reports the full list when the list changes (decision 213). The workspace
stores each report as a workspace event and sends it to the open tabs. The
port form of the Preview tool lists each detected server as a button with
its port and a short program name (decision 214). A click opens its
preview with the same request and checks as a typed port.

This change does not cover a ports control in the workspace header,
forwarding to localhost, stable preview links, a notice when a server
starts, or an automatic open. Items 1 and 3 of the brainstorm in the
workspace "Preview Links & Port Forwarding" hold the first three questions,
with no answer yet. Only an org image build installs a new runner, as
[Agent runner](../docs/protocol/agent-runner.md) says, and an existing
workspace keeps the runner of its image. So only a workspace created after
the next org image build gets the list. Decision 148 kept the same rule
for terminal programs.

Contract owners:

- [Workspace tools](../docs/protocol/workspace-tools.md#port-previews).
- [Agent runner](../docs/protocol/agent-runner.md).
- The [runner README](../runner/README.md) and its
  [event limits](../runner/event-limits.md).
- The [Preview tool README](../src/previews/README.md) and the
  [shared contracts README](../src/shared/README.md).

Terms:

- **Cloud computer:** the Boat sandbox of one workspace. Agents, the
  terminal, and dev servers run there.
- **Runner:** the Conductive program in each cloud computer. It runs the
  agents and keeps one connection to the workspace Durable Object.
- **Port form:** the part of the Preview tool that asks for a port. It
  shows when no preview is open, and after "+".
- **Socket tables:** the Linux files `/proc/net/tcp` and `/proc/net/tcp6`.
  They list each TCP socket with its address, state, owner, and inode.
- **Org image build:** "Build computer" in the org settings. Only a build
  installs a new runner.

## Decisions

### 213. Choose how the app finds the servers in a cloud computer

Added on 9 November 2026, as item 2 of the "Preview Port Detection
Brainstorm". Item 2 of the "Preview Links & Port Forwarding" brainstorm
of the same day asked the same question.

- **Severity:** Medium. **Effort:** Large.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** "Port previews" in `docs/protocol/workspace-tools.md`, and
  `src/previews/PreviewOpenForm.tsx`.
- **Terms:**
  - **`ss`:** a Linux command that lists the listening ports and the
    program of each port.
- **Background:**
  - Boat has no route that lists ports. Its process list has no ports, and
    its webhooks report only lifecycle events.
  - When a preview opens, the Worker already runs `ss` through a Boat
    command. It learns from the result how the server listens, in
    `worker/previews/listeners.ts`.
  - The runner already watches the repository and reports each file
    change to the workspace.
  - Coder lists the detected ports below its port field. Its agent reads
    the socket tables. Conductor detects the ports of cloud workspaces and
    suggests them.
- **Problem:** The app has no list of the servers that run. So the user
  must know each port and type it.
- **Impact if no action:** Typing stays the only way. When an agent
  started the server, the user must find its port in the terminal or in
  the chat.
- **Root question:** How does the app find the servers that run in the
  cloud computer, so that the user can open one with a click?
- **Options:**
  - **B.** The Worker checks when asked. When the port form shows, the
    app asks the Worker, and the Worker runs `ss` through the Boat command
    route. While the form shows in a visible tab, the app asks again every
    5 seconds. Every running cloud computer gets the list at once. Each
    check costs one Boat command. The account keeps at most 10 MiB of
    compressed command output per hour. Effort: Medium.
  - **C.** The runner reports each change. The runner reads the socket
    tables every 2 seconds and sends the full list when it changes. The
    Worker sends the list to each open tab. The list is ready when the
    form shows, and it needs no Boat call. It also serves a later ports
    control in the header. Only workspaces created after the next org
    image build get it. Effort: Large.
  - **D.** Both. The runner reports as in C. The Worker checks as in B
    when a runner does not report. It has two paths to build, test, and
    keep in step. Effort: Large.
  - **E.** Added by the options check. The runner answers on request, as
    it does for file reads. When the port form shows, the app asks the
    workspace, and the workspace asks the runner. While the form shows in
    a visible tab, the app asks again every 5 seconds. Nothing is stored,
    so a stop needs no clear and a lost answer needs no repair. No update
    arrives between two requests, and a later header control or notice
    needs a push anyway. Only workspaces created after the next org image
    build get it. Effort: Large.
  - **F.** Added by the options check. C, and each workspace start
    installs the newest runner when the cloud computer holds an older one.
    Each workspace then gets the list at its next start. The first start
    after each runner release takes longer, and it can fail in a new way.
    It reverses for the runner the rule that decision 148 kept for
    terminal programs. Effort: Large.
- **Left out:**
  - **A.** Typed ports only: it fails the goal.
  - Addresses that servers print in the terminal or in agent output: it
    finds printed addresses, not open ports. It misses a server that
    prints nothing, and it keeps a server that stopped.
  - A Boat port list: Boat has no such route.
  - A check of common ports: `ss` sees every port at the same cost, so B
    is better on every point.
  - Ports from a repository setting: it detects nothing, so it fails the
    goal.
  - Boat's process list: it gives command lines but no ports, so it fails
    the goal. The options check added this line.
  - An agent tool that announces each server that the agent starts: it
    fails the goal for a server that the user starts in the terminal, and
    it keeps a server that stopped. The options check added this line.
  - A separate service in the cloud computer that posts the list to a new
    Worker route: C has the same reach and needs no new right for the
    workspace token, so C is better on every point. The options check
    added this line.
- **Wider fix:** None, because this is a design question.
- **Previous examples:** The `ss` check in `worker/previews/listeners.ts`.
  Decision 148 kept the rule that only an org image build installs the
  terminal programs, so an existing workspace needs a new workspace to get
  a terminal fix.
- **Related:** Decision 214: its names come from the same report.
- **Recommendation:** C, after the options check. The brainstorm
  recommended B. The project is not in production, so the reach of B to
  running workspaces gains little. B runs about 720 Boat commands an hour
  for each visible port form. Boat keeps each command record for 90 days,
  and all orgs share one Boat account.
- **Action:** ask the user, because the options trade reach now against
  live updates and Boat use.
- **Chosen:** C, by the user on 10 November 2026.

### 214. Choose how a detected port shows which server it is

Added on 9 November 2026, as item 4 of the "Preview Port Detection
Brainstorm".

- **Severity:** Low. **Effort:** Small.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** None.
- **Background:**
  - Often several servers run at once. In this repository, `npm run dev`
    serves the app on port 5173, and the mockup preview uses port 4173.
  - The report of decision 213 can also name the program of each port.
  - Conductor shows each detected port with its program, such as
    "4173 mokly serve". Coder shows the process name.
  - A command line can hold a token or a password as an argument.
- **Problem:** A list of port numbers does not say which server is which.
- **Impact if no action:** The user guesses between ports, or opens each
  one.
- **Root question:** How does the user tell which detected server to open?
- **Options:**
  - **A.** The port number only, as the preview tabs show it today.
    Effort: Small.
  - **B.** The port and a short program name, such as `vite` or
    `astro dev`. The name skips an interpreter such as `node`, and keeps
    the program name and the next word. No other argument goes to the
    browser. Effort: Small.
  - **C.** The port and the full command line, with each marked secret
    env value masked. Other secrets in arguments still reach the browser.
    Effort: Small.
  - **D.** Added by the options check. B, and the folder of the server
    when that folder is not the root of the repository of the workspace.
    Examples are `apps/web`, or `api` for another repository of the org
    image. The runner reads the folder of the process and shows it
    relative to the repository folders under `~/code`. A server outside
    `~/code` shows no folder. One more path reaches the browser, as the
    paths of All files already do, and each row gets longer. Effort: Small.
  - **E.** Added by the options check. The title of the page of the
    server, and the name of B when the server has no page. The runner sends
    one request to each new port. Each server gets a request that the user
    did not make, which can start a slow first build, as in `next dev`. A
    default title, such as "Vite + React + TS", tells the user nothing.
    Effort: Medium.
- **Left out:**
  - A table of known ports, such as 5173 for Vite: it is wrong for a
    server on another port, so it fails the goal. The options check added
    this line.
  - The package and script names from the environment of a server that
    npm started: D works for every program and reads no environment, which
    holds secret values. So D is better on every point. The options check
    added this line.
- **Wider fix:** None, because this is a design question.
- **Previous examples:** Conductor's ports popover. Coder's port list, in
  `agent/ports_supported.go` of `coder/coder`.
- **Related:** Decision 213: the name comes from the same report.
- **Recommendation:** D, after the options check. The brainstorm
  recommended B. B shows one name for two servers of one program, such as
  two `next dev` servers in a monorepo, and the folder tells them apart.
- **Action:** ask the user, because B, C, and D send process data to the
  browser, and no requirement covers that data.
- **Chosen:** B, by the user on 10 November 2026. The options check then
  added D and recommends it. The user's answer on D is open, and the
  mockups wait for it.

## Design

Each item below is my call of 10 November 2026, unless it names a
decision. The user can override any of them.

**The runner report.**

- The runner reads the socket tables every 2 seconds. Reason: the read
  starts no process, and the agent of Coder works the same way.
- A port joins the list after two scans in a row with it. It leaves the
  list after two scans in a row without it. Reason: a short test server of
  an agent does not change the list. A server that restarts after each
  edit, such as under `nodemon`, keeps its row, so the rows below it do not
  move. So a server joins or leaves the list within about 4 seconds.
- The list holds each TCP port in the listen state on a wildcard or a
  loopback address, owned by the user of the runner. Reason: a specific
  address belongs to Boat's relay, as the listener rule of the preview
  backend says. Other users own system services, such as SSH.
- Cost: a port that a root process opens, such as a Docker port, does not
  show. The port field still opens it.
- The list leaves out the terminal port. It also leaves out each other
  port of the app's own services that a new cloud computer shows. The
  terminal port constant moves to the shared contracts, so that the
  runner and the Worker use one value.
- Each port has a name or none (decision 214 B). The runner finds the
  process of a new socket through `/proc/<pid>/fd`. It keeps the name for
  the life of that socket.
- The name is the file name of the program. For a known interpreter, such
  as `node`, `python3`, `bun`, or `deno`, it is the file name of the
  script, or the module after `-m`.
- The next word joins the name only when it has 1 to 20 lowercase letters
  and hyphens, such as `dev` or `serve`. Reason: the options check found
  that a next word can hold a secret. A token with digits or capitals stays
  in the cloud computer. A password of lowercase letters alone can still
  pass, and the output filter masks it only when it is a marked env value.
- A name has at most 40 characters. A port whose process the runner
  cannot read has no name.
- The list holds at most 64 ports, in the order of their numbers. Reason:
  the event stays far below the event limit, and rows do not move under
  the pointer.
- The runner sends `ports.updated` with the full list when the list
  changes, and once after each connect. It also sends it as the answer to
  `report.refresh` with the kind `ports.updated`. Reason: this matches the
  other full reports, and a lost update gets the repair of decision 96.
- The runner protocol stays at version 1. Reason: only a runner with the
  watcher sends the event, and only after such an event does the workspace
  ask for its refresh.

**The workspace.**

- The workspace stores each `ports.updated` as a numbered workspace event
  and sends it to the open tabs. Reason: the event stream already keeps
  the order and loses no event.
- When the sandbox stops, the workspace commits `ports.updated` with
  `ports: null`. A null list means that the app has no report. Reason: an
  old list would offer servers that the stop ended.
- The output filter covers each name, as it covers other runner text.
  Reason: a stored secret never goes back to the browser.
- A port report is not activity. Reason: decision 29 counts the use of a
  workspace, and a report is not use.

**The Preview tool.**

- The list shows in the port form, where the port field is today: when no
  preview is open, and after "+".
- Each detected server is a button with its port and its name. A click
  opens its preview with the same request and checks as a typed port.
- A port that has an open preview leaves the list, because its tab shows
  it. The tab then shows the name of its port after the port number, when
  the list has one. Reason: the options check found that the tab row
  otherwise loses the name of decision 214.
- The port field stays below the list, as a smaller "Other port" row.
- When the runner reports no server, the form asks the user to start one
  in the terminal, or to ask the agent. The text keeps a positive frame,
  and the mockups set its words. The field stays.
- When the app has no report, such as for a sandbox from an older image,
  the form shows as today.
- Nothing opens by itself, and no notice shows outside the Preview tool. A
  notice can come with the header ports control.
- The "Automatic port detection" row of the Conductor comparison page
  becomes Available in the pull request of this plan. An earlier change to
  Planned would need its own pull request.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The Preview tool gets the new states of its port form. The Tools page
would then pass five screens, so the Preview states move to a child page.
The rows wait for the user's answer on option D of decision 214.

- [ ] Add detected servers to `docs/mockups/src/fixtures/previews.ts`, for
      example port 3000 with `next dev` and port 6006 with `storybook`.
- [ ] Draw the port form with the list of detected servers and the smaller
      "Other port" row, in `docs/mockups/src/components/tools/PortPreview.tsx`.
- [ ] Show the name of a port after its number in the tab of an open
      preview.
- [ ] Move the Preview states from
      `docs/mockups/src/entries/app/tools/index.mockup.tsx` to a child page,
      `app/tools/preview`. Its canonical screen is the open port preview.
      Its variants are detected servers, no server yet, no report, and "+"
      over an open preview.
- [ ] Update `docs/mockups/catalogue.md` for the new page.
- [ ] Run `npm run mockups:check`. Smoke-test the changed pages on the
      desktop and the phone sizes.
- [ ] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

The protocol docs state the requirements of the list and decisions 213
and 214 before the code changes.

- [ ] Update "Port previews" in `docs/protocol/workspace-tools.md`.
      Replace the rule that the app does not discover ports. State the
      list, its names, its update time, its empty and unknown states, its
      clear at a stop, and the field. Add decisions 213 and 214 with their
      rejected alternatives.
- [ ] Update `docs/protocol/agent-runner.md`. State that the runner
      reports the listening ports, add `ports.updated` to the kinds of
      "Lost workspace updates", and give the limits of the list.
- [ ] Update the runner term and "Sandbox software" in
      `docs/architecture.md`.
- [ ] Read the Terms page in `src/marketing/terms.ts` and the Privacy page
      in `src/marketing/privacy.ts` in full. Update each sentence that
      restates a changed fact.
- [ ] Update `src/previews/README.md`, `runner/README.md`,
      `runner/event-limits.md`, and `src/shared/README.md`.
- [ ] Check each relative link of each changed Markdown file.

## Milestone 3: Runner port reports

Depends on: 2

The runner watches the socket tables and reports the list.

- [ ] Add the shared contract in `src/shared/`: a listening port type with
      `port` and `name`, `ports.updated` in `RunnerEvent` and
      `WorkspaceEvent`, the kind in `RunnerReportKind`, the limits, and the
      terminal port constant.
- [ ] Add the port watcher to the runner: the parser of the socket tables,
      the filter, the names, the rule of two scans, and the reports after a
      change, a connect, and a refresh.
- [ ] Test the parser and the filter with socket table fixtures: a
      wildcard, a loopback, and a specific address, another owner, another
      state, the terminal port, IPv6, and one port in both tables.
- [ ] Add a table test of the name rule with literal command lines: an
      interpreter, `-m`, a flag, a path, a next word with digits or
      capitals, the length limit, and a process that the runner cannot
      read.
- [ ] Test the rule of two scans for a new and for a closed port, a report
      only on a change, the report after a connect, and the refresh answer.
      Use a fake scan driver and no sleep.
- [ ] Get the listeners of a new workspace on the test deployment, with
      `ss -H -ltnpe` in its Terminal. The user can run it. Add each listener
      that is not a user server to the exclusion list. Save the output under
      `.context/preview-port-detection/`.

## Milestone 4: Workspace list and clear

Depends on: 3

The workspace accepts, stores, filters, sends, and clears the list.

- [ ] Accept `ports.updated` in the runner event parser of the workspace,
      with its limits. Refuse an invalid report with the refusal marker and
      the repair of decision 96.
- [ ] Store and send each report as a workspace event.
- [ ] Add each name to the output filter in `src/shared/output-fields.ts`.
- [ ] Commit `ports.updated` with `ports: null` in the stop hook of the
      workspace, beside the preview revocation.
- [ ] Add Worker tests: a stored and sent report, an invalid report with
      its marker and its refresh, a masked marked env value in a name, and
      the clear at a stop.

## Milestone 5: Detected servers in the Preview tool

Tags: ui

Depends on: 1, 4

The port form lists the detected servers, as the mockups show.

- [ ] Read `ports.updated` in `src/app/api/read-events.ts`. Keep the latest
      list in the preview reducer.
- [ ] Show the list in `PreviewOpenForm`, with the states and the words of
      the mockups, on the desktop and the phone sizes.
- [ ] Show the name of a port in its tab, in `PreviewToolbar`.
- [ ] Add tests: the reducer keeps the latest list and the null list, the
      form lists the servers without an open preview, a click opens the
      port, the empty and unknown states show, and a tab shows its name.
- [ ] Add a fake `ports.updated` to the tools dev page in
      `src/terminal/dev/`. Smoke-test the port form there.
- [ ] Set the "Automatic port detection" row in
      `src/marketing/from-conductor/areas/cloud.ts` to Available. Its note
      names the click on a detected server.

## Milestone 6: Verification, commit, review, and pull request

Depends on: every other milestone

The complete gate proves the work, and the review checks it.

- [ ] Run each new asynchronous test 10 times. Record the pass count under
      `.context/preview-port-detection/`.
- [ ] Run `npm --prefix desktop ci` and `npm ci --prefix runner`. Then run
      the targeted tests and the complete gate, `npm run check`.
- [ ] Check that decisions 213 and 214 are still free on `origin/main`.
      Renumber them when they are not.
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

- [ ] After the deploy, build the cloud computer of a test org and create
      a workspace. Start a dev server. Check that the Preview tool lists it
      with its name within 5 seconds, and that a click opens its preview.
- [ ] Check that a workspace created before that build shows the port
      field as today.
