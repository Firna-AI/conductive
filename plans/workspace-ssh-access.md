# Open a workspace over SSH from the Mac app

Status: Active. On branch `calummoore/ssh-access-brainstorm`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

Members reach the cloud computer of a workspace only through the Terminal
tab. They cannot open it in Cursor, VS Code, or Zed, or with `ssh` in their
own terminal, as the Mac app of Conductor allows. This change adds an SSH
menu to the Mac app. The Mac app writes one SSH config entry for each
workspace, with a fixed local port. It listens on that port and relays each
connection through the Worker over HTTPS. In the sandbox, a small bridge
passes the bytes to the SSH server of the sandbox. The Worker runs the same
access check as for the Terminal tab (decision 213).

The change does not cover SSH from a browser without the Mac app, a helper
for Linux or Windows, short-lived SSH certificates, or the sync of a
workspace to a local folder. Decisions 214, 215, 216, and 217 are open.

Contract owners:

- `docs/protocol/ssh-access.md`, a new protocol doc from Milestone 2.
- [Workspace tools](../docs/protocol/workspace-tools.md).
- [Workspaces and sandboxes](../docs/protocol/workspaces-and-sandboxes.md):
  "Stop and resume" and "Tools of a workspace".
- [Access and security](../docs/protocol/access-and-security.md).
- [Mac app](../docs/protocol/desktop-app.md).
- The [Mac app README](../desktop/README.md), the
  [terminal README](../worker/terminal/README.md), and a new
  `worker/ssh/README.md`.

## Decisions

The two options checks of 9 November 2026 are in
`.context/workspace-ssh-access/options-check-1.md` and
`.context/workspace-ssh-access/options-check-2.md`.

### Decision 213. How members reach the sandbox over SSH

The user chose D on 9 November 2026, in the brainstorm of this branch.

- **Root question:** How does a member open a workspace's cloud computer
  in their own editor or terminal?
- **Chosen, D:** a local port in the Mac app, with the Worker as a relay.
  This is the design of Conductor. Each SSH config entry names `127.0.0.1`
  and a fixed port of its workspace. The Mac app listens on that port and
  relays the bytes through the Worker. Reason: the entries hold only a host
  and a port, so each tool that reads `~/.ssh/config` works, also a tool
  that cannot run a `ProxyCommand`. The 30-second access rule of decision
  70 needs no new exception.
- **Rejected, A:** copy a one-line command for a direct connection, with
  the member's public keys from GitHub. Each resume gives a new address
  and a new host key, so the command and the editor's saved host break.
  A loss of access needs a command in the sandbox that removes the key.
- **Rejected, B:** a helper in the Mac app with a direct connection. The
  end of access needs a command in each running sandbox, which can fail or
  take longer than 30 seconds. Networks that block SSH ports cannot
  connect.
- **Rejected, C:** a `ProxyCommand` helper with the same relay as D. Each
  entry must name a helper program, so a tool that cannot run one fails.
- **Left out:**
  - Short-lived certificates. With a direct connection they cannot close
    an open connection, which breaks decision 70. With the relay, they
    change only how the sandbox trusts a key.
  - A third-party network, such as a tunnel service or a mesh VPN. Each
    member needs a second account, and an open connection does not end
    within 30 seconds after a loss of access.
  - The Mac app straight to the bridge through the provider's port
    address. The bytes skip the Worker, which breaks decision 70, and the
    Mac would hold the provider's port token.
  - A browser editor, or a sync to a local folder. The goal is the
    member's own editor working in the cloud computer.
  - VS Code Remote Tunnels. It does not serve Zed or a terminal, and it
    stores a third-party sign-in in the sandbox.
  - A Boat key for each member. It shows Boat to users (decision 80).
  - Change nothing. It fails the goal.
- **Evidence:** on 9 November 2026 the Conductor entry of a workspace named
  `HostName 127.0.0.1`, a fixed `Port`, `User root`, and one app key. It
  turned the host key check off. The Conductor app listened on that port,
  and its outside connections used port 443. The cloud machine held one
  key named "conductor", and Conductor's runtime there named a tunnel and
  an SSH proxy. The notes are in `.context/ssh-access/notes.md`.

### Decision 214. Idle stop ends SSH work after 30 minutes

