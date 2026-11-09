# Mac local copy

Status: Active. On branch `calummoore/conductor-terminal-sync-brainstorm`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

The Mac app gets a local copy of each cloud workspace that the user
chooses. The copy is a folder on the Mac that follows the files of the
workspace, one way, from the cloud computer to the Mac. The user runs
local tools in it, such as a shell, an editor, or a Mac-only build.
Conductor's Mac app has the same feature, and Conductor Cloud shuts down
on 20 November 2026.

The agent runner feeds the copy through the Worker (decision 150). An org
setting lists the ignored folders that also reach the Mac, with
`.context/` as the default (decision 151). Two decisions are open: where
the shell on the Mac opens (decision 152), and whether agents run Mac
commands in the copy (decision 153). This change does not cover two-way
sync, a command-line tool, a copy in a browser, or other desktop systems.
The brainstorm notes are in `.context/local-terminal-sync/notes.md`.

Decision numbers continue the sequence of
`plans/boat-native-remote-workspaces.md`. Its highest number on
`origin/main` was 149 on 9 November 2026. Check for a clash before the
merge.

Contract owners:

- [Mac app](../docs/protocol/desktop-app.md).
- [Workspaces and sandboxes](../docs/protocol/workspaces-and-sandboxes.md).
- [Access and security](../docs/protocol/access-and-security.md).
- [Agent tools](../docs/protocol/agent-tools.md), unless decision 153
  chooses A.
- The [architecture doc](../docs/architecture.md) and its
  [flows](../docs/architecture/flows.md).
- The [Mac app README](../desktop/README.md), the
  [agent runner README](../runner/README.md), and the README of each
  Worker area that changes.

## Design

### How Conductor does it

The agent read these facts on 8 and 9 November 2026, from Conductor's
program on the VM of this workspace and from the user's Mac. They are
observations, not requirements.

- A program in the VM watches the repository. It lists the files with
  `git ls-files --cached --others --exclude-standard`. A built-in
  exception adds `.context/`.
- It sends a small `file-sync:changed` signal over its own WebSocket
  channel. The Mac then pulls a full or a partial snapshot, and the
  changed files.
- The Mac keeps one partial clone for each repository. Each synced
  workspace is a git worktree of that clone, at the commit of the VM,
  with no branch checked out.
- The git config of the Mac is the Mac's own. The git settings and hooks
  of the VM never reach the Mac.
- `node_modules` does not reach the Mac. The user confirmed this in a
  test of their own.
- Conductor also keeps an SSH key for each Mac. The VM gets the key at
  start. SSH reaches the VM through Conductor's own proxy. The sync does
  not use SSH.

### Components

- **Agent runner:** serves the sync feed on a private port of the cloud
  computer, behind a password for each workspace, as the terminal does.
  The feed has four parts:
  - a manifest: each path, its kind, its git blob ID, its size, its
    executable bit, and the target of each link
  - the changes since a tree revision of one runner stream, keyed to the
    revisions that the runner already sends as `files.changed`
  - the bytes of the files that the Mac asks for, many files in one
    response
  - a git bundle with the commits and trees of the branch, and the blobs
    that the Mac cannot rebuild from the synced files
- **Worker:** a sync route on `app.conductive.build`, behind the app
  gate. It checks the session of the Mac app, the membership, and the
  suspension of the user. It forwards to the private port of the runner.
  It stores no file content.
- **Workspace Durable Object:** sends the folder list of the org to the
  runner at each connect and after each change. It pushes `files.changed`
  to the workspace connection of the Mac app, as it does to a tab.
- **Mac app main process:** the sync engine. It keeps the clones and the
  worktrees, writes the files, and reports the state of each copy through
  the device connection.
- **Web app:** the switch, the state of the copy, This Mac, and the org
  setting. A browser shows no switch. The page has no bridge, so it
  controls the copy only through the Worker, as Mac command approvals do.

### Design calls

Each call below is the agent's call, with its date and its reason. The
user can change any of them.

1. The Mac app owns the copy. Reason: Conductor's feature lives in its
   Mac app, and our Mac app already signs in and connects the Mac.
   (8 November 2026)
2. The copy goes one way. The cloud version wins for each synced file,
   also after a local edit. Reason: the user asked for Conductor's
   one-way sync. (8 November 2026)
