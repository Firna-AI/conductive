# Open a workspace file from the terminal

Status: Active. On branch `calummoore/open-mockup-file-n5l4`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

A member who types `open <path>` in a terminal of a workspace wants the
app to show that file, as `open` does on a Mac. An HTML file then shows its
rendered Preview. Today `open` in the cloud computer is `xdg-open`. It finds
no display in a terminal shell, so it opens nothing for the member. Cal
asked for this on 26 November 2026, with the example
`open docs/mockups/index.html`.

The chosen approach, decision 1 C: a new `open` command asks the terminal
bridge through tmux. Only the screen of the viewer who typed last in that
terminal opens the file tab. Text that a program prints cannot trigger it,
because the screen accepts a bridge message only with the nonce of its
connection. The command also prints one line with a link to the file tab,
so older apps, other viewers, and the plain tmux client still get a press.
An `open` that an agent runs opens no file, decision 2 A. It runs the
system `open` when a display is set, and otherwise prints a plain line
with a hint to name the file as `@<path>`. This change does not open web addresses or folders by
themselves, and it does not change `xdg-open`.

Contract owners:

- `docs/protocol/terminal-open.md`, a new protocol doc that
  [Terminal](../docs/protocol/terminal.md) will link.
- The [terminal README](../worker/terminal/README.md), for the tmux
  contract between the command and the bridge.
- The [Terminal screen README](../src/terminal/README.md).
- The [image README](../image/README.md) and [Install](../image/install.md),
  for the command that a release installs.
- The public guide
  [Terminal and previews](../src/marketing/docs/terminal-and-previews.md).

The brainstorm report is `.context/terminal-open/approaches.md`. The
options check report is `.context/terminal-open-command/options-check.md`.

## Decisions

### 1. No terminal command opens a workspace file

- **Severity:** Medium. **Effort:** Large.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** None. The change touches `image/install-system.sh`,
  `worker/terminal/bridge/`, `src/shared/terminal-bridge.ts`, and
  `src/terminal/`.
- **Terms:**
  - **Viewer:** one browser tab or Mac app window that shows a terminal. Many members and tabs can view one shared terminal.
  - **Terminal bridge:** the program between each viewer and the shared tmux session. It sends private messages to its screen with a nonce (`src/shared/terminal-bridge.ts:8-11`).
- **Background:** Web addresses in the terminal output are links, and a link to an app page opens in the app (`src/shell/workspace/tools/terminal-links.ts:28-36`). A file tab has the address `files/preview/<path>` under the workspace (`src/shell/workspace/files/files-address.ts:32`). No command asks the app to show a file.
- **Problem:** `open <path>` runs `xdg-open`, which opens nothing for the member.
- **Impact if no action:** Each look at a page that a command built takes a search in All files.
- **Root question:** How does a member in a workspace terminal make the app show a workspace file, such as an HTML preview, with one command?
- **Options:**
  - **A.** `open` prints a link to the file tab, and the member presses it. No new trust. Cost: one press after Enter. Effort: Medium.
  - **B.** `open` prints a private escape sequence, and each viewer opens the file. Cost: any printed text can open a file and run its page with no press, and every viewer gets it. Effort: Medium.
  - **C.** `open` asks the terminal bridge, and only the viewer who typed last opens the file. Printed text cannot trigger it. Cost: new bridge state and tests with a real tmux. Terminals only. Effort: Large.
  - **D.** `open` sends a request through the agent runner and the Worker, which picks one app tab. It can also serve agents. Cost: a new runner message, Worker routing, a delivery with no replay. Effort: Large.
- **Left out:** No change, path links in the output, an app that reads the typed line, a prompt hook, a browser on the cloud computer's desktop, and the Mac app that opens the file on the Mac. The brainstorm report gives each reason.
- **Wider fix:** None. This is a new feature.
- **Previous examples:** Gitpod's `gp open`, and VS Code's remote `code` command. In this repository, the terminal links and the `gh` wrapper.
- **Recommendation:** C. The file opens on Enter for the member who ran the command, and printed text cannot trigger it.
- **Decided:** C. Cal chose it on 26 November 2026.

### 2. An agent's `open` shows no file

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** None.
- **Background:** Agents run commands in their own shells, not in a terminal of the app. The chat shows no output of an agent's command (`runner/sdk-helper/src/providers/tool.ts:43-67`). An agent can already name a file as `@path` in its answer, and the chat shows a file chip that opens the file tab. Today `DISPLAY=:0 open page.html` shows a page in Chrome on the cloud computer's desktop, which the agents use with their computer tools.
- **Problem:** Only option D of decision 1 can show a file to a member when an agent runs `open`.
- **Impact if no action:** None for this change. A later change can add it.
- **Root question:** What must `open <path>` do when an agent runs it, outside an app terminal?
- **Options:**
  - **A.** No file opens. The agent's `open` prints the line and opens nothing. Effort: Small.
  - **B.** The file opens for the member who sent the turn, through option D of decision 1. Cost: a tab can open while that member reads something else. Effort: Large.
  - **C.** No file opens. Outside an app terminal, `open` prints a plain line with no escape codes. The line says that the file did not open, and that `@<path>` in a reply shows it to the member. Cost: a second output form. Effort: Small. Added by the options check.
  - **D.** No file opens. Outside an app terminal, when `DISPLAY` is set, `open` runs the system `open`, so an agent still shows a page on the desktop. Cost: a second path to test. Effort: Small. Added by the options check.