Open. Item 2 of the brainstorm. Milestone 7 waits for the answer. The
options check of 9 November 2026 changed the root question, added E and
F, graded B and C Large, and changed the recommendation from C to E.

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `docs/protocol/workspaces-and-sandboxes.md`, section "Stop
  and resume".
- **Terms:**
  - **Idle stop:** the app stops a sandbox after 30 minutes without input
    and without an agent turn (decisions 11 and 29).
  - **Relay:** the connection that the Worker holds open to carry the SSH
    bytes of one connection between the Mac and the sandbox.
  - **Input owner:** the part of the workspace object that keeps the
    newest input time. The idle stop counts from that time.
- **Background:** Input in the tabs of the app, Terminal input, and
  preview requests count as activity. An open connection does not count,
  so a forgotten tab cannot keep a sandbox running. An editor that uses
  SSH sends traffic also when nobody uses it. So its traffic does not show
  real work.
- **Problem:** Work in an editor over SSH is not input in the app. So the
  idle stop stops the sandbox after 30 minutes, while the member still
  works in the editor.
- **Impact if no action:** The editor loses its connection during work,
  and the servers that the member started stop.
- **Root question:** How does the app tell real SSH work from an editor
  that a member left open, so that only the work keeps the sandbox
  running?
- **Options:**
  - **A.** Any open SSH connection keeps the sandbox running. A forgotten
    editor on a Mac that stays awake can keep it running for days. Each
    hour costs money on the app's Boat account, and all orgs share its
    limits. Effort: Small.
  - **B.** Work over SSH counts as input: a file change in the repository,
    or a command in a shell of the sandbox. An open connection alone does
    not count. If a member reads or debugs for 30 minutes with no save and
    no command, the sandbox stops. Effort: Large.
  - **C.** B, plus a capped connection rule. An open SSH connection keeps
    the sandbox running for at most 2 hours after the last input of any
    kind. A forgotten editor stops after about 2.5 hours. Work with no
    save and no command for 2 hours stops. Effort: Large.
  - **D.** SSH does not count, and the workspace menu gets "Keep running
    for 8 hours". The member must remember to use it. If the member
    forgets the sandbox, it runs for the full 8 hours. Effort: Medium.
  - **E.** Input on the Mac counts while the Mac has an open SSH
    connection to the workspace. The Mac app reads the time since the last
    key, click, or scroll on the Mac. When that time is under one minute
    and the screen is not locked, it sends one activity frame a minute
    through the relay. An open connection and the editor's traffic do not
    count. Input in other apps on the Mac also counts, so a forgotten
    editor keeps its sandbox running while the member uses the Mac. A
    break of more than 30 minutes stops the sandbox, as for an open tab
    today. Effort: Medium.
  - **F.** B, plus a warning 5 minutes before the stop. A macOS
    notification offers Keep running, and a click counts as input. Work
    with no save and no command gets one notification every 25 minutes.
    Effort: Large.
- **Left out:**
  - Change nothing. The sandbox then stops while the member works in the
    editor, so this fails the goal.
  - The size or timing of the SSH bytes. The bytes are encrypted, and
    editors send traffic by themselves, so this fails the goal.
  - An editor extension that reports input. It does not serve Zed or a
    plain `ssh` terminal, so alone it fails the goal.
  - A longer idle time for every workspace. It breaks the 30-minute rule
    of decisions 11 and 29 for every tab, and that rule stays.
- **Wider fix:** E. It measures input where the member works, so it stays
  correct when an editor or a sandbox program changes what it sends.
- **Previous examples:** Decisions 11 and 29 set the 30-minute rule. They
  also made Terminal input and preview requests count.
  `plans/follow-ups/preview-polling-activity.md` and
  `plans/follow-ups/terminal-replies-count-as-activity.md` record traffic
  that is not the member's input and counts as activity. Boat's editor
  guide says that an open editor does not delay its auto-stop.
- **Related:** Decision 213. The Mac app holds the local end of each SSH
  connection, so option E can measure input there.
- **Recommendation:** E. It counts only the member's own input, as the
  tabs do, so no editor traffic or sandbox program can keep a sandbox
  running. The first recommendation was C.
- **Action:** ask the user, because each option changes the activity rule
  that decisions 11 and 29 set.

### Decision 215. A dropped connection ends plain SSH shells