3. The copy holds the files that git sees, the folders of decision 151,
   and the git history. Reason: Linux builds in `node_modules` do not run
   on macOS, and ignored files can hold secrets. (8 November 2026,
   changed by decision 151 on 9 November 2026)
4. Local files that the cloud computer never had stay. This includes
   ignored local files, such as a local `node_modules`. The Mac deletes
   only a file that the sync wrote and that the cloud computer deleted.
   In a folder of the list of decision 151, the cloud version wins, as
   for every synced file. Reason: local installs and builds must survive
   each sync, and an admin who lists a folder chooses the cloud version.
   (8 November 2026, changed on 9 November 2026 for the options check)
5. Sync is off by default. Each workspace has a switch, and the Mac saves
   it. Reason: the user chooses where code is copied. The saved choices
   of Mac commands also stay on the Mac. (8 November 2026)
6. After a loss of access or an archive, the sync stops within
   30 seconds, as decision 70 says for tabs. The folder stays, marked as
   no longer synced. Reason: a delete can lose local files, and the user
   could copy the files while they had access. (8 November 2026)
7. While the cloud computer is stopped, the copy pauses. It catches up
   at the next start. The sync is not activity, as the stop rule says for
   open connections. Reason: a copy must not keep a cloud computer
   running. (8 November 2026)
8. The Mac keeps one git clone for each repository. Each copy is a git
   worktree of that clone, at the commit of the cloud computer, with no
   branch checked out. Reason: one download of the history serves every
   workspace of the repository, as in Conductor. (9 November 2026)
9. The Mac gets the git history only from the cloud computer, in a git
   bundle. The Mac app holds no GitHub token. The clone may name GitHub
   as `origin`, so that the user's own git can load old file contents
   when it has access. Reason: a GitHub token on the Mac changes the
   secrets rules, and the user may have no local access to GitHub.
   (9 November 2026)
10. The feed never sends a path inside `.git`. The Mac never writes
    inside `.git` from the feed. Reason: settings such as
    `core.fsmonitor` in `.git/config` run commands, and sandbox code is
    untrusted. (9 November 2026)
11. A list entry that names `.git`, an absolute path, or a path outside
    the repository stays in the list with a warning. The feed skips it.
    Reason: the always-on rules prefer a warning to a new rejection.
    (9 November 2026)
12. The sync skips a file over 100 MiB, or 104,857,600 bytes, and lists
    it in the state of the copy. Reason: GitHub refuses such files, so
    they are build output or data. (9 November 2026)
13. When two paths differ only in case or in Unicode form, the Mac keeps
    the first path in sort order. It lists the others in the state of the
    copy. Reason: a Mac disk treats such names as one name.
    (9 November 2026)
14. The Mac writes a link only when its target stays inside the copy. It
    lists the other links in the state of the copy. It writes the
    executable bit and no other file mode. (9 November 2026)
15. The copy lives at
    `~/Conductive/<org>/<repository>/<last part of the branch name>`. A
    short suffix follows only when two copies clash. Reason: the branch
    name never changes, so the folder stays readable and stable.
    (9 November 2026)
16. One folder list for each org applies to every repository of the org.
    Only an admin changes it, as decision 57 says for the other org
    settings. The list starts as `.context/`. (9 November 2026)
17. The list sits on the Repositories tab of the org settings. The mockup
    milestone checks this place. (9 November 2026)
18. The Mac app opens one workspace connection for each synced workspace,
    with its own session, as a tab does. The access check of decision 70
    applies to it. Reason: the copy then follows `files.changed` and loses
    access as a tab does. (9 November 2026)
19. After a start from a saved snapshot, the feed says that it is not
    ready until the app sees the end of the restore (decision 149). It
    then sends a full manifest. Reason: before that end, the runner sees
    an old view of the disk. (9 November 2026)
20. Each Mac syncs its own copies while its app is signed in. Only the
    Mac with the device connection reports its state to the page. Reason:
    each user has one device connection at a time. (9 November 2026)
21. Stop syncing keeps the folder. Remove deletes the folder after a
    question that names it. (9 November 2026)
22. The feed sends many files in one response. Reason: one request for
    each file gives about 2,500 requests, each with its own access check,
    for a first copy of this repository. (9 November 2026, from the
    options check)
