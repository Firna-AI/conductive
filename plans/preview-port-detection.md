# Detected ports in the Preview tool

Status: Active. [PR #154](https://github.com/Firna-AI/remote-code/pull/154) is open as a draft. The pull request that completes the work deletes this plan, as the `plans` skill says.

The Preview tool asks the user to type the port of a web server in the
cloud computer. The protocol says that the app does not discover ports. A
user often does not know the port, for example when an agent started the
server. On 9 November 2026, the user asked for detected ports that open a
preview with one click. The port field stays as a backup.

The runner in each cloud computer watches the listening TCP ports. It
reports the full list when the list changes (decision 213). The workspace
stores each report as a workspace event and sends it to the open tabs. The
port form of the Preview tool lists each detected server as a button with
its port, a short program name, and its folder when that folder tells it
apart (decision 214). A click opens its preview with the same request and
checks as a typed port.

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
  added D and recommended it. The user chose D on the same day. The user
  also asked that the tab of an open preview keeps a short label, cut with
  "…", so the folder shows in the list and not in the tab.

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
- Each port has a name or none, and a folder or none (decision 214 D).
  The runner finds the process of a new socket through `/proc/<pid>/fd`.
  It keeps the name and the folder for the life of that socket.
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
- The folder comes from the working folder of the process. A server in
  the root of the workspace's own repository, `CONDUCTIVE_REPOSITORY_DIR`,
  has no folder. A server below that root shows its path from the root,
  such as `apps/web`.
- A server in another repository folder under `~/code` shows the name of
  that folder and the path below it, such as `api` or `api/server`. A
  server outside `~/code` has no folder. Reason: no path outside the
  repositories reaches the browser.
- A folder has at most 120 characters. A longer folder keeps its end,
  after "…", because the end tells servers apart.
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
- The output filter covers each name and each folder, as it covers other
  runner text. Reason: a stored secret never goes back to the browser.
- A port report is not activity. Reason: decision 29 counts the use of a
  workspace, and a report is not use.

**The Preview tool.**

- The list shows in the port form, where the port field is today: when no
  preview is open, and after "+".
- Each detected server is a button with its port, its name, and its
  folder. The row cuts a folder that does not fit with "…" at its start,
  so the end stays. A click opens its preview with the same request and
  checks as a typed port.
- A port that has an open preview leaves the list, because its tab shows
  it.
- The tab of an open preview shows the port and at most 10 characters of
  its name. A longer name shows 9 characters and "…". The tab shows no
  folder. Reason: the user asked on 10 November 2026 for a short tab
  label, strictly limited, maybe with "…".
- The tooltip and the accessible name of the tab give the port, the full
  name, and the folder. Reason: the cut label must not hide which server
  the tab shows.
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

**From the mockups.** These calls of 10 November 2026 come from Milestone 1.

- The list fills the port form from its top and scrolls, as the file
  lists do. Reason: the desktop tools panel is about 355 px high, and a
  report can hold 64 ports.
- A line above the list keeps the words of today's form: "Open a web
  server that runs in this sandbox." Reason: the form keeps one message in
  each state.
- A row shows the port in the monospace font, then the name, then the
  folder in the muted colour at the end of the row. Its tooltip and its
  accessible name are those of a tab. Reason: a cut folder must not hide
  which server the row opens.
- The "Other port" row has its label, the field, and Open preview in the
  secondary tone. Its placeholder is "8080". Reason: the rows are the main
  action, and "3000" would look like a port of the list.
- When the runner reports no server, the form says "Servers that run in
  this sandbox show here. Start one in the terminal, or ask the agent."
  The title, the field, and the primary Open preview of today's form stay.
- A tab label is the port and the cut name, such as `6006 storybook…`, in
  the capitals of the tab labels. A port that the latest list does not
  name keeps `Port 3000`. Reason: the name takes the place of "Port", and
  the tooltip and the accessible name keep the case of the name.
- The tab row fades its end when it clips tabs, as the session tab row
  does. Reason: the mockups showed that two named tabs and the actions of
  the frame do not fit the right column or a phone. The row then cut a
  label with no sign.
- After "+", the tabs keep their labels and no tab is current. "+" is
  pressed, and Reload, Open in new tab, and Close hide, as today.
- The fixtures use `astro dev` in `docs` and in `marketing-site`, not
  `next dev` in `apps/web` and `apps/docs`. Reason: the root of the open
  workspace already runs `next dev`, and the pair shows both kinds of
  folder.
- The hidden Desktop moves into its own folder and keeps its path,
  `app/tools/desktop`. Reason: a page with child pages shows only its
  canonical screen.

**From the documentation.** This call of 10 November 2026 comes from
Milestone 2.

- The Privacy page gets the effective date 10 November 2026. Reason: the
  page says that each published change updates its date. The pull request
  moves the date when it merges on a later day.

**From the repair mockup.** These calls of 10 November 2026 come from
Milestone 2a.

- After a failed repair of the list, the port form keeps its last list and
  the "Other port" row. Under them, the row of a file list that is not the
  latest one says "The latest list of servers is unavailable", with the
  time since the failure. It has no Dismiss, as that row has none. Reason:
  decision 96 puts the notice beside the data, as the file lists do.
- The notice shows only where the port form shows the list: with no
  preview open, and after "+". An open preview in its frame shows none.
  Reason: the notice stands beside the list.
- `lostCopy.ts` gets the data `servers`. Its line of a refused event says
  "An update to the list of servers". Reason: one module holds the words of
  lost data, and each refused event type needs a subject.
- The state has its own page, `app/tools/preview-repair`, beside
  `app/tools/preview`. Reason: that page already shows five screens.

**From the final documentation check.** My call of 10 November 2026:
move the hostname table and its complete text into the existing data and
trust page. Keep the overview heading and a link. Reason: the architecture
overview passed the shared documentation length target. No fact changes.

**From the main merge.** My call of 10 November 2026: move the Privacy
sections about data recipients and transfers into
`src/marketing/privacy-data-sharing.ts`. Reason: the combined legal text
passed 300 lines. The split keeps the evaluated document exactly the same.

**From the runner implementation.** These are my calls of 10 November
2026, within the approved report contract.

- The production entry point supplies the optional port scanner boundary.
  Reason: embedded runner callers and tests must not read host socket tables.
- A failed scan keeps the stable list and warns. It does not count as an
  absent port. A forced report can still send that stable list.
- An unknown interpreter option gives no name. Reason: its next argument
  can be an option value instead of a script.
- An option-looking next argument does not join the name. Reason: it is
  not a short command word.
- The shared event bound applies the name and folder limits after secret
  masking. Reason: masking can make a valid short label longer.
- Character limits count Unicode code points. Reason: a cut must not split
  one character.
- Shutdown stops the port driver, starts agent shutdown, then waits for the
  scans before the final connection close. Reason: a scan must not delay
  stopping an agent.

**From the workspace implementation.** These are my calls of 10 November
2026, within the approved report contract.

- The port parser requires strictly increasing numbers. Reason: one pass
  checks the approved order and the absence of duplicates.
- The existing event transaction stores and sends each report. Reason:
  the list needs no separate stored projection.
- The stop operation clears the list in its transaction, after preview
  revocation. Reason: it must run even when no preview is open.
- The chat Access guide moves intact into `worker/chat/access.md`, with
  the README anchor kept. Reason: the README passed the file-length target.

**From the Preview implementation.** These are my calls of 10 November
2026, within the approved UI contract.

- The tool event adapter keeps the latest report and the first repair
  failure since that report. It replays them with revocations in event order.
- A report that the browser cannot parse leaves the last report in place.
  Reason: a partial decode must not replace useful data.
- The tool store accepts an optional envelope adapter. Reason: the notice
  needs the event time, while other tools keep their existing event input.
- The form uses a field state when every detected server has an open tab.
  Reason: those servers still run, so an empty-server instruction is wrong.
- Server buttons wait while a preview opens. Reason: one pending open must
  not create repeated preview requests.
- The notice uses the app clock and updates its age every 30 seconds.
  Reason: it follows the existing file-list notice.
- The Preview tab row reuses the session-tab scroll helper. Reason: it
  keeps the current tab in view and fades clipped ends.
- The dev page uses explicit report fixtures and a fixed clock. Reason:
  the repair-age smoke check must stay reproducible.

**From the final main integration.** My call of 10 November 2026:
keep the new component and protocol pages from `main`. Put the runner's
port responsibility in the components page. Keep `main`'s Privacy uses
module and add the server-list fact there. Its new attachment facts and
all other legal text stay. The earlier private data-sharing module is
redundant after this merge and is removed. The hostname table stays in
the data and trust page, with its overview link. The chat Access guide
keeps the new queued-write rules from `main`.

**From the repair verification.** My call of 10 November 2026: reuse the
native transport's existing input-completion barrier at the start of each
drain pass. Reason: the controlled proof showed that an outgoing read
could finish before the deferred input request. This is a test-support
completion fix. It changes no product behavior or requirement.

**From review finding 1.** My call of 10 November 2026: apply option A
from the confirmed finding. Keep one mounted manual-editing subtree in
all report states. Reuse the message styles for the centred states.
Reason: a report must not replace an input while the user types. The
same input then keeps its text, focus, selection, and invalid mark.

**From review finding 2.** My calls of 10 November 2026: apply option B.
Keep complete selected labels through the private event and the final
secret filter. The Worker owns the displayed 40 and 120 character cuts.
The private payload budget is 512 KiB, within the existing 1 MiB envelope.
A label that cannot fit becomes wholly unavailable, and its port stays.
Reason: another private text cut can repeat the same secret leak.
Use the process executable link for identity. An unidentifiable rewritten
interpreter title gives no name. Reason: a title can contain unselected
arguments. The browser behavior and displayed limits remain the same.
The shared display-bound test moves to the Worker owner with every
assertion retained. The existing tool-detail cutoff is a separate
follow-up in `plans/follow-ups/tool-detail-cut-before-env-filter.md`.

**From the fresh listener inventory.** My call of 10 November 2026: add
exact exclusions for ascii-agent port 8911 and Sunshine ports 47984,
47989, 47990, and 48010. Keep the shared terminal port 7681. Reason:
these services listen as the runner's user in the supplied fresh workspace.
Keep neighboring user ports eligible. The owner filter covers the other
system services. This completes the approved internal-service filter.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The Preview tool gets the new states of its port form. The Tools page
would then pass five screens, so the Preview states move to a child page.

- [x] Add detected servers to `docs/mockups/src/fixtures/previews.ts`. Give
      two of them one program in two folders, such as `next dev` in
      `apps/web` and in `apps/docs`. Add one with a long folder and one with
      a name over 10 characters.
- [x] Draw the port form with the list of detected servers and the smaller
      "Other port" row, in `docs/mockups/src/components/tools/PortPreview.tsx`.
      Each row shows the port, the name, and the folder.
- [x] Draw the tab of an open preview with the port and the name cut to 10
      characters, with no folder.
- [x] Move the Preview states from
      `docs/mockups/src/entries/app/tools/index.mockup.tsx` to a child page,
      `app/tools/preview`. Its canonical screen is the open port preview.
      Its variants are detected servers, no server yet, no report, and "+"
      over an open preview.
- [x] Update `docs/mockups/catalogue.md` for the new page.
- [x] Run `npm run mockups:check`. Smoke-test the changed pages on the
      desktop and the phone sizes.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show.

Evidence: `.context/preview-port-detection/m1-report.md`.

## Milestone 2: Documentation and protocol

Depends on: 1

The protocol docs state the requirements of the list and decisions 213
and 214 before the code changes.

- [x] Update "Port previews" in `docs/protocol/workspace-tools.md`.
      Replace the rule that the app does not discover ports. State the
      list, its names and folders, its update time, its empty and unknown
      states, its clear at a stop, the field, and the short tab label. Add
      decisions 213 and 214 with their rejected alternatives.
- [x] Update `docs/protocol/agent-runner.md`. State that the runner
      reports the listening ports, add `ports.updated` to the kinds of
      "Lost workspace updates", and give the limits of the list.
- [x] Update the runner term and "Sandbox software" in
      `docs/architecture.md`.
- [x] Read the Terms page in `src/marketing/terms.ts` and the Privacy page
      in `src/marketing/privacy.ts` in full. Update each sentence that
      restates a changed fact.
- [x] Update `src/previews/README.md`, `runner/README.md`,
      `runner/event-limits.md`, and `src/shared/README.md`.
- [x] Check each relative link of each changed Markdown file.

Evidence: `.context/preview-port-detection/m2-report.md`.

## Milestone 2a: Port-list repair notice mockup

Tags: mockup

Depends on: 2

The documentation pass found that the existing failed-repair requirement
also covers the new port list. The Preview tool needs that visual state.

- [x] Draw the failed port-list repair notice beside the detected servers,
      with the shared notice style and product words. Add a linked catalogue
      page without passing the five-screen limit of the Preview page.
- [x] Run `npm run mockups:check` and smoke-test the new state on desktop
      and phone sizes.
- [x] Record the mockup calls in the design and align the Milestone 5 tasks.

Evidence: `.context/preview-port-detection/m2a-report.md`.

## Milestone 3: Runner port reports

Depends on: 2, 2a

The runner watches the socket tables and reports the list.

- [x] Split the Privacy content source after the merge from `main`, so its
      expanded text stays below 300 lines per file. Keep every rendered
      word and its order.

- [x] Add the shared contract in `src/shared/`: a listening port type with
      `port`, `name`, and `folder`, `ports.updated` in `RunnerEvent` and
      `WorkspaceEvent`, the kind in `RunnerReportKind`, the limits, and the
      terminal port constant.
- [x] Add the port watcher to the runner: the parser of the socket tables,
      the filter, the names, the folders, the rule of two scans, and the
      reports after a change, a connect, and a refresh.
- [x] Test the parser and the filter with socket table fixtures: a
      wildcard, a loopback, and a specific address, another owner, another
      state, the terminal port, IPv6, and one port in both tables.
- [x] Add a table test of the name rule with literal command lines: an
      interpreter, `-m`, a flag, a path, a next word with digits or
      capitals, the length limit, and a process that the runner cannot
      read.
- [x] Add a table test of the folder rule with literal folders: the root
      of the workspace's repository, a folder below it, another repository
      under `~/code`, a folder outside `~/code`, and a folder over 120
      characters.
- [x] Test the rule of two scans for a new and for a closed port, a report
      only on a change, the report after a connect, and the refresh answer.
      Use a fake scan driver and no sleep.
- [x] Get the listeners of a new workspace on the test deployment, with
      `ss -H -ltnpe` in its Terminal. The user can run it. Add each listener
      that is not a user server to the exclusion list. Save the output under
      `.context/preview-port-detection/`.

Evidence: `.context/preview-port-detection/m3-report.md` and
`.context/preview-port-detection/privacy-split-report.md`.

The user supplied the fresh workspace inventory on 10 November 2026.
Evidence: `.context/preview-port-detection/live-listener-inventory.txt`.
The same-user ascii-agent and Sunshine ports join the terminal exclusion.
The scanner checks and report are in
`.context/preview-port-detection/listener-exclusions-report.md`.

## Milestone 4: Workspace list and clear

Depends on: 3

The workspace accepts, stores, filters, sends, and clears the list.

- [x] Accept `ports.updated` in the runner event parser of the workspace,
      with its limits. Refuse an invalid report with the refusal marker and
      the repair of decision 96.
- [x] Store and send each report as a workspace event.
- [x] Add each name and each folder to the output filter in
      `src/shared/output-fields.ts`.
- [x] Commit `ports.updated` with `ports: null` in the stop hook of the
      workspace, beside the preview revocation.
- [x] Add Worker tests: a stored and sent report, an invalid report with
      its marker and its refresh, a masked marked env value in a name and
      in a folder, and the clear at a stop.

Evidence: `.context/preview-port-detection/m4-report.md`.

## Milestone 5: Detected servers in the Preview tool

Tags: ui

Depends on: 1, 4

The port form lists the detected servers, as the mockups show.

- [x] Read `ports.updated` in `src/app/api/read-events.ts`. Keep the latest
      list in the preview reducer.
- [x] Show the list in `PreviewOpenForm`, with the states and the words of
      the mockups, on the desktop and the phone sizes. Each row shows the
      port, the name, and the folder.
- [x] Show the port and the cut name in the tab, in `PreviewToolbar`. Give
      the tab a tooltip and an accessible name with the port, the full name,
      and the folder.
- [x] Add tests: the reducer keeps the latest list and the null list, the
      form lists the servers without an open preview, a click opens the
      port, and the empty and unknown states show. Test that a tab cuts a
      name over 10 characters to 9 and "…", and that its accessible name
      holds the full name and the folder.
- [x] Show the failed port-list repair notice from Milestone 2a beside
      the list. Keep the last list until a newer full report arrives. Test
      the failed marker, its replay, and the clear from a later report.
      - Draw it as `app/tools/preview-repair` shows: `LostUpdateRow` with
        `unavailableText('servers')` and the time since the failure, under
        the port form, with no Dismiss. Show it with no preview open and
        after "+", and never with a preview in its frame.
      - Map a refused `ports.updated` to `servers` in `LostEventLine`.
- [x] Add a fake `ports.updated` to the tools dev page in
      `src/terminal/dev/`. Smoke-test the port form there.
- [x] Set the "Automatic port detection" row in
      `src/marketing/from-conductor/areas/cloud.ts` to Available. Its note
      names the click on a detected server.

Evidence: `.context/preview-port-detection/m5-report.md`.

## Milestone 5a: Keep manual port editing stable

Tags: ui

Depends on: 5

Review finding 1 and its independent check found that the two form roots
replace the manual input when a report changes between a list and a message.
Apply option A. Keep one mounted editing row and the existing visual states.

- [x] Add a mounted regression case for the typed port, focus, and selection
      through report changes in both directions. See its assertion fail.
- [x] Keep one root and stable positions for the message, list, and manual
      field. Keep every existing state, action, error, and busy behavior.
- [x] Run the targeted UI checks and the new asynchronous case ten times.
      Smoke-test the same panel and phone layouts.

Evidence: `.context/preview-port-detection/finding-1-fix-report.md`.

## Milestone 5b: Filter complete private port labels

Depends on: 3, 4, 5a

Confirmed review finding 2 needs option B. The private report keeps the
complete selected label until the final secret filter. The stored and
shown labels keep the approved 40 and 120 character limits.

- [x] Add boundary regressions for complete selected names and folders
      through scanner, private reports, Worker filtering, and saved replay.
- [x] Remove every premature label cut, including the runner event bound.
      Keep raw outbox, refresh, reconnect, and parser phases consistent.
- [x] Keep the private report within its existing budget without creating
      fragments. Omit whole optional labels when needed and keep each port.
- [x] Confirm the selected program from reliable process metadata. A
      rewritten process title must not expose unselected arguments.
- [x] Apply display limits only after the final filter. Preserve names,
      folder rules, port validation, public behavior, and earlier tests.
- [x] Run targeted checks, new asynchronous cases ten times, and the runner
      build. Align phase documentation and check the legal facts.

Evidence: `.context/preview-port-detection/finding-2-fix-report.md`.
Both legal pages and the Privacy uses module were read in full. Their
public facts remain correct.

## Milestone 5c: Align the newly merged public guides

Depends on: 5b

The public Markdown guides arrived from `main` after implementation.
They must give the same Preview facts as the approved feature.

- [x] Read all twelve public guides in full. Update each restated Preview,
      secret-label, and new-computer rollout fact in the same change.
- [x] Keep guide front matter and public heading links. Check their internal
      guide URLs and anchors.

Evidence: `.context/preview-port-detection/final-public-guides-report.md`.
Only the Preview, cloud-computer, and security guides changed.

## Milestone 6: Verification, commit, review, and pull request

Depends on: every other milestone

The complete gate proves the work, and the review checks it.

- [x] Run each new asynchronous test 10 times. Record the pass count under
      `.context/preview-port-detection/`.
- [x] Align the three stop-history journey tests with the added null port
      report. Keep every existing assertion and the complete event order.
- [x] Correct the proved native input-completion race in the transport
      owner. Reproduce both repair failures with controlled native order,
      keep every test assertion, and verify ten fresh runs.
- [x] Verify the implementation after the merge of the new native Worker
      test support, typed warnings, attachment facts, and split protocol docs.
- [x] Run `npm --prefix desktop ci` and `npm ci --prefix runner`. Then run
      the targeted tests and the complete gate, `npm run check`.
- [x] Check that decisions 213 and 214 are still free on `origin/main`.
      Renumber them when they are not.
Evidence: `.context/preview-port-detection/m6-integration-report.md`.
The native repair tests exposed an input-completion race. Controlled native
checks reproduced both missing-command assertions. The transport now
waits for its existing input barrier before reading outgoing messages.
Both controlled cases and ten fresh runs passed. The resolved follow-up
`plans/follow-ups/runner-report-repair-test-flake.md` is deleted. Every
permanent test assertion, timeout, and retry setting stays unchanged.
Evidence: `.context/preview-port-detection/m6-repair-drain-report.md`.

Evidence: `.context/preview-port-detection/complete-gate-verified.log`.
The complete gate passed on the final merged tree. The final runner build
also passed, in `.context/preview-port-detection/final-runner-build.log`.

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

## Post-merge follow-up (non-blocking)

- [ ] After the deploy, build the cloud computer of a test org and create
      a workspace. Start a dev server. Check that the Preview tool lists it
      with its name and folder within 5 seconds, and that a click opens its
      preview.
- [ ] Check that a workspace created before that build shows the port
      field as today.

Verification status: the review findings are fixed and independently checked.
The fresh listener inventory is now supplied and its exact exclusions are
implemented. The remaining rollout checks are recorded in
`plans/follow-ups/preview-port-detection-deployed-smoke.md`.
The completed change deletes this plan after final verification and review.

Final local verification: the current source passed its typecheck, 149
runner tests, production build, and strict mockup build. The local root
suite passed 2,013 cases and hit the existing restore-watch flake once.
Its unchanged file rerun passed all 11 cases. The existing follow-up keeps
the exact assertion and suspected cause. The pull request's complete gate
and both Mac checks verify the final head. The user supplied the required
live inventory, and its exclusion regression passes.