Open. Found by the first options check of 9 November 2026. The second
options check changed the root question, added D, and changed the
recommendation from A to D. Milestone 3 waits for the answer.

- **Severity:** Medium. **Likelihood:** Common. **Effort:** Medium.
- **Source:** Design.
- **Category:** Product bug.
- **Location:** None. The relay of decision 213, and the SSH login in the
  sandbox.
- **Terms:**
  - **Relay:** the connection that the Worker holds open to carry the SSH
    bytes of one connection between the Mac and the sandbox.
  - **tmux server:** the terminal multiplexer that each workspace runs for
    the Terminal tab. Its shells keep running after their connection ends
    (decision 118).
- **Background:** Each deploy of the Worker and each Cloudflare runtime
  update close the open sockets of the Worker. A network change, a long
  sleep, or a restart of the Mac app also ends a relay. Each push to
  `main` deploys the test deployment. Cursor, VS Code, and Zed reconnect
  by themselves, and their server in the sandbox keeps running.
- **Problem:** A plain `ssh` shell ends with its connection, with each
  command that it runs. Decision 118 keeps the shell of the Terminal tab
  across such drops, because a member must not lose a running command.
- **Impact if no action:** A member who works in a plain `ssh` shell loses
  it and its commands at each deploy, network change, and Mac app restart.
- **Root question:** How does a member keep the running commands of an
  SSH shell when its connection ends?
- **Options:**
  - **A.** Accept the drop. The SSH protocol doc says that a closed
    connection ends a plain `ssh` shell. Long commands belong in the
    Terminal tab or in tmux. Effort: Small.
  - **B.** A second alias for a shell that survives drops. It opens a tmux
    session in the sandbox with `RemoteCommand`, and Copy SSH command
    copies it. Cursor and VS Code also list this alias, and it fails there,
    because OpenSSH refuses an editor's command together with a
    `RemoteCommand`. Effort: Medium.
  - **C.** A relay that resumes. The Mac app and the bridge keep their TCP
    connections open for up to 2 minutes after a drop, with the bytes that
    the other end has not confirmed. A new relay goes on from the last
    confirmed byte. It keeps nothing after 2 minutes or after a restart of
    the Mac app. Effort: Large.
  - **D.** The sandbox keeps each interactive SSH shell. A login with a
    terminal and no command opens its own session in the tmux server of
    the workspace. A later such login attaches a session with no
    connection, or opens a new one. Editor commands and file copies run as
    today, and Copy SSH command stays `ssh <alias>`. The shell shows tmux,
    and the scrollback of the member's terminal app no longer holds its
    output. A plain shell needs a command, such as `ssh -t <alias> bash -l`.
    Effort: Medium.
- **Left out:**
  - A deploy that waits for open relays. A network change or a Cloudflare
    runtime update still closes the relay.
  - A relay in its own Worker that deploys only when the relay changes. A
    network change or a runtime update still closes it.
  - A protocol that resumes by itself, such as Mosh. Each needs its own
    client, and `ssh` and the editors do not use it.
- **Wider fix:** D. It keeps the shell whatever ends the connection.
- **Previous examples:** Decision 118 keeps the Terminal shell across
  drops, with tmux.
- **Related:** Decision 213 chose the relay, which a deploy closes.
  Decision 217: a shell in the tmux server gets the folder hook of the
  Terminal tab.
- **Recommendation:** D. It keeps running commands whatever ends the
  connection, as decision 118 chose for the Terminal tab, with one alias
  and no change for the editors. The first recommendation was A.
- **Action:** ask the user, because the options trade a plain shell and
  build size against running commands, and decision 118 kept running
  commands for the Terminal tab.

### Decision 216. Check the host key of the sandbox

Open. The first options check found that this design call adds a
rejection, which the always-on rules leave to the user. The second options
check added C, D, and E, and raised the severity to High. Milestone 3
waits for the answer.

- **Severity:** High. **Effort:** Medium.
- **Source:** Design.
- **Category:** Security.
- **Location:** None. The SSH config entries, and the first frame of the
  bridge.
- **Terms:**
  - **Host key:** the key with which an SSH server proves who it is. The
    client compares it with a saved copy before it sends anything.
  - **Local port:** the port on `127.0.0.1` of the Mac where the Mac app
    takes SSH connections for one workspace.