23. The feed keys its changes to the runner stream and the tree revision.
    Reason: a new runner stream starts again at revision 1.
    (9 November 2026, from the options check)

## Decisions

The options check of 9 November 2026 ran over decisions 150 to 153. Its
report is in `.context/mac-local-copy/options-check.md`.

### 150. Choose how files reach the Mac

- **Severity:** Medium. **Effort:** Large.
- **Source:** Design. Brainstorm item 1, on 8 and 9 November 2026.
- **Category:** Docs or spec.
- **Location:** None.
- **Terms:**
  - **rsync and Mutagen:** two standard sync programs. Each can make a
    folder an exact one-way copy of another folder over SSH.
  - **Git bundle:** one file that holds git commits. `git fetch` can
    read it.
- **Background:**
  - Each workspace has its own cloud computer. Agents and other org
    members can run any code there.
  - Today, Mac commands are the only way from a cloud computer to a Mac.
    The Mac asks first (decision 62).
  - `files.changed` events already mark each changed path. Runner file
    reads stop at 5 MiB and carry no file mode.
  - Boat gives each sandbox a public SSH address. Its docs do not say how
    to limit a key to one sandbox.
  - All options share two assumptions from the task message: the copy
    goes one way, and the Mac app owns it.
- **Problem:** The files stay in the cloud computer. So local tools cannot
  run on the agents' live work.
- **Impact if no action:** Users who move from Conductor Cloud lose this
  feature. A Mac-only check needs a push and a manual fetch.
- **Root question:** How does a Mac user get the live files of a cloud
  workspace into a folder on the Mac?
- **Options:**
  - **A.** SSH straight to Boat's public SSH address. The Worker checks
    access and adds a key for this Mac to the cloud computer. After each
    `files.changed` event, the Mac app runs a bundled rsync or Mutagen.
    Risk: the traffic does not go through the Worker, so the 30-second
    loss of access in decision 70 depends on key removal. Risk: a bug in
    the sync program can let the cloud computer write outside the folder.
    rsync before 3.4.0 had such bugs. Risk: a copied `.git/config` runs
    commands on the Mac, unless the sync skips `.git`. Effort: Large.
  - **B.** A runner feed through the Worker, as Conductor's sync works.
    The runner adds content IDs, file modes, files over 5 MiB, and a git
    bundle. A Worker route checks access and forwards to a private port.
    The Mac app checks each path and writes the copy. The Mac builds its
    own `.git` from the bundle. Cost: the most new code, a sync engine on
    the Mac. Effort: Large.
  - **C.** SSH through the Worker, as Conductor's SSH works. The Mac app
    sends SSH inside a connection to the Worker, and rsync or Mutagen
    runs in that tunnel. Every byte passes the Worker's checks. Risk: the
    same sync program bugs and the same `.git/config` problem as A.
    Effort: Large.
  - **D.** Added by the options check: a git-native feed on the route of
    B. The runner records the live files and the listed folders as a git
    commit that no branch holds, in a private object folder. The Worker
    forwards a git bundle with only the objects that the Mac lacks. The
    Mac app checks the paths, links, and sizes of the new tree, and git's
    own checkout updates the copy. Cost: both sides must turn off the
    filters and line-ending rules of the repository, or the bytes on the
    Mac can differ. Both sides must also delete old snapshot commits.
    Effort: Large.
- **Left out:**
  - Copying every ignored file: Linux builds in `node_modules` do not run
    on macOS, and files such as `.env` can hold secrets.
  - A network drive, such as SSHFS: builds and file watchers are slow or
    broken over a mount.
  - Uncommitted work on a hidden GitHub ref: the cloud computer has a
    GitHub token only while a turn runs. So edits between turns, such as
    edits in the cloud Terminal, never reach the Mac.
  - Boat's file routes: they add a Boat call for each file and give
    nothing that the runner does not.
  - A fetch of the pushed branch: it shows only pushed commits.
  - A command-line tool in place of the Mac app: the task asks for the
    feature in the Mac app.
  - Two-way sync: the task asks for Conductor's one-way sync.
