# Terminal control-mode bridge

Status: Active. On branch `calummoore/porto-6ebg`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

In the Terminal tool, a drag selects only the visible screen. When the drag
reaches the top edge, the screen does not scroll, so the user cannot copy
more than one screen of output. The cause: each connection runs a normal
tmux client. tmux draws its own screen in xterm.js on the alternate screen,
which has no history, and it keeps the output history itself. tmux also
sends only the lines that end on the screen, so fast output never reaches
the browser in full.

This change puts a bridge program in the cloud computer between ttyd and
tmux. The bridge attaches to the tmux session in control mode, in which
tmux sends the raw output of the shell and draws no screen. The bridge
passes every byte to xterm.js, so xterm.js keeps the full history. A drag
then scrolls and selects that history, the wheel scrolls it, and Cmd+C
copies it. At each connect, the bridge first prints the tmux history and
the current screen. The shell still runs in tmux, so it keeps running when
a connection drops.

The change does not cover search in the history, terminal tabs, the Mac
terminal tab, or pressable links in the terminal. Search becomes possible
later, because the text is then in xterm.js.

Contract owners:

- [Tools of a workspace](../docs/protocol/workspace-tools.md#terminal).
- The [terminal backend README](../worker/terminal/README.md).
- The [terminal README](../src/terminal/README.md).
- The [mockup catalogue](../docs/mockups/catalogue.md), at `app/tools`.
- The public guide [Terminal and previews](../src/marketing/docs/terminal-and-previews.md).

Related plans: [Terminal tabs](terminal-tabs.md) gives each tab its own
tmux session. Its launcher must start the bridge for the session of a tab.
Its hidden tabs stay connected, so each one gets every byte and keeps its
own history.

Replaced ways:

- One tmux client for each connection, which draws the tmux screen →
  one bridge for each connection, which passes the raw output. Consumers:
  the launcher in `worker/terminal/scripts.ts`, its tests in
  `worker/terminal/scripts.test.ts`, the terminal backend README, the
  terminal README, and the follow-up item
  `plans/follow-ups/terminal-copy-browser-check.md`. Moved in Milestones 2
  and 3. The plain tmux client stays only as the fallback of design call 4.

The options check of 13 November 2026 is saved in
`.context/terminal-control-mode-bridge/options-check.md`. It added options
G and H to Decision 1, moved the history length to Decision 2, and found
the design gaps that the design below now covers.

## Decision 1: how the user copies more than one screen

- **Severity:** Medium. **Likelihood:** Common. **Effort:** Large.
- **Source:** Implementation.
- **Category:** Product bug.
- **Location:** `src/terminal/plainPresses.ts:60`, `worker/terminal/scripts.ts:119`
- **Terms:**
  - **tmux:** the program in the cloud computer that keeps the shell running when the browser connection drops.
  - **OSC 52:** an escape code that a program sends to put text on the user's clipboard.
  - **Control mode:** a tmux mode (`tmux -C`) that sends the raw shell output as text messages and draws no screen.
- **Background:** The Terminal tool shows the workspace shell in the browser with xterm.js. tmux keeps the output history and draws only the changes on the screen. A drag uses the xterm.js selection, which sees only the visible screen.
- **Problem:** A drag stops at the top row, so a copy holds at most one screen of text.
- **Impact if no action:** To copy a long log, such as a build log, the user must copy it one screen at a time.
- **Root question:** How does the user select and copy output that is longer than one screen?
- **Options:**
  - **A.** Let xterm.js keep the history, and turn off the tmux alternate screen. A test showed that this fails: for `seq 1 30` on a 12-row screen, tmux sent only lines 21 to 30. Not viable.
  - **B.** Let a plain drag go to tmux, which scrolls while the drag is at the top edge. tmux sends the text with OSC 52. The app keeps it only just after the user's own release, and the copy key copies it. It changes the drag rule of decision 246. Effort: Medium.
  - **C.** Add a "Copy history" view of the tmux history as plain text. The drag in the terminal stays broken. Effort: Large.
  - **D.** When a drag passes the top edge, the app scrolls tmux and joins the text of each screen. This is fragile. Effort: Large.
  - **E.** Add a control-mode bridge in the cloud computer. Every line reaches xterm.js, and each connect prints the tmux history. All viewers share one size, and each viewer shows that size. The tmux status line and Ctrl-b keys go away. Effort: Large.
  - **F.** Replace tmux with a session keeper that passes raw output, such as `dtach`, and a capped output log. A replay can start in the middle of an escape code, and tmux windows go away. Effort: Large.
  - **G.** Added by the options check. The browser reads control mode itself, through the same ttyd socket, for a screen that asks for it. Shell output cannot forge a control message. Costs: the protocol logic moves into the browser, the Worker needs a new socket argument, and the bytes are escaped on the wire. Effort: Large.
  - **H.** Added by the options check. Our own session server replaces tmux. It keeps a headless xterm.js and sends each new viewer the exact screen, history, and modes. Costs: it needs a native terminal-device module, and it replaces the shell server and the tmux sessions of terminal tabs. Effort: Large.
- **Left out:**
  - tmux control mode with the app drawing each pane. A single pane is G, and the other panes have no place in the tool.
  - A session keeper that takes one viewer at a time, such as `shpool`. It breaks decision 118, which keeps one shared shell.
  - Change nothing. It fails the goal.
- **Wider fix:** E.
- **Previous examples:** None found. Decision 246 made the drag select.
- **Recommendation:** E. Its main cost is the loss of the tmux keys, which terminal tabs replace, and it gives native behaviour with no clipboard risk. With the message channel of the design, E gets most of what G gives.
- **Outcome:** On 13 November 2026, the user first chose A. A test showed that A loses lines, so it was not applied. The user then chose E on the same day, after an explanation of its costs. The user accepted the loss of the tmux status line and the Ctrl-b keys. The options check came after the choice. It confirmed E and found no fact that makes E fail.

## Decision 2: how much history a connection keeps

- **Severity:** Low. **Effort:** Small.
- **Source:** Design, from the options check.
- **Category:** Product bug.
- **Location:** `worker/terminal/scripts.ts:119`, `src/terminal/TerminalScreen.tsx:75`
- **Background:** Today tmux keeps 2,000 lines of history in each pane, and xterm.js keeps 1,000 lines. With the bridge, xterm.js holds the history, and each connect prints the tmux history.
- **Problem:** The protocol doc gets a new limit: how many lines a new connection shows, and how many lines a screen keeps.
- **Impact if no action:** The bridge needs a number to build. Without a decision, it uses today's 2,000 lines of tmux and 1,000 lines of xterm.js, so a reload can show more lines than a live screen keeps.
- **Root question:** How many lines of output history does the terminal keep and show?
- **Options:**
  - **A.** 2,000 lines on both sides, as tmux keeps today. A connect sends about 0.4 MB at most. A long build log can lose its start. Effort: Small.
  - **B.** 5,000 lines on both sides. A connect sends about 1 MB at most. Effort: Small.
  - **C.** 10,000 lines on both sides. A connect sends about 2 MB at most, which is slow on a phone. Effort: Small.
- **Left out:** Different numbers on the two sides. A reload would then show a different history than the live screen.
- **Wider fix:** None. The number is one setting on each side.
- **Previous examples:** Terminal tabs decision 2 sent a similar limit, the number of tabs, to the user.
- **Recommendation:** B. It holds a long build log, and a connect stays near 1 MB.
- **Action:** ask the user, because it writes a new limit into the protocol doc, and no value is clearly best.
- **Outcome:** On 13 November 2026, the user chose A: 2,000 lines on both sides. tmux keeps its default `history-limit`, and xterm.js keeps 2,000 lines.

## Design

### The bridge

The bridge is a Node program in `worker/terminal/bridge/`. It is written in
TypeScript with erasable syntax only. The private Node 24 of the image runs
it directly, with no build step. The install command embeds its files with
`?raw` imports and writes them to `/usr/local/lib/conductive/terminal-bridge/`.
It uses no npm package. ttyd runs one bridge for each connection, in a
terminal device, with the session name as its argument. The launcher runs
it without `NODE_OPTIONS` and the other Node variables of the workspace.

1. **Attach.** The bridge puts its terminal device in raw mode with
   `stty raw -echo`, which also turns off the output processing. It runs
   `tmux -N -S <socket> -C new-session -A -s <session> -c <repository> -f ignore-size`
   with a login Bash. `ignore-size` keeps this client out of the tmux size
   rule.
2. **Hello.** The bridge makes a random nonce. It writes a private OSC to
   the browser with the nonce and the shared size. The browser accepts only
   the first hello of a connection, and later messages only with that
   nonce. The browser answers the hello with its own message, which gives
   the bridge its colours.
3. **Size at connect.** The bridge sets the shared size to the size of its
   own device, as a key does. So a first connect and a reload show the
   right size at once.
4. **History and screen.** In one command line, the bridge reads the pane
   state and captures the history and the screen. tmux keeps the output and
   the answers of a client in order, so the bridge drops the output until
   the last answer. A test showed that the capture and the output after it
   join with no gap and no duplicate line.
   - It prints the history with colours and joined lines, then one screen
     of new lines, which moves the history above the screen. A replay test
     in xterm.js showed this.
   - It draws each screen row at its place, then puts the cursor in place.
   - When a full-screen program, such as vim, runs, it prints the normal
     screen, switches xterm.js to the alternate screen, and draws that
     screen. It sets the cursor keys mode, the keypad mode, the mouse mode,
     and the scroll region that tmux reports.
5. **The control-mode reader.** tmux does not escape the output of a
   command, so a captured line can read `%exit` or `%end`. The reader ends
   a block only at the `%end` or `%error` line whose time, number, and
   flags match its `%begin` line.
6. **Output.** The bridge decodes each `%output` message of the active pane
   and writes the bytes to the browser.
7. **Flow control.** The bridge writes a mark after each 64 KB of output,
   and the browser acknowledges each mark that xterm.js parsed. When 16
   marks wait, the bridge drops the output. When the browser acknowledged
   every mark, the bridge resynchronizes. Reason: the Worker relay and ttyd
   1.7.4 pass no back pressure, so without this a flood of output fills the
   memory of the Worker and of the tab.
8. **Keys.** The bridge sends each chunk of input to the pane with
   `send-keys -H`, in chunks of at most 1,024 bytes. Ctrl-b reaches the
   shell.
9. **Paste.** The browser sends a paste as its own message. The bridge puts
   the text in a tmux buffer and runs `paste-buffer -p`, so tmux adds the
   bracketed paste marks when the program asked for them. Reason: tmux 3.4
   does not report the bracketed paste mode, so a reconnected screen cannot
   know it. Without the marks, a paste into vim runs as vim commands.
10. **Focus.** The browser sends focus reports as their own message. The
    bridge passes them to the pane, but a focus report does not take the
    shared size.
11. **Size.** On a resize of its device, and on the first key, paste, or
    mouse report after another viewer set the size, the bridge runs
    `resize-window` with its own size. On each `%layout-change`, it sends
    the new size to the browser. The bridge and the browser accept at most
    500 columns and 200 rows. When the window is larger, the bridge sets it
    to its own size. Reason: a program in the shell can run
    `tmux resize-window` with any size, and a huge size needs more than
    1 GB in each tab.
12. **Colours.** The bridge sets the `window-style` of the window to the
    colours of the browser that answered last. Reason: with only control
    clients, tmux answers a colour query of a program with black.
13. **Resync.** When the browser caught up, on a change of the active
    window or pane, and on a change of the session, the bridge resynchronizes. It clears the
    browser screen and history, and runs the history and screen step again.
14. **End.** On `%exit`, or when tmux exits, the bridge exits, and ttyd
    closes the connection.

The private messages of both directions use one OSC number and the nonce.
The bridge reads the browser's messages out of the input stream, so a
message never reaches the shell.

### The browser

- Until a hello arrives, the screen works as it does today. So a workspace
  from an older image keeps the tmux client and its behaviour.
- After a hello, the screen takes its size from the bridge. It sends the
  size of its own panel, measured at the normal 12px font, to the
  transport. It sets xterm.js to the shared size.
- When the shared size is larger than the panel, the screen makes the font
  smaller, down to 6px, and measures the line spacing again. When the
  shared size does not fit even at 6px, the panel scrolls. When the shared
  size is smaller, the screen shows empty space after it.
- After a hello, the screen does not send its own replies, such as a cursor
  report, because tmux already answered the program. It sends focus reports
  and pastes as messages, and it acknowledges the bytes that it wrote.
- Links that a program marks with OSC 8 stay plain text, as they are
  today. The follow-up item `plans/follow-ups/terminal-and-tool-call-links.md`
  waits for the user's choice on links.

### Design calls

These are my calls, made on 13 November 2026.

1. **TypeScript run by Node.** The bridge is TypeScript that the private
   Node 24 runs directly. Reason: it shares the strict settings, the tests,
   and the lint of the other TypeScript code. A check of Node 24.22 showed
   no warning. Plain `.mjs` with `checkJs` was the other choice. The bridge
   gets its own Node tsconfig, and `tsconfig.worker.json` leaves it out.
2. **`resize-window`, not `window-size manual`.** Reason: in tmux 3.4, the
   global `window-size manual` option stops the tmux server at the next
   `new-session`. A test showed this. `resize-window` sets manual sizing
   for one window only, and a test showed that it holds against the size
   of another viewer.
3. **A nonce and a size limit.** Reason: a program in the shell can write
   any escape code and can resize the window. The nonce stops a forged
   message, and the limit stops a huge size. The bridge does not filter
   the output, because a filter must parse escape codes across chunks.
4. **A fallback to the tmux client.** When the private Node is missing, or
   the bridge exits before its hello, the launcher runs the plain tmux
   client, as today. Reason: graceful handling.
5. **An open tab of an older app.** Such a tab still sends its own replies,
   so a program can get two answers to a query until the tab reloads.
   Reason: the Worker and the app deploy together, so only a tab that was
   open before the deploy has the old code. A ttyd argument that selects
   the bridge would avoid this, but it needs a new socket argument.
6. **No tmux output flag and no `pause-after`.** The plan first used
   `no-output` and `pause-after`. Tests on 13 November 2026 showed that
   `refresh-client -f no-output` during a flood of output stalls the tmux
   3.4 client for good: no answer and no output comes. A client that stops
   reading its output for some seconds also stalls. So the bridge always
   reads tmux, and drops output itself, while it rebuilds and while the
   browser is behind. A test showed that the output and the answers of a
   client stay in order, so the drop needs no flag.
7. **tmux mouse support stays on.** Control clients get no mouse events, so
   the setting changes nothing for the bridge. The fallback client still
   uses it for the wheel.
8. **tmux in CI.** The Tests jobs install the `tmux` package. The bridge
   tests run the bridge in a terminal device with Python's `pty` module,
   and replay its output in `@xterm/headless`. Without tmux, outside CI,
   these tests are skipped with a message that names tmux. In CI they
   fail without tmux.
9. **No notice for another viewer's size.** The screen shows the shared
   size with no extra text. Typing in a viewer gives it the size. Reason:
   tmux shows no notice today either, and the mockups show the states.
10. **OSC 8 links stay plain text.** Reason: today tmux removes them, and
   the choice on links waits for the user in a follow-up item.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The Terminal tool gets one new mockup with two states: a viewer whose panel
is smaller than the shared size, and a viewer whose panel is larger.

- [x] Add `app/tools/shared-size` with both states, on a desktop and on a
      phone. Show no tmux status line.
- [x] Run `npm run mockups:check`. Smoke-test the new pages.
- [x] Update the design and the TODOs of this plan for each problem that the
      mockups show. The smaller state now keeps the newest lines at the
      bottom, as a terminal does. Screenshots are in
      `.context/terminal-control-mode-bridge/shots/`.

## Milestone 2: Documentation and protocol

Depends on: 1

- [x] Update the Terminal section of `docs/protocol/workspace-tools.md`:
  - [x] Every line of output reaches the screen and its history.
  - [x] A new connection shows the output history, up to 2,000 lines
        (Decision 2 A), and the current screen.
  - [x] A drag past the top or the bottom edge scrolls and selects the
        history. The wheel scrolls the history, unless a program in the
        shell uses the mouse.
  - [x] All viewers of a shell share one size, at most 500 columns and 200
        rows. A new connection, or the viewer where the user last typed or
        resized, sets it. Other viewers show that size.
  - [x] Each key reaches the program in the shell. The terminal has no key
        commands and no status line of its own.
  - [x] Change the example of decision 246 from tmux to a program such as
        vim. Record Decisions 1 and 2 with their dates and the rejected
        options.
  - [x] Say that a workspace from an older image keeps the old behaviour.
- [x] Move the updates of `worker/terminal/README.md` and
      `src/terminal/README.md` to Milestones 3 and 4, because they describe
      the code of those milestones.
- [x] Read both legal pages and every public guide in full. Update each
      sentence that restates a changed fact, such as
      `src/marketing/docs/terminal-and-previews.md`.
- [x] Check the row `workspace-terminal` in
      `src/marketing/from-conductor/areas/terminal-scripts-and-previews.ts`.
- [x] Update `plans/follow-ups/terminal-copy-browser-check.md` and the
      launcher design of `plans/terminal-tabs.md` for the bridge.
- [x] Add the bridge to the locations of
      `plans/follow-ups/org-node-options-reach-sandbox-software.md`, which
      says that the bridge clears the Node variables. It waited for the
      launcher of Milestone 3.

## Milestone 3: The bridge

Depends on: 2

- [x] Add the control-mode reader, with the block rule of design step 5,
      `%output` decoding, and the events that the bridge uses.
- [x] Add the connect step: hello, size at connect, history, screen,
      cursor, modes, and the alternate screen.
- [x] Add the browser messages: acknowledgements, pastes, focus reports,
      and colours.
- [x] Add keys, flow control, size with its limit, colours, resync, and
      exit.
- [x] Install the bridge files, and run them from the launcher with the
      private Node and without the Node variables. Add the fallback of
      design call 4.
- [x] Set the tmux `history-limit` to 2,000 lines, its default, so that
      the shell server states the number of Decision 2 A.
- [x] Add the bridge tsconfig, and leave the bridge out of
      `tsconfig.worker.json`.
- [x] Add unit tests for the reader, including a captured `%end` line, and
      for the connect step.
- [x] Add tests that run the bridge against a real tmux, as design call 8
      says. Cover fast output, a flood with a slow reader, a connect with
      history, a connect during `less`, a paste into a program that asked
      for bracketed paste, two viewers with different sizes, a forged size,
      a resync, and the end of the shell.
- [x] Update the install and launcher tests.
- [x] Update `worker/terminal/README.md`.
- [x] Install `tmux` in the Tests jobs of `.github/workflows/ci.yml`.

## Milestone 4: The screen

Tags: ui

Depends on: 3

- [x] Accept the hello and the size messages, with the nonce rule and the
      size limit. Answer the hello with the colours of the screen.
- [x] Set xterm.js to the shared size. Send the panel size, measured at
      12px, to the transport. Fit the font, down to 6px, and scroll the
      panel below that.
- [x] After a hello, drop the replies of xterm.js. Send focus reports and
      pastes as messages. Acknowledge the written bytes.
- [x] Set the xterm.js history to 2,000 lines, as Decision 2 A says.
- [x] Keep OSC 8 links as plain text.
- [x] Let the development page send a hello and another viewer's size.
- [x] Add tests for the session and the screen.
- [x] Update `src/terminal/README.md`.
- [x] Check the development page in a browser: a drag past the top edge
      scrolls and selects, Cmd+C copies, and both size states match the
      mockups. Headless Chrome checks of the panel and the phone layouts
      passed. Their scripts and screenshots are in
      `.context/terminal-control-mode-bridge/browser/`.

## Milestone 5: Verification, commit, review, and pull request

Depends on: every other milestone

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
      and the follow-up items that the change adds. It says that an
      existing workspace needs a new workspace to get the bridge.

## Post-merge follow-up (non-blocking)

- [ ] After the next org image build, check a new workspace in Chrome and
      Safari on a Mac: a drag past the top edge, Cmd+C, a reload with
      history, two viewers with different sizes, a paste into vim after a
      reconnect, and a connect while vim runs.