- **Background:** Each SSH client checks the host key of the server, so
  that no other program can pose as the server. The sandbox gets a new
  host key at each resume. Conductor turns the check off: its entries set
  `StrictHostKeyChecking no` and `UserKnownHostsFile /dev/null`. Each
  program on the Mac can open the local port.
- **Problem:** Without a check, a program that takes the local port while
  the Mac app does not run can pose as the sandbox. It then reads what the
  editor sends, such as files and typed commands. A check needs the
  current host key on the Mac before each connection.
- **Impact if no action:** The entries follow Conductor, and the risk
  above stays.
- **Root question:** How does the member's SSH client know that it talks
  to the sandbox of the workspace?
- **Options:**
  - **A.** No check, as in Conductor. The entries set
    `StrictHostKeyChecking no` and `UserKnownHostsFile /dev/null`. The risk
    above stays. Effort: Small.
  - **B.** Check the host key. The bridge sends the current host key
    first. The Mac app writes it to its own known-hosts file before the
    first SSH byte reaches the client. Each entry sets
    `StrictHostKeyChecking yes` and a `HostKeyAlias`. A wrong key stops the
    connection. Effort: Medium.
  - **C.** No check, and each entry exists only while the Mac app holds
    its port. The Mac app writes the entries after it opens the ports, and
    removes them before it closes the ports, also at quit. An editor that
    retries while the Mac app does not run finds no host. A crash or a
    forced quit leaves the entries, so the risk stays until the next
    launch. Effort: Small.
  - **D.** A host key that stays the same for the life of the workspace,
    from an SSH server of the app's own on a private loopback port. The
    Mac app writes that key once, with the entry. Each sandbox runs a
    second SSH server, and a wrong key still stops the connection. It also
    removes the doubt about the provider's IPv4 forward that Milestone 3
    checks. Effort: Large.
  - **E.** The Mac app answers SSH on each local port with its own fixed
    host key, and it checks the sandbox's key itself through the relay. It
    needs an SSH library in the Mac app for each kind of request of the
    editors: shells, commands, file copies, and port forwards. A missing
    kind breaks a tool. Effort: Large.
- **Left out:**
  - A host certificate that the Worker signs at each start. B gives the
    same check with no Worker key that could pose as every sandbox.
  - `StrictHostKeyChecking accept-new`. It needs the same key write as B,
    and it does not check the first connection.
  - A warning in place of a stop. OpenSSH then still opens the session
    with the other program, so it fails the goal.
  - A Unix socket or a `ProxyJump`. Each needs an entry that a tool must
    follow, which the reason for decision 213 rejects.
- **Wider fix:** B. It covers each program that could pose as the
  sandbox, not one known program.
- **Previous examples:** None found.
- **Related:** Decision 213 chose Conductor's design, which turns the
  check off. Milestone 3 can make D the better option: if the provider's
  forward arrives from `127.0.0.1`, the plan needs an SSH server of its own
  anyway.
- **Recommendation:** B. It checks each connection in the OpenSSH client
  that Cursor, VS Code, Zed, and `ssh` use, with no change to an SSH
  server. D is better if Milestone 3 finds that the provider's forward
  arrives from `127.0.0.1`.
- **Action:** ask the user, because the check rejects connections, and
  the always-on rules leave a new rejection to the user.

### Decision 217. SSH programs can start during a disk restore

Open. Found by the second options check of 9 November 2026. Milestone 3
waits for the answer.

- **Severity:** High. **Likelihood:** Common. **Effort:** Small.
- **Source:** Design.
- **Category:** Product bug.
- **Location:** None. The design call "Never resume", and
  `plans/follow-ups/old-disk-view-after-restore.md`.
- **Terms:**
  - **Restore:** after a start from a saved snapshot, the provider shows
    all files at once and downloads their content in the background.
  - **Old view:** the earlier view of the files, at another path, that a
    program keeps when it started before the restore ended.
- **Background:** Each create and each resume starts a restore, and the
  workspace shows ready before the restore ends. The Terminal tab moves an
  early shell to the live folder at its first prompt after the end
  (decisions 147 and 149). An editor's server in the sandbox gets no such
  move. The open follow-up item `old-disk-view-after-restore.md`, graded
  High, leaves the rule for early programs to the user. Nobody has checked
  yet whether the old view shares the live files.