- **Wider fix:** None. This is a new feature, not a class of defects.
- **Previous examples:** Conductor's sync, as the Design section says.
  The rsync advisory of 14 January 2025 lists two bugs that let a hostile
  server write outside the target folder.
- **Recommendation:** B. Only with B does our own code decide what
  reaches the Mac's disk, and the git settings of the cloud computer stay
  off the Mac. The options check recommended D, because git's checkout
  and one bundle replace a new writer and many requests. The agent keeps
  B, because B sends the exact bytes, so no filter or line-ending rule of
  the repository can change them. Design call 22 removes the many
  requests.
- **Chosen:** B, by the user on 9 November 2026, as recommended. The
  options check added option D after that choice. The agent reported D
  to the user on 9 November 2026. B stays unless the user changes it.

### 151. Choose which ignored files reach the Mac

- **Severity:** Low. **Effort:** Large.
- **Source:** Design. Brainstorm item 4, on 9 November 2026.
- **Category:** Docs or spec.
- **Location:** None.
- **Terms:**
  - **`.context/` folder:** the scratch folder where the user's agent
    rules put reports, screenshots, and logs. `.gitignore` excludes it.
    The product does not use it anywhere else.
- **Background:** Conductor syncs the files that git sees, and also
  `.context/`. The first design call skipped every ignored file, because
  of Linux builds and secrets.
- **Problem:** Without an exception, the agents' reports and screenshots
  in `.context/` do not reach the Mac. Conductor sends them.
- **Impact if no action:** The user reads the agents' reports and
  screenshots in the app, not in a local editor or Finder.
- **Root question:** Which files that git ignores should reach the Mac?
- **Options:**
  - **A.** None. The copy holds only the files that git sees. Effort:
    Small.
  - **B.** Also `.context/`, as in Conductor, as a fixed rule of the
    product. Effort: Small.
  - **C.** Also the ignored folders on a list in the org settings, with
    `.context/` as the default. It needs a migration, an API, a screen
    with its mockup, and a new runner input. Effort: Large.
  - **D.** Added by the options check: a file in the repository, such as
    `.conductive/sync`, lists the ignored folders. Without the file, only
    `.context/` goes. Cost: each branch, and so each agent, can change
    the list without an admin. It is the first product setting in a
    repository. Effort: Medium.
  - **E.** Added by the options check: each Mac app keeps the list of its
    user in its private folder, with `.context/` as the default. Cost: an
    admin cannot keep a folder off the Macs, and each Mac needs its own
    setup. Effort: Medium.
- **Left out:**
  - Every ignored file: Linux builds in `node_modules` do not run on
    macOS, and files such as `.env` can hold secrets.
  - An automatic rule, such as small text files: a `.env` file is a small
    text file, so the rule cannot keep secrets out.
- **Wider fix:** None. This is a new feature, not a class of defects.
- **Previous examples:** Conductor synced
  `.context/local-terminal-sync/notes.md` from this workspace to the
  user's Mac, but not its empty `.context/todos.md`.
- **Recommendation:** C, as the user chose. It keeps the list with the
  other sandbox settings that only an admin changes. The first
  recommendation was B. The options check moved it to C.
- **Chosen:** C, by the user on 9 November 2026. The agent had
  recommended B.

### 152. Choose where the Mac shell opens

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design. Brainstorm item 2, on 8 November 2026.
- **Category:** Security.
- **Location:** `docs/protocol/desktop-app.md`, section Permissions.
- **Terms:**
  - **node-pty:** a native Node module that runs a shell for a terminal
    screen. The Mac app must build and sign it for both Mac processor
    types.
- **Background:** Conductor's Mac app shows a local terminal next to the
  cloud one. In our Mac app, the page has no bridge, and the app opens no
  second window. So the page cannot start a shell on the Mac.
- **Problem:** A built-in Mac terminal needs a channel from the page to a
  shell on the Mac. The Mac app does not allow that channel today.
- **Impact if no action:** The user opens a terminal app and goes to the
  folder of the copy by hand.
- **Root question:** Where does the user get a shell on the Mac, in the
  local copy?