- **Left out:** A file that opens for every member: the other members did not ask. A request through the shared tmux socket: it reaches the last typist of a terminal, not the sender of the turn. A chip that the runner adds when an agent runs `open`: like B, it needs a runner call and a chat event, and C gets the same press from the reply.
- **Wider fix:** None.
- **Previous examples:** None found.
- **Recommendation:** C with D. The options check changed it from the first recommendation, A. The line of A reaches only the model, with raw escape codes, and D keeps today's desktop path.
- **Decided:** A, no file opens. Cal chose it on 26 November 2026. C and D keep that answer, so I apply them as design calls. The design below gives them.

## Design

Each line below is my call, made on 26 November 2026, with its reason.
The options check found the faults that the request, the viewer, and the
older-software lines now fix.

- **The command.** A release links `/usr/local/bin/open` to a small shell
  wrapper. The wrapper removes `NODE_OPTIONS` and `NODE_PATH`, as the
  attach program does (`worker/terminal/scripts.ts:137`). Then it runs
  `worker/terminal/bridge/open.ts` with the private Node of the bridge.
  `/usr/local/bin` comes before `/usr/bin` in the `PATH`, as for the `gh`
  wrapper (`image/install-system.sh:11`). Reason: the command and the
  bridge then share one TypeScript contract and one test harness with a
  real tmux.
- **`xdg-open` stays.** Reason: `DISPLAY=:0 xdg-open` opens a page on the
  desktop of the cloud computer. A replacement would remove that path.
- **An app terminal.** A shell is in an app terminal when `TMUX` names the
  socket `/run/conductive-terminal/tmux.sock`. Each terminal is its own
  tmux session (`worker/terminal/README.md:140-144`).
- **Outside an app terminal.** When `DISPLAY` is set, the command runs the
  system `open` with the same arguments, decision 2 D. Otherwise it prints
  a plain line for each file, with no escape codes. The line says that the
  file did not open, and that `@<path>` in a reply shows it, decision 2 C.
- **The repository folder.** The command reads it from
  `/run/conductive/repository` first, as the bridge does, and else from
  `CONDUCTIVE_REPOSITORY_DIR`. Reason: an older shell can hold the old
  folder after a repository change.
- **Paths.** The command takes one or more paths. It resolves each from the
  current folder, with links resolved.
  - A file inside the repository folder opens.
  - A missing file prints an error. A path outside the repository folder,
    or a folder, prints an error too. Reason: no file tab shows such a
    path, and no address names an open folder.
  - The command exits with code 1 when one path failed, as macOS `open`
    does.
- **Options.** `--help` prints the usage. Each other option prints an error
  and exits with code 1. Reason: the macOS options, such as `-a`, have no
  meaning here.
- **Web addresses.** `open <address>` prints the address and opens
  nothing. The terminal links rules then make it a link. Reason: a browser
  blocks a new tab without a press. A local address could open the Preview
  tool, but that widens the request, so it stays out of this change.
- **The line.** In an app terminal, the command prints one line for each
  file, with the path as an OSC 8 link to its file tab, from
  `CONDUCTIVE_WORKSPACE_LINK`. It writes the link only when its output is
  a terminal. The documentation milestone gives the words. Reason: older
  apps and other viewers still get a press. The line follows the terminal
  links rules, so the open follow-up
  `plans/follow-ups/terminal-links-to-the-app.md` decides how it opens.
  The main path of decision 1 C does not depend on that follow-up.
- **The last viewer.** Each bridge has a random viewer ID. It sets the
  session option `@conductive-viewer` to that ID in the same tmux command
  line as each key and paste that it sends. Reason: the shell then runs
  `open` only after the viewer of its Enter is set. A rule that acts only
  when the shared size changes misses a quick key from another viewer.
- **The request.** The command reads `@conductive-viewer`. Then it sets
  the session option `@conductive-open` to one value: a random request
  ID, that viewer ID, and every file path in base64. Reason: tmux reports
  separate options in name order and passes values raw. So a value with a
  newline can forge a control-mode line, and two options can mismatch.
- **The forward.** Each bridge subscribes to `@conductive-open` with
  `refresh-client -B`. At attach, it reads the current request ID and
  never acts on it. It acts on each later ID. It checks the value: the
  base64, the request ID, the viewer ID, and each path, which must be
  relative, with no `..` and no control characters. Only the bridge whose
  viewer ID the request names sends an `open` message to its screen.
- **Timing.** tmux checks a subscription at most once a second. So the
  file opens up to about one second after Enter. Two requests in one
  second keep only the last. The protocol doc states both.