- **Problem:** The menu items open the editor when the workspace is ready,
  often before the restore ends. The editor's server then works in the old
  view.
- **Impact if no action:** If the old view is a separate copy, edits from
  the editor do not reach the live folder, and the member can lose work.
- **Root question:** When can an SSH session start after a create or a
  resume?
- **Options:**
  - **A.** As soon as the workspace is ready, as the Terminal tab does.
    The risk above stays until the check of the follow-up item shows that
    the old view shares the live files. Effort: Small.
  - **B.** Only after the restore ends. The relay refuses a connection
    until the Worker sees the end of the restore, and the menu items wait
    for it. A large disk can make the member wait for minutes. Effort:
    Small.
  - **C.** Early sessions, then a reset at the end of the restore. The
    relay closes each SSH connection, and the bridge ends the SSH
    processes, so the editors start a new server in the live view. Each
    early session is cut once, with its running commands. Effort: Medium.
- **Left out:** A move of each running SSH program to the live view. The
  provider gives no way to move a running program, as the follow-up item
  says.
- **Wider fix:** B. No SSH program can start in the old view, whatever the
  editor runs.
- **Previous examples:** `plans/follow-ups/old-disk-view-after-restore.md`
  records the same class for the Terminal shell, the startup script, and
  early agent turns.
- **Related:** If the check of that follow-up item shows that the old view
  shares the live files, A is safe. Decision 215: its option D puts an SSH
  shell in the tmux server, where the folder hook moves it.
- **Recommendation:** B. It removes the risk of lost work for every SSH
  program, at the cost of a wait that ends with the restore.
- **Action:** ask the user, because B adds a refusal of connections, and
  the open follow-up item leaves the rule for early programs to the user.

## Design

### Design calls

Each call below is my call, made on 9 November 2026. The user can change
each one. The two options checks of 9 November 2026 corrected the calls
on menu requests, aliases, entries, notifications, the bridge start, and
the docs. They also led to the call on workspace variables.

- **Who:** every member who can open the Terminal tab of a workspace can
  use SSH on it. SSH gives the same shell as `user`, so a stricter rule
  protects nothing.
- **Where:** the Mac app shows the SSH items in a menu on the workspace
  name in the header, and in a right-click menu on the workspace row of the
  sidebar, as in Conductor. A browser and a phone show no SSH items,
  because only the Mac app can write the SSH config and hold the port.
- **Items:** Open in Cursor, Open in VS Code, and Open in Zed show only
  when that editor is on the Mac. Copy SSH command always shows. It copies
  `ssh <alias>`.
- **Menu requests:** the Worker passes each menu choice to the Mac app
  with the same sign-in session as the page, over an SSH control socket of
  that Mac app. The device connection of Mac commands is not used, because
  each user has only one, so a second Mac would get no menu requests.
  Rejected: a launch address that the main process takes from the main
  frame, as for port previews. It gives the page no reply, so the page
  cannot show the copied alias or an error in place.
- **Keys:** the Mac app makes one Ed25519 key pair for each Mac with
  `ssh-keygen`. The private key never leaves the Mac. The Worker stores
  only the public key. Conductor also uses one app key.
- **Aliases:** each entry has a fixed alias from the city and the code of
  the workspace branch, such as `lisbon-7k2q.conductive`, and a second
  alias from the current name. The Mac app gives an alias only when no
  other entry has it. On a clash, the fixed alias adds the first six
  characters of the workspace ID, and the name alias is left out. The
  suffix comes from the product name in `docs/mockups/src/brand.ts`.
- **Entries:** the entries live in a file of their own. The Mac app adds
  one `Include` line at the top of `~/.ssh/config` at the first SSH
  action, and it changes no other line. When it cannot write that line,
  such as for a read-only file, it shows the line to add by hand. Copy SSH
  command then copies `ssh -F <entries file> <alias>`.
- **Forwarding:** each entry sets `ForwardAgent no`, `ForwardX11 no`, and
  `IdentitiesOnly yes`, so code in the sandbox cannot use the member's
  other keys. Port forwarding stays on, because the editors need it.
- **Risk:** editors forward sandbox ports to `localhost` on the Mac. A
  page from such a port runs outside the preview domain, and it shares
  cookies with other `localhost` servers on the Mac. The protocol doc
  states this risk.