- **Options:**
  - **A.** Open in Terminal. A button in the workspace and a menu item
    open the copy in the user's own terminal app, such as Terminal,
    iTerm2, or Ghostty. The button's request goes through the device
    connection, so the page gets no bridge. The shell opens outside the
    app window. Effort: Medium.
  - **B.** A built-in Mac terminal tab next to the cloud Terminal tab, as
    in Conductor. node-pty runs the shell. A bridge for the terminal
    only, or a separate native view over the panel, shows it. The native
    view also needs the place of the panel and the open tab from the
    page, which is a channel too. It changes decision 62 and needs its
    own security review. Effort: Large.
  - **C.** Added by the options check: no shell entry. The state of the
    copy shows its folder and Show in Finder, and the user opens a
    terminal there. Cost: more steps for each shell, and nothing like
    Conductor's built-in terminal. Effort: Small.
  - **D.** Added by the options check: Open in Terminal, as A, but the
    button never goes through the Worker. It is a link to a fixed
    address that the main process catches, as it already catches the
    sign-in and port preview addresses. The menu item reads the
    workspace from the address of the window. Cost: the Navigation rules
    of the Mac app change, and the page cannot show the result. Effort:
    Medium.
  - **E.** Added by the options check: a built-in terminal in its own
    window of the Mac app. That window loads only a bundled terminal page
    with a bridge to its shell. The web app page keeps no bridge. Cost:
    node-pty, a change of the rule that the Mac app opens no second
    window, and its own security review. Effort: Large.
- **Left out:** A Mac terminal that the Worker relays, because the server
  could then type into a shell on the Mac. Mac commands ask for each
  command to stop exactly that.
- **Wider fix:** None. This is a new feature, not a class of defects.
- **Previous examples:** The Mac app doc rejected a preload script for
  the window buttons, because it is a bridge. Conductor's Mac app has a
  built-in local terminal.
- **Recommendation:** D. It gives the entry of A without a Worker route
  or a device message, so no message from the server can open a shell
  on the Mac. The first recommendation was A. The options check moved it
  to D.
- **Action:** ask the user, because the user asked for Conductor's
  feature, which has a built-in terminal, and D, B, and E each change a
  rule of the Mac app.
- **Status:** Open. It blocks the TODOs that name it.

### 153. Let agents run Mac commands in the copy

- **Severity:** Low. **Effort:** Medium.
- **Source:** Design. Brainstorm item 3, on 8 November 2026.
- **Category:** Docs or spec.
- **Location:** `docs/protocol/agent-tools.md`, section Mac commands.
- **Background:** Each Mac command names the folder where it runs.
  Agents do not know where the copy is. Conductor's Mac command tool also
  starts in the home folder by default.
- **Problem:** An agent cannot run a Mac-only check on its own files
  without the path. The copy can also lag behind the agent's last edit.
- **Impact if no action:** The user gives the agent the path. A command
  can then run on files that are a few seconds old.
- **Root question:** How does an agent run a Mac-only check on the
  current files of its workspace? The options check wrote this question,
  because the goal is a check that sees the agent's last edit.
- **Options:**
  - **A.** No change. The user tells the agent the path. Effort: Small.
  - **B.** When the sender's Mac has a copy, the Mac command tool gives
    the agent its folder. A relative folder then means a folder in the
    copy. The command runs only when the copy has the latest file
    revision. Effort: Medium.
  - **C.** Added by the options check: as B, but the command waits for
    the agent's own edits. Before the request goes to the Mac, the runner
    scans the repository once. The request carries the tree revision of
    that scan. The command runs when the copy reaches that revision.
    Cost: one more runner command, and one scan before each request.
    Effort: Medium.
  - **D.** Added by the options check: as C, but when the sender's Mac
    has no copy, Allow also turns on the copy of this workspace. Cost: an
    approval then also copies code to the Mac, and a first copy can pass
    the time limit. Effort: Large.
  - **E.** Added by the options check: the Mac app makes a temporary copy
    for each command from its clone, runs the command, and deletes the
    copy. Cost: each check installs its dependencies again, so a check
    takes minutes longer. Effort: Large.
- **Left out:** A check on a Mac runner in CI, because it needs a push
  and never sees uncommitted work.
- **Wider fix:** None. This is a new feature, not a class of defects.
- **Previous examples:** Conductor's Mac command tool names no synced
  folder.
- **Related:** It builds on decision 150, whose option B tracks the file
  revision of each copy.
