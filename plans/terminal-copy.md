# Terminal copy

Status: Active. On branch `calummoore/disconnected-terminal-text-selection`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

The user can't select a part of the text of the Terminal tool after its
connection ends. A program in the terminal can turn on mouse reports.
While they are on, xterm.js sends each drag to the program and selects no
text. The app keeps them on after the end. Since #115, tmux turns them on
in workspaces from a rebuilt org image. Any program that asks, such as
vim, does the same. While the terminal is connected, a plain drag also
goes to tmux on every platform. On a Mac, no held key selects a part, and
Cmd+A copies only the whole screen.

The user chose to turn off mouse reports when the connection ends
(decision 213, option A, 9 November 2026). The user also chose normal
select while connected: a plain drag selects in the page, and the program
still gets the wheel (decision 214, option C, 10 November 2026). This
change does not cover touch selection on phones. The brainstorm notes, the scripts, and the evidence
are in `.context/terminal-copy/`. The options check of both decisions is
`.context/terminal-copy/options-check-report.md`.

Contract owners:

- [Workspace tools](../docs/protocol/workspace-tools.md#terminal).
- The [terminal README](../src/terminal/README.md).

## Terms

- **xterm.js:** the library that draws the terminal screen in the page.
  It handles the keys, the mouse, and text selection.
- **tmux:** the program in the sandbox that keeps the shell and its output
  history between connections.
- **Mouse reports:** a terminal mode that a program turns on to get
  clicks, drags, and the wheel.
- **Alternate screen:** a second screen without history. Full-screen
  programs, such as tmux and vim, draw on it.
- **#115:** the change of 9 November 2026, commit `e6ebc09`, that turned
  on tmux mouse support, so that the wheel scrolls the output history.

## Decisions

### Decision 213: Text can't be selected after a disconnect

- **Severity:** Medium. **Likelihood:** Common. **Effort:** Small.
- **Source:** Design. Item 1 of the brainstorm of 9 November 2026. The
  options check of 9 November 2026 rewrote the root question.
- **Category:** Product bug.
- **Location:** `src/terminal/TerminalScreen.tsx:121`
- **Background:** At the end, the screen keeps its output and shows
  Disconnected with Reconnect. The app only stops the input. Connections
  drop often, for example at a network change or a Worker update. tmux
  with mouse support off still turns on mouse reports for a program that
  asks, such as vim or htop. On a Mac, Cmd+A and then Cmd+C already copy
  the whole screen.
- **Problem:** Mouse reports stay on after the end. So a drag selects
  nothing, and only the whole screen can be copied.
- **Impact if no action:** The user can't copy a chosen part, such as one
  error line, after a disconnect. On a Mac, Reconnect does not help,
  because of decision 214.
- **Root question:** How does the user select and copy a chosen part of
  the text that stays on the screen after the connection ends?
- **Options:**
  - **A.** At the end, turn off mouse reports in the screen only. On a
    Mac, a drag and Cmd+C then work in the browser and in the Mac app.
    Phones keep today's touch behaviour. Effort: Small.
  - **B.** A, plus a Copy button in the Disconnected bar that copies the
    whole screen. It also works by touch. It needs a mockup change.
    Effort: Medium.
  - **C.** At the end, show the screen as plain page text. The browser
    then selects it by mouse, keyboard, and touch. The swap must keep the
    colours and the layout. Effort: Medium.
  - **D.** At the end, read the whole output history from the sandbox, so
    the copy covers more than the last screen. It needs a new Worker route
    and an isolation review. It fails when the sandbox is stopped.
    Effort: Large.
- **Left out:**
  - Change nothing, because Cmd+A copies only the whole screen.
  - Option-drag only, because A is better on every point after the end.
  - Automatic reconnect, because it fails when the sandbox is stopped.
    After a reconnect, tmux also takes the mouse again.
- **Wider fix:** A, when it turns off every mouse mode and not only the
  modes that tmux uses. Then no program can keep the mouse after the end.
- **Previous examples:** #115, commit `e6ebc09`, turned on tmux mouse
  support. No earlier case of this kind was found.
- **Related:** Decision 214. With its options C or F, this fix becomes a
  safety net only. With its other options, this fix is needed.
- **Recommendation:** A. It fixes the reported case in the browser and in
  the Mac app with the smallest change and no new UI.
- **Action:** apply A. The user chose A on 9 November 2026.

### Decision 214: A Mac can't copy a part while connected

- **Severity:** Medium. **Likelihood:** Common. **Effort:** Medium.
- **Source:** Design. Item 2 of the brainstorm of 9 November 2026. The
  options check of 9 November 2026 added options F and G, rewrote the
  root question, and corrected the costs.
- **Category:** Product bug.
- **Location:** `src/terminal/TerminalScreen.tsx:79`,
  `worker/terminal/scripts.ts:115`
- **Terms:**
  - **OSC 52:** a control sequence that a terminal program sends to put
    text on the user's clipboard.
  - **Copy mode:** the tmux mode that shows the history and selects text
    in it. A wheel turn or a drag starts it.
- **Background:**
  - A terminal gives the mouse to one owner at a time. Either the page
    selects text, or a program gets the mouse.
  - xterm.js gives a program the clicks, the drags, and the wheel
    together. It has no standard mode that gives only the wheel.
  - #115 turned on tmux mouse support, so that the wheel scrolls the
    history. So tmux now also gets each plain drag, on every platform.
  - tmux copies the dragged text into its own buffer and sends it as
    OSC 52. xterm.js 6 ignores OSC 52, so the text never reaches the
    clipboard.
  - On Windows and Linux, Shift-drag still selects in the page. On a Mac,
    only Option-drag can, and only with an xterm.js setting that the app
    leaves off.
  - On a Mac, Cmd+A and then Cmd+C copy the whole screen, with the tmux
    status line and no history.
  - Options A to D and F assume that tmux keeps the history, so the page
    holds one screen. That comes from the code, not from a requirement.
    Decision 118 asks only that the shell and its screen persist. Options
    E and G drop the assumption.
- **Problem:** On every platform, a plain drag goes to tmux and copies
  nothing. On a Mac, no held key selects a part of the text.
- **Impact if no action:** A Mac user can copy only the whole screen. A
  part, such as one error line, needs `tmux set-option -g mouse off`,
  which stops the wheel from scrolling the history.
- **Root question:** How does the user select and copy the text of a
  connected terminal, on every platform, while the wheel still scrolls the
  output history?
- **Options:**
  - **A. Option-drag.** The app turns on the xterm.js setting for
    Option-drag. The user holds Option, drags, and presses Cmd+C. A plain
    drag still goes to tmux. The setting ends Option-drag column
    selection on a Mac. Effort: Small.
  - **B. tmux copies to the clipboard.** A, plus the app accepts the
    OSC 52 writes of tmux. A plain drag then copies at release, without
    Cmd+C. Any process in the sandbox can make tmux send a write, for
    example with `tmux set-buffer -w`. A rule that accepts a write only
    right after a user action narrows this, but a process that writes
    often still gets through. Safari can refuse a write that comes after
    the network round trip. Effort: Medium.
  - **C. Normal select.** The page keeps the plain left clicks and drags,
    and the program still gets the wheel. A plain drag selects, and Cmd+C
    copies, in every state. A held key, such as Cmd on a Mac, gives a
    click or a drag to the program. Without that key, programs such as
    vim, htop, and tmux lose left clicks and drags. C sends each plain
    press to xterm.js again as a forced selection, so an xterm.js update
    can break it. Effort: Medium.
  - **D. Normal select unless a program asks.** tmux stops asking for the
    mouse, and the app turns the wheel into a tmux scroll key. A plain
    drag selects in a plain shell. A program that asks for the mouse,
    such as vim, still takes the drag, so a Mac also needs the setting of
    A. tmux loses its own clicks, such as on its status line. Existing
    workspaces get the change at their next start. Effort: Large.
  - **E. The page keeps the history.** A new terminal backend keeps the
    history for the page, in place of tmux, as a desktop terminal does. A
    drag selects and the wheel scrolls in the page, also across screens.
    A program that asks for the mouse still takes the drag, so a Mac also
    needs the setting of A. It replaces how the shell persists between
    connections. Effort: Large.
  - **F. Normal select, and clicks still reach programs.** As C, but the
    page holds each plain press until it knows a click from a drag. A
    click reaches the program at the release, and a drag selects.
    Programs lose only plain left drags. Each click reaches the program
    late, and the page needs a move limit and a double-click rule.
    Effort: Medium.
  - **G. The page shows the tmux history.** tmux keeps the shell and its
    history. The app reads that history from tmux and shows it in the
    page, where a drag selects across screens. It needs a new Worker route
    with an isolation review, or a page client for the tmux control mode.
    It also needs a mockup and a design for the wheel. Effort: Large.
- **Comparison:**

  | | A | B | C | D | E | F | G |
  | --- | --- | --- | --- | --- | --- | --- | --- |
  | Plain drag | Goes to tmux | Copies at release | Selects | Selects in a plain shell | Selects | Selects | Selects in the history view |
  | Clicks in vim or htop | Kept | Kept | Only with Cmd | Kept | Kept | Kept, at release | Kept |
  | Drags in vim or htop | Kept | Kept | Only with Cmd | Kept | Kept | Lost | Kept |
  | One copy across screens | No | Yes | No | No | Yes | No | Yes |
  | Safari | Works | Needs a test | Works | Works | Works | Works | Works |
  | New risk | None | Clipboard writes from the sandbox | Depends on xterm.js details | New wheel code | New backend | Depends on xterm.js details | New Worker route |
  | Existing workspaces | Yes | Yes | Yes | At their next start | No | Yes | Yes |
  | Effort | Small | Medium | Medium | Large | Large | Medium | Large |

  A, B, C, and F change only the page. The browser gets them at the next
  deploy, and the Mac app at its next release.

- **Left out:**
  - Change nothing, because Cmd+A copies only the whole screen, with the
    status line and no history.
  - A Copy-screen button, because it can't copy a chosen part.
  - tmux without the alternate screen, so that its output scrolls into
    the page. It fails the goal: redraws fill the page history with
    repeated screens, and lines from before a connection never reach it.
  - Turn tmux mouse support off and change nothing else. It fails the
    goal, because the wheel then sends Up and Down keys, which recall
    shell commands.
- **Wider fix:** C, because no program can take a plain drag from the page
  again. F also prevents the class.
- **Previous examples:** #115, commit `e6ebc09`. The open Conductor
  workspace "Terminal scroll looping" works on the same tmux mouse
  setting. It has no code change yet.
- **Related:** Decision 213. With C or F, its fix becomes a safety net
  only. With the other options, its fix is needed. The scroll-looping
  workspace: D, E, and G change the wheel handling that it studies, so it
  needs this answer too.
- **Recommendation:** C. It gives a plain drag and Cmd+C on every platform
  and in every state, at Medium effort, with no clipboard path from the
  sandbox and no sandbox change. Choose F if plain clicks must still reach
  programs without a held key. The first round of the brainstorm
  recommended B, before the check found that any sandbox process can push
  a clipboard write through tmux.
- **Action:** apply C. The user chose C on 10 November 2026. This choice
  approves the change of behaviour on `main`: plain left clicks and drags
  no longer reach programs, and a held key gives them back.

## Design calls

- 9 November 2026, agent's call: the copy rule goes into the Terminal
  section of `docs/protocol/workspace-tools.md`. Reason: it is new
  user-visible behaviour that the user asked for.
- 9 November 2026, agent's call: the end turns off every mouse mode that
  xterm.js supports, not only the modes of tmux. Reason: any program, such
  as vim or htop, can hold the mouse at the end.
- 9 November 2026, agent's call: the reset goes only to xterm.js, never to
  the shell. Reason: the shell must not get input after the end.
- 9 November 2026, agent's call: the development page gets a button that
  turns on mouse reports. Reason: the smoke tests need to reproduce the
  problem without a sandbox.
- 10 November 2026, agent's call: C uses the forced selection of
  xterm.js. While a program has the mouse, the page sends each plain left
  press to xterm.js again as a forced press: Option on a Mac, with
  `macOptionClickForcesSelection`, and Shift elsewhere. Reason: the wheel
  path of #115 and the mouse encodings of xterm.js stay unchanged. Hiding
  the mouse request from xterm.js was left out, because the app then needs
  its own wheel encoding and its own wheel tests.
- 10 November 2026, agent's call: the held key that gives a click or a
  drag to the program is Cmd on a Mac and Ctrl on Windows and Linux.
  Reason: Option and Shift are the keys of the forced selection, a
  Ctrl-click on a Mac is a right-click, and Alt-drag moves windows on many
  Linux desktops.
- 10 November 2026, agent's call: the right and the middle buttons still
  go to the program. Reason: a selection needs only the left button.
- 10 November 2026, agent's call: the screen shows the text cursor while a
  program has the mouse. Reason: a plain drag selects, and xterm.js shows
  the arrow cursor in that state.
- 10 November 2026, agent's call: a tap on a phone follows the same rule
  as a click. Reason: a phone has no Cmd or Ctrl key, and a tap in tmux
  selects only the pane.
- 10 November 2026, agent's call: the fix of decision 213 stays, as the
  user chose. Reason: after the end, the screen then shows the text cursor
  and selects without a sent-again press.

## Milestone 1: Documentation and protocol

Depends on: none

The Terminal requirements say how the user selects and copies the text of
the screen, while connected and after the end.

- [ ] In the Terminal section of `docs/protocol/workspace-tools.md`, add
      the requirement: when the connection ends, the user can still select
      and copy a part of the text of the screen (decision 213). Add its
      reason: the screen keeps its output so that the user can use it,
      such as an error.
- [ ] In the same section, add the requirement: a plain drag selects text
      in the screen, also while a program, such as tmux, uses the mouse.
      The wheel still reaches the program. A held Cmd on a Mac, or Ctrl on
      Windows and Linux, gives a click or a drag to the program
      (decision 214). Add its reason, and the rejected clipboard writes
      from the sandbox: any process in the sandbox could then write the
      user's clipboard.
- [ ] Read the Terms page in `src/marketing/terms.ts` and the Privacy page
      in `src/marketing/privacy.ts` in full. Update each sentence that
      restates the changed fact.
- [ ] In `src/terminal/README.md`, extend the Behaviour line about the end
      of the connection: a drag still selects the text, and Cmd+C copies
      it.
- [ ] In the Behaviour section of `src/terminal/README.md`, add the
      selection rule of decision 214: a plain drag selects, the wheel and
      the right and middle buttons reach the program, and a held Cmd or
      Ctrl gives a click or a drag to the program.

## Milestone 2: Copy after the end

Tags: ui

Depends on: 1

When the connection ends, the screen turns off mouse reports. A drag then
selects text, and Cmd+C copies it.

- [ ] Add a test: a program turns on mouse reports, the transport closes,
      and xterm.js then tracks no mouse. Use a real xterm.js `Terminal`,
      as `src/terminal/xtermScreen.test.ts` does. Show that the test fails
      before the change.
- [ ] At the end of the connection, turn off mouse modes 9, 1000, 1002,
      and 1003 in xterm.js. Write the reset only to xterm.js.
- [ ] Add a "Turn on mouse reports" button to
      `src/terminal/dev/DevControls.tsx`, beside "Turn on focus reports".
      Update the development page section of `src/terminal/README.md`.
- [ ] Smoke test in Chrome on the development page, with a Mac platform:
      turn on mouse reports, disconnect, drag, and copy. Save the result
      under `.context/terminal-copy/`.

## Milestone 3: Copy while connected

Tags: ui

Depends on: 2

While a program has the mouse, a plain drag selects in the page, and the
program still gets the wheel. A held Cmd on a Mac, or Ctrl elsewhere,
gives a click or a drag to the program.

- [ ] Add a DOM test with happy-dom, as `src/app/pointer-drag.test.tsx`
      does, for the press rule:
  - [ ] While a program has the mouse, a plain left press reaches
        xterm.js again as a forced press, with the same position, buttons,
        and click count. The first press goes no further.
  - [ ] A press with Cmd on a Mac, or Ctrl elsewhere, a right press, a
        middle press, and each press while no program has the mouse pass
        unchanged.
  - [ ] Show that the test fails before the change.
- [ ] Turn on `macOptionClickForcesSelection` in the options of the
      xterm.js `Terminal` in `src/terminal/TerminalScreen.tsx`.
- [ ] Implement the press rule in the screen, with a capture listener on
      the xterm.js element. Remove the listener when the screen goes.
- [ ] Show the text cursor over the screen while a program has the mouse.
- [ ] Smoke test in Chrome on the development page, with a Mac platform
      and with Linux. Turn on mouse reports, then check:
  - [ ] A plain drag selects, and the copy command copies the text.
  - [ ] A double click selects a word.
  - [ ] A wheel turn reaches the program as a mouse report.
  - [ ] A Cmd-drag on a Mac, or a Ctrl-drag on Linux, reaches the program
        and selects nothing.
  - [ ] A right press reaches the program.
  - [ ] Save the results under `.context/terminal-copy/`.

## Milestone 4: Verification, commit, review, and pull request

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
      and the follow-up items that the change adds.

## Post-merge follow-up (non-blocking)

- [ ] In a deployed workspace with tmux mouse support, on a Mac, check
      Chrome and Safari: the wheel scrolls the history, a plain drag
      selects, Cmd+C copies, and a drag after a disconnect selects. It
      needs the deployed change and a Mac.
- [ ] Repeat the check in the Mac app after its next release, which
      bundles the web app.