- **Local port:** one fixed port for each workspace, on `127.0.0.1` and
  `::1` only. The ports open only while the Mac app runs and is signed in.
  Sign-out closes the ports and removes the entries. The Mac app also
  removes the entry and closes the port of a workspace that is archived,
  deleted, or no longer reachable. It checks its entries at each launch
  and at each SSH action.
- **Never resume:** a connection never resumes a stopped sandbox, as
  decision 11 requires for starts that the user did not ask for. Editors
  reconnect by themselves, so a resume on connect would undo each idle
  stop. The relay refuses, and the Mac app shows one notification for each
  workspace and cause, which opens the workspace. The menu items resume a
  stopped workspace first and wait until it is ready. Decision 217 says
  whether they also wait for the end of the restore.
- **Variables:** SSH shells and editor servers get the workspace
  variables, as the Terminal shell does. Each member with the Terminal tab
  already reads every env var of the org, so SSH adds no new reader.
- **Sandbox end:** the relay reaches a small bridge on a private port of
  the sandbox, as the terminal does. The bridge passes the bytes to the
  SSH server of the sandbox on `127.0.0.1:22`. The Worker adds each Mac
  key with `from="127.0.0.1,::1"`, so the key works only through the relay.
  Rejected: a TCP connection from the Worker to the public SSH port of the
  sandbox. The Mac key would then also work outside the relay and its
  access check, against the reason of decision 213. The bridge needs no
  new Boat action, because the key already has `host` and `exec`.
- **Bridge start:** the Worker writes the bridge to `/run` and starts it
  at each start of a workspace. The relay starts it when it does not run.
  A bridge that does not start does not fail the start, and SSH then says
  that it could not start. Rejected: an install in the image build, as for
  the terminal software. A workspace keeps the image software that it
  started from, also after a resume, so an existing workspace would never
  get the bridge.
- **Relay owner:** each SSH connection gets its own relay Durable Object,
  not the workspace object. So SSH traffic cannot delay chat events. The
  relay reports to the workspace object only what decision 214 needs.
- **Docs:** the SSH requirements go into a new protocol doc. The other
  protocol docs get links and the activity rule. `docs/protocol/desktop-app.md`
  also gets SSH in its "Scope" and "Permissions" sections, so that the page
  can send the SSH menu choices through the Worker. The split of the long docs stays with
  `plans/follow-ups/protocol-docs-split.md`.

### Flow

1. The page sends the menu choice to the Worker. The Worker passes it to
   the Mac app with the same sign-in session, over its SSH control socket.
   The page gets no bridge to the Mac (decision 62).
2. The Mac app makes and registers its key once. It writes the entry and
   the `Include` line, and it opens the local port of the workspace. Then
   it opens the editor at the repository folder, or returns the alias for
   Copy SSH command.
3. `ssh <alias>` connects to the local port. The Mac app opens one relay
   socket to the app hostname, with the desktop origin and its own
   sign-in session.
4. The relay checks the member, the workspace, and the sandbox with the
   shared connection reader, as the terminal does. It refuses a stopped,
   starting, or archived workspace, and a suspended owner or org. It
   starts the bridge when it does not run. It adds the Mac key once for
   each sandbox and key, and connects to the bridge, which sends the host
   key first. Decision 217 says whether the relay waits for the end of the
   restore.
5. The relay checks access again every 15 seconds. It closes within 30
   seconds after a loss of access, a sign-out, or a stop.
6. Each refusal and each close has a typed close code. The Mac app shows
   one notification for each workspace and cause.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The Mac app gets an SSH menu on the workspace name and on the sidebar row.
Read the `mockups` and `product-ui` skills first.

- [ ] Add a `mac-app/ssh` page to the Mokly catalogue, with a screen of
      the Mac app and these variants:
  - [ ] The workspace name menu, with Open in Cursor, Open in VS Code,
        Open in Zed, and Copy SSH command.
  - [ ] The right-click menu of a sidebar row, with the same items.
  - [ ] A Mac with no supported editor: only Copy SSH command.
  - [ ] A stopped workspace: a menu item resumes it, and the workspace
        shows its start steps before the editor opens.
  - [ ] SSH could not start on the cloud computer, with Try again.
  - [ ] The Mac app could not change `~/.ssh/config`, with the line to add.