- **Recommendation:** C. With B, the latest revision can miss the agent's
  last edit, because the runner reports an edit only after 100 ms with no
  file changes and one scan. The first recommendation was B. The options
  check moved it to C.
- **Action:** ask the user, because C adds a rule to Mac command requests
  that no requirement covers.
- **Status:** Open. It blocks the TODOs that name it.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

Draw the local copy in the Mac app and its org setting. The Mac app
screens use `MacScreen`. The org setting has phone and desktop variants.

- [ ] Draw the switch and the state of the copy on the workspace screen
      of the Mac app: off, catching up, up to date, paused while the
      cloud computer is stopped, stopped after a loss of access, and an
      error with Try again. Show the folder and Show in Finder.
- [ ] Draw the list of skipped files in the state of the copy: too
      large, a clash of names, and a link that leaves the copy.
- [ ] Add the local copies to This Mac on the account page: each copy
      with its workspace, its folder, its state, Stop syncing, and
      Remove. Draw the question of Remove.
- [ ] Draw the folder list on the Repositories tab of the org settings,
      for an admin and for a member, with the warning of an entry that
      cannot sync.
- [ ] Show that the workspace screen in a browser has no switch.
- [ ] Draw the shell entry that decision 152 chooses. Waits for decision
      152.
- [ ] Draw a Mac command card that runs in the copy, as decision 153
      chooses. Waits for decision 153. Skip it when decision 153 chooses A.
- [ ] Add a user flow: turn on the sync, see the copy catch up, and open
      the shell. The shell step waits for decision 152.
- [ ] Run `npm run mockups:check`. Smoke-test the changed pages.
- [ ] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

Write the requirements and the decisions in force for the work below.

- [ ] Add a Local copy section to `docs/protocol/desktop-app.md`: the
      switch, one way, what reaches the Mac, the files that stay, the
      skipped files, a loss of access, an archive, a stop, This Mac, and
      Remove. Give decisions 150 and 151 with their rejected options.
- [ ] Update the Scope and Permissions sections of
      `docs/protocol/desktop-app.md`. The page still has no bridge. It
      controls the copy through the Worker.
- [ ] In `docs/protocol/workspaces-and-sandboxes.md`, add the folder
      list to the org settings that only an admin changes. State its
      default and the warning of an entry that cannot sync. State that
      the sync is not activity.
- [ ] In `docs/protocol/access-and-security.md`, state the sync route,
      its gate, the private port and its password, the paths that never
      leave the cloud computer, and the loss of access.
- [ ] Add the local copy to `docs/architecture.md` and to
      `docs/architecture/flows.md`: the components, the flow, and a row
      in Where data lives.
- [ ] State the shell entry of decision 152. Waits for decision 152.
- [ ] Update `docs/protocol/agent-tools.md` for the option of decision
      153. Waits for decision 153. Skip it when decision 153 chooses A.
- [ ] Check each relative link of each changed Markdown file.

## Milestone 3: Sync feed in the runner

Depends on: 2

The runner serves the feed. It reuses its watcher, its scan queue, and
its tree revisions.

- [ ] Serve the feed on a private port with a password for each
      workspace, as the terminal does. Install and enable it in the org
      image build.
- [ ] Serve the manifest of the files that git sees and of the listed
      folders: path, kind, git blob ID, size, executable bit, and link
      target. Skip each listed entry that cannot sync.
- [ ] Serve the changes since a tree revision of one runner stream.
      Answer with a full manifest for another stream or for a revision
      that is too old.
- [ ] Stream the bytes of the files that the Mac asks for, many files in
      one response, each up to 100 MiB. Refuse a path inside `.git` and a
      path outside the repository.
- [ ] Serve a git bundle with the commits and trees of the branch, and
      the blobs that the Mac cannot rebuild from the files.
- [ ] Answer "not ready" until the end of the restore after a start from
      a saved snapshot. Then send a full manifest.
- [ ] Take the folder list from the workspace Durable Object at each
      connect and after each change.
- [ ] Test each requirement once, at the runner's HTTP boundary, with a
      real git repository in a temporary folder.
- [ ] Update `runner/README.md` and its event limits doc when they
      change.

## Milestone 4: Worker routes and the folder setting

Depends on: 3