- **The message.** `src/shared/terminal-bridge.ts` adds the output message
  `open`, with the path in base64. `BRIDGE_VERSION` stays 1. Reason: an
  older screen reads an unknown kind as no message and drops it
  (`src/shared/terminal-bridge.ts:153-173`).
- **Several files.** The bridge sends the last file of the request. The
  line of each other file gives a press. Reason: a temporary tab shows one
  file, and each later open replaces it.
- **The screen.** The Terminal tool opens the file in its temporary tab,
  as a press in All files does, with `filesHref`. An HTML or Markdown file
  starts in Preview. On desktop, the focus stays in the terminal. On a
  phone, the file page shows. A hidden terminal of that viewer still opens
  the file, because its viewer typed the command.
- **Trust.** Each process of the cloud computer reaches the tmux socket,
  because the agents and the shells run as the same user. So any process,
  such as an agent or an install script, can send a request at any time
  while the last typist stays connected. The result is a file tab of the
  workspace for that member, such as `.env` in Source. A page runs only on
  the preview domain. I accept this, because the member can already read
  each such file, and the member's own `open` has the same effect. The
  protocol doc states it, and says that decision 2 A is a default of the
  command, not a boundary.
- **Older software.** An older screen drops the message and shows the
  line. A connection that opened before the release runs the older bridge,
  so it neither sets the viewer nor forwards. An older bridge or the plain
  tmux client of the fallback never sets `@conductive-viewer`. So when its
  viewer runs `open`, the file can open for the viewer who typed last with
  a current bridge. I accept this, because each new connection runs the
  current bridge. The protocol doc states the case.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The mockups draw the terminal after `open` and the file tab that it
opens.

- [ ] Add `app/tools/terminal-open`: the terminal after
      `open docs/report.html`, with the printed line and its link hint.
      Add a variant with the error lines of a missing file and a folder.
- [ ] Add the flow `user-flows/open-from-terminal`: the typed command,
      then the HTML file tab in Preview, on desktop and on a phone.
- [ ] Add both to `docs/mockups/catalogue-workspace-tools.md`.
- [ ] Run `npm run mockups:check`. Smoke-test the changed pages.
- [ ] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

The docs state the requirements and the decisions of the command.

- [ ] Add `docs/protocol/terminal-open.md` with the requirements of
      decision 1 C and decision 2 A, the words of the lines, the timing,
      the trust rule, and the case of older software. Link it from the Links section of `docs/protocol/terminal.md`.
- [ ] Update the public guide `src/marketing/docs/terminal-and-previews.md`.
- [ ] Read both legal pages in full, `src/marketing/terms.ts` and
      `src/marketing/privacy.ts`. Update each sentence that restates a
      changed fact.
- [ ] Read each other public guide in `src/marketing/docs/` in full, and
      update each sentence that restates a changed fact.

## Milestone 3: The command prints the line

Depends on: 2

`open` exists and prints the line for each file. It opens nothing by
itself yet. The product works at the end of this milestone.

- [ ] Add `worker/terminal/bridge/open.ts` with the path, option,
      address, and outside-terminal rules of the design, and its tests.
      Cover a shell with `DISPLAY` set, and output that is not a terminal.
- [ ] Add the wrapper and link it as `/usr/local/bin/open` in
      `image/install-system.sh`. Add `open.ts` to the bridge file list of
      `worker/terminal/bridge-files.ts`.
- [ ] Update the release and unit tests that check the installer and the
      bridge file list.
- [ ] Update `image/README.md`, `image/install.md`, and
      `worker/terminal/README.md`.

## Milestone 4: The bridge forwards the request

Depends on: 3

The command sets the request, and the bridge of the last viewer sends the
`open` message. No screen reads it yet.

- [ ] Add the `open` output message to `src/shared/terminal-bridge.ts`,
      with its tests.
- [ ] Set `@conductive-open` from `open.ts` inside an app terminal.
- [ ] Track `@conductive-viewer` in the bridge, subscribe to both options,
      and forward a new request from the last viewer only.
- [ ] Add bridge tests with a real tmux: two viewers, the last typist
      gets the message, the other gets none, a quick key from the other
      viewer moves the request, a new connection ignores an old request,
      and a request right after a connect opens. Add a test that a value
      with a newline or a bad base64 forwards nothing.
- [ ] Update `worker/terminal/README.md` with the tmux contract.

## Milestone 5: The screen opens the file

Tags: ui

Depends on: 4

- [ ] Read the `open` message in `src/terminal/bridgeLink.ts` with the
      nonce rule, and pass it to the Terminal tool.
- [ ] Open the file tab from `src/shell/workspace/tools/terminal-links.ts`
      with `filesHref`. Keep the focus in the terminal on desktop.
- [ ] Add tests: an `open` message opens the file tab, a message with a
      wrong nonce opens nothing, and printed text opens nothing.
- [ ] Update `src/terminal/README.md`.

## Milestone 6: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run `npm run test -- worker/terminal src/terminal`, then the
      complete gate `npm run check`.
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

- [ ] After the deploy, run `open` on an HTML file in a workspace terminal
      in the web app and in the Mac app. Check that the file tab opens in
      Preview for the typist only, and that a second viewer sees the line.