- [ ] Add the notifications of the Mac app for a refused or closed SSH
      connection: stopped, no access, and could not start. Split the page
      into sub-pages when it passes five screens.
- [ ] Confirm that the browser and phone screens show no SSH items. Change
      no browser screen.
- [ ] Run `npm run mockups:check`. Smoke-test the changed pages with
      `npm run mockups:serve`.
- [ ] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

The docs state the requirements of SSH before the code. Read the
`documentation` skill first. The rules of decisions 214, 215, 216, and
217 go into the docs in the milestones that build them.

- [ ] Write `docs/protocol/ssh-access.md`: who can use SSH, the entry
      points and items, the aliases and entries, the local port, the
      relay and its access checks, the refusals, never resume, the key
      options, forwarding with its risk, and the stored data. Cite
      decision 213 and each rejected alternative.
- [ ] Add an SSH section with a link to the new doc in
      `docs/protocol/workspace-tools.md`, and under "Tools of a workspace"
      in `docs/protocol/workspaces-and-sandboxes.md`.
- [ ] Link the new doc from `docs/protocol/access-and-security.md`. In
      `docs/protocol/desktop-app.md`, name SSH in the "Scope" sentence
      about what the Mac app adds. Under "Permissions", let the page also
      send the SSH menu choices through the Worker, and nothing more. Link
      the new doc.
- [ ] Update `docs/architecture.md`: the Mac app component, the SSH relay
      on the app hostname, the Mac public keys in D1, and the protocol doc
      list. Add the SSH flow to `docs/architecture/flows.md`.
- [ ] Read `src/marketing/terms.ts` and `src/marketing/privacy.ts` in
      full. Update each sentence that restates a changed fact. Privacy
      must say that the app stores one public SSH key for each Mac.
- [ ] Add SSH to the feature list and the protocol doc list of `README.md`.
- [ ] Check each relative link of each changed Markdown file.

## Milestone 3: Sandbox bridge

Depends on: 2, decisions 215, 216, and 217

A small program in each workspace sandbox passes the bytes of the relay to
the SSH server. The terminal backend is the model for its private port and
its local password.

- [ ] Create `worker/ssh/` with a README. Write the bridge program and the
      command that writes it to `/run` and starts it. The bridge accepts
      one WebSocket for each connection on a private port, checks a local
      password, and pipes the bytes to `127.0.0.1:22`. When decision 216
      needs it, it sends the host key of
      `/etc/ssh/ssh_host_ed25519_key.pub` in its first frame.
- [ ] Start the bridge after each startup script, beside
      `startWorkspaceTerminal` in
      `worker/lifecycle/start-command-execution.ts`. A failed bridge start
      does not fail the workspace start. Do not start it in a build, a
      refresh, or a disk retention restart.
- [ ] Confirm in a real sandbox that the SSH server accepts a key with
      `from="127.0.0.1,::1"` through `127.0.0.1:22`. Confirm that it
      refuses that key from outside, also through the provider's IPv4
      forward of a sandbox without its own IPv4. If the forward arrives
      from `127.0.0.1`, stop and raise a decision for a second SSH server
      of the app on a private loopback port. Save the output under
      `.context/workspace-ssh-access/`.
- [ ] Confirm whether an SSH login and an editor's server get the
      workspace variables of `/run/ascii-secrets/env.sh`. When they do not,
      give them the variables, as the terminal launcher does.
- [ ] Test the bridge program with a local TCP server in place of the SSH
      server, as `worker/terminal/scripts.test.ts` tests the terminal
      programs. Test the start command with fake commands.
- [ ] Add one line to `image/README.md` that names `worker/ssh/` as the
      owner of the SSH bridge.

## Milestone 4: Worker relay and keys

Depends on: 3

The Worker stores the Mac public keys, passes the menu choice to the Mac,
and relays each SSH connection.

- [ ] Add `src/shared/ssh.ts`: the paths, the frames, the close codes, the
      host key frame, the menu request and its reply, and the frame size
      limit.
- [ ] Add a D1 migration for the Mac public keys: the user, the Mac, the
      key, its fingerprint, and the time. Read the `databases` skill.
- [ ] Add the SSH control socket of the Mac app, for its sign-in session.
      It needs the desktop origin, the desktop session cookie, and the
      bearer copy of that cookie, as `worker/devices/README.md` says for
      the device connection. It registers the public key and reports the
      editors of the Mac.