- [ ] Store the folder list of each org in D1, with `.context/` as the
      default. Read the `databases` skill before you add the migration.
- [ ] Add the API to read the list for each member and to change it for
      an admin. Keep the existing body limits. Add no new rejection.
- [ ] Send the list to the runner at each connect and after each change.
- [ ] Add the sync route on `app.conductive.build`. Check the session of
      the Mac app, the membership, and the suspension. Forward to the
      private port of the runner with its password. Stream the bodies.
- [ ] Count no sync request as activity.
- [ ] Add the sync messages to the device contract: turn the sync of a
      workspace on or off, and report the state of each copy.
- [ ] Test the route at its HTTP boundary with the fake Boat and runner
      servers: a member, a non-member, a suspended user, and an archived
      workspace.
- [ ] Update the README of each Worker area that changes.

## Milestone 5: Sync engine in the Mac app

Depends on: 4

- [ ] Keep one git clone for each repository and one worktree for each
      copy, at the commit of the cloud computer, with no branch checked
      out. Build `.git` from the bundle only.
- [ ] Write each file to a temporary name, then rename it. Never follow
      a link while it writes. Check each path against the root of the
      copy. Check the bytes against the blob ID.
- [ ] Apply the skip rules for size, name clashes, and links, and list
      each skipped file in the state of the copy.
- [ ] Delete only a file that the sync wrote and that the cloud computer
      deleted. Keep local-only files and ignored local files.
- [ ] Follow `files.changed` through one workspace connection for each
      copy. Pause while the cloud computer is stopped. Stop after a loss
      of access, and mark the folder.
- [ ] Save the switch of each workspace for each account, in the private
      folder of the app, as the Mac command settings are saved.
- [ ] Report the state of each copy through the device connection, and
      take the switch messages from it.
- [ ] Test each requirement once with a fake feed: a hostile path, a
      link that leaves the copy, a name clash, a file over 100 MiB, a
      local edit that the cloud version replaces, a local-only file that
      stays, and a local `node_modules` that stays.
- [ ] Update `desktop/README.md`: a Local copy section and its key code.

## Milestone 6: Shell entry on the Mac

Depends on: 5, and decision 152

- [ ] Build the main process side of the shell entry that decision 152
      chooses. Waits for decision 152.
- [ ] Test it at the level that decision 152 needs. Waits for decision
      152.

## Milestone 7: Mac commands in the copy

Depends on: 5, and decision 153

Build the option that decision 153 chooses. Skip this milestone when it
chooses A. The TODOs below hold for its recommended option, C.

- [ ] Give the agent the folder of the copy on the sender's Mac. Resolve
      a relative folder inside the copy. Waits for decision 153.
- [ ] Before the request goes to the Mac, scan the repository once, and
      put the tree revision of that scan in the request. Waits for
      decision 153.
- [ ] Run the command only when the copy has that revision. Say in the
      result when the copy cannot catch up within the time limit of the
      command. Waits for decision 153.
- [ ] Test these rules at the boundary of the Mac command tool. Waits
      for decision 153.

## Milestone 8: Screens

Tags: ui

Depends on: 1, 5, 6, 7

- [ ] Build the switch and the state of the copy on the workspace screen
      of the Mac app, as the mockups draw them.
- [ ] Build the local copies in This Mac, with Stop syncing and Remove.
- [ ] Build the folder list on the Repositories tab of the org settings.
- [ ] Build the shell entry of decision 152. Waits for decision 152.
- [ ] Show the folder of the copy on a Mac command card. Waits for
      decision 153. Skip it when decision 153 chooses A.
- [ ] Test the screens with the rendered components and one Electron
      test of the switch.

## Milestone 9: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run the targeted tests and the complete gate, `npm run check`.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
- [ ] Check the decision numbers against `origin/main` for a clash.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives the decisions and the
      design calls of this plan with their dates, a permalink to this
      plan, and the follow-up items that the change adds.

## Post-merge follow-up (non-blocking)

- [ ] On a real Mac with a deployed cloud computer, turn on the sync of a
      workspace of this repository. Change a file in the cloud. Check
      that the copy follows within a few seconds.
- [ ] In that copy, run the packaged Mac app tests,
      `npm --prefix desktop run test:packaged`.