- [ ] Pass each menu choice from the page to the control socket with the
      same sign-in session. Give the page the editors of its Mac.
- [ ] Add the relay route on the app hostname and the relay Durable
      Object, with its binding and migration in `wrangler.jsonc`. Use the
      shared connection reader with the sandbox kind, as
      `worker/terminal/connections.ts` does.
- [ ] Add each Mac key once for each sandbox and key, to
      `/home/user/.ssh/authorized_keys`, with
      `from="127.0.0.1,::1",no-agent-forwarding,no-X11-forwarding`. Start
      the bridge when it does not run. Never touch a build sandbox.
- [ ] Apply decision 217 in the relay and in the menu items. Write its
      rule into `docs/protocol/ssh-access.md`.
- [ ] Test the relay with the fake Boat server: each refusal, the close
      after a loss of access, the key line, the bridge start, and the host
      key frame. Test the menu request with a fake control socket.

## Milestone 5: Mac app SSH service

Depends on: 4, decision 216

The main process of the Mac app holds the key, the entries, the local
ports, the control socket, and the relay sockets. Read `desktop/README.md`
first.

- [ ] Make the key pair with `ssh-keygen` under the user-data folder of
      the Mac app. Open the control socket, and register the public key.
- [ ] Write the entries file and the `Include` line. Never change another
      line of `~/.ssh/config`. Show the line to add when the file is not
      writable.
- [ ] Apply decision 216 to the entries and to the host key frame. Write
      its rule into `docs/protocol/ssh-access.md`.
- [ ] Keep one fixed local port for each workspace, saved in the
      user-data folder. Choose a new port when another program holds it,
      and rewrite the entry.
- [ ] Relay each local connection over one socket with `ws`, as the
      device connection does.
- [ ] Find the installed editors with Electron's protocol lookup. Open
      each editor at the repository folder of the workspace. Check the
      open address of each editor on a real Mac.
- [ ] Show one notification for each workspace and cause. A click opens
      the workspace.
- [ ] Close the ports and remove the entries at sign-out.
- [ ] Add logic tests for the entries file, the `Include` line, the
      aliases, and the port choice. Add an Electron test for a local
      connection through an isolated relay, as
      `tests/device-command.spec.ts` does.
- [ ] Update `desktop/README.md`.

## Milestone 6: SSH menu in the app

Tags: ui

Depends on: 1, 4

The Mac app shows the SSH menu of the mockups.

- [ ] Add the workspace name menu to
      `src/shell/workspace/WorkspaceHeader.tsx`, only in the Mac app.
- [ ] Add the right-click menu to the sidebar row in `src/shell/list/`,
      only in the Mac app. Reuse `docs/mockups/src/components/common/Menu.tsx`
      and the pattern of `src/chat/components/useTabMenu.ts`.
- [ ] Send each choice through the Worker, and copy the alias for Copy
      SSH command. Show the states of the mockups.
- [ ] Test that the browser shows no SSH items, and that each item sends
      its choice.

## Milestone 7: Activity during SSH work

Depends on: 4, 5, decision 214

The idle stop follows the answer to decision 214.

- [ ] Report the activity that decision 214 chooses to the input owner
      of the workspace object, as `worker/lifecycle/routes.md` says under
      "Input activity".
- [ ] Write the rule into "Stop and resume" in
      `docs/protocol/workspaces-and-sandboxes.md`.
- [ ] Test the chosen rule, with each signal that it counts and one that
      it does not count.

## Milestone 8: Relay drops

Depends on: 4, 5, decision 215

A dropped relay follows the answer to decision 215.

- [ ] Build the chosen option, and write its rule into
      `docs/protocol/ssh-access.md`.
- [ ] Test the chosen behaviour with a relay that closes during a session.

## Milestone 9: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Smoke-test with a local Worker, real Boat values, and a Mac app
      build: `ssh <alias>`, the three editors, a resume, a refusal for a
      stopped workspace, and the close after a removal from the org.
- [ ] Run the targeted tests and the complete gate named in `AGENTS.md`.
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

- [ ] Smoke-test SSH on the test deployment with a signed Mac app.
- [ ] Record a follow-up item for SSH from a browser on Linux or Windows.
