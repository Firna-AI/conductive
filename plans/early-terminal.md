# Early terminal

Status: Active. On branch `calummoore/milan-61k3`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

Today the Terminal tool shows only a spinner, "Waiting for the sandbox", until the whole start of the cloud computer ends. The user can do nothing in the Terminal during that time, so each start feels slow. This change shows the terminal screen at once, with a status line. The user can type a command during the start. The browser tab holds that line, and the app sends it when the new shell shows its first prompt. An Enter that the user typed early runs the command at that prompt.

Cal asked for this on 13 November 2026, and chose the approach in a brainstorm on the same day: early terminal decisions 1 A and 2 A. The brainstorm notes and the outside research are in `.context/terminal-early/notes.md`. The options check of the decisions is in `.context/early-terminal/options-check.md`. Decision 3, the early prompt, is open.

This change does not make the start itself faster. It does not change the Preview and Desktop tools, which keep their wait. It does not let a stopped sandbox start when the user types.

Contract owners:

- [Workspace life](../docs/protocol/workspace-life.md), the wait of the files and the tools during a start.
- [Tools of a workspace](../docs/protocol/workspace-tools.md#terminal).
- The [terminal backend README](../worker/terminal/README.md).
- The [terminal README](../src/terminal/README.md).
- The [tools part](../src/shell/workspace/screen-parts.md#the-tools-part).
- The [mockup catalogue](../docs/mockups/catalogue.md), at `app/shell/starting` and `app/tools`.
- The public guide [Terminal and previews](../src/marketing/docs/terminal-and-previews.md).

## Decisions

This plan names its decisions after the change, as early terminal decision 1, as [Decision numbers](../docs/architecture.md#decision-numbers) says.

### 1. How the Terminal works during a start

- **Severity:** Medium. **Effort:** Large.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `src/shell/workspace/WorkspaceScreen.tsx:197`, `docs/protocol/workspace-life.md:37`.
- **Terms:**
  - **Held line:** the text that the user types before the shell can take it.
  - **First prompt:** the moment when the new shell is ready to read a command.
  - **Local echo:** the app draws the typed text itself, before the shell answers.
- **Background:**
  - While the sandbox starts, the shell mounts no tool. `WorkspaceScreen.tsx:197-203` gives the "Waiting for the sandbox" panel to `ToolsPart` as its placeholder.
  - `docs/protocol/workspace-life.md:37-38` says: "The files and the tools wait until the sandbox is ready."
  - The Worker reports the terminal as ready only when the whole workspace is ready (`worker/terminal/handler.ts:64-80`). The start includes the startup script and the agent runner.
  - A stop ends the shell. The first connection after a start creates a new login Bash (`worker/terminal/README.md:131-134`, `worker/terminal/scripts.ts:106`).
- **Problem:** The user cannot do anything in the Terminal during the start, so the start feels slow.
- **Impact if no action:** The Terminal keeps the spinner, and each start feels slower than it is.
- **Root question:** How can the Terminal let the user start work, and feel fast, while the sandbox starts?
- **Options:**
  - **A.** Show the terminal screen at once, with a status line. The browser tab keeps the held line and draws it with local echo. When the shell shows its first prompt, the app sends the held line. Closing the tab loses the held line. It needs a new mockup state and a first-prompt signal from the shell. Effort: Large.
  - **B.** Do A, but the workspace on the server keeps the held line. The server types it into the new shell when the start ends, so a closed tab keeps it. This matches the chat queue. A command can then run in the shared shell with nobody watching. Effort: Large.
  - **C.** Start the terminal earlier in the sandbox start, so a real shell opens before the startup script and the agent runner finish. It changes the terminal access check, which is a security area. Commands can run at the same time as the startup script, and in an old view of the folder while the disk restores. Effort: Large.
  - **D.** Added by the options check. Do A, and keep the start order, but let the terminal connect after its `terminal-password` phase, before the `runner` phase (`worker/lifecycle/workspace-object.md:167-196`). It changes the shared gate `sandboxAccessPredicate` (`worker/data/sandbox-access.ts:10-14`), which is a security area. Nobody measured the runner phase. Effort: Large.
- **Left out:**
  - A terminal frame with a status only. It fails the goal, because the user cannot type.
  - Change nothing and make the start faster. It fails the goal of early typing. The faster-create work on branch `calummoore/milan-ofz5` already removes part of the wait.
  - A separate "run when ready" text box. It is not a terminal, and A gives the same result inside the terminal.
  - Predictive echo on a live connection, as Mosh and VS Code do. It does not help when no shell exists yet. VS Code turned it off by default in January 2025, because a wrong echo could make a user run the wrong command.
  - A stand-in shell in the browser, or a local shell in the Mac app. The commands would run in the wrong place.
- **Wider fix:** None. This is a new feature, not a defect class.
- **Previous examples:**
  - The chat accepts messages before the sandbox is ready: decisions 14, 91, and 130 (`docs/protocol/messages-and-attachments.md:86-107`). That queue lives on the server, because a closed tab would lose a message.
  - Decision 20 E, "each tool shows its own wait", was recommended but not chosen (`plans/boat-native-remote-workspaces.md:805-850`).
  - `src/app/terminal-transport.ts:105-119` already holds keys during the socket handshake.
  - VS Code holds input until its shell process starts (`_preLaunchInputQueue`). Warp holds a command until its prompt hooks show that the shell is ready.
- **Related:** Decision 2 applies only with A or B. Decision 3 sets the prompt of the early screen.
- **Recommendation:** A. It gives the fast feel and early typing without a change to the server or to the access check, and a lost held line in a closed tab costs little. The options check kept A. D can follow when a measurement shows a long runner phase.
- **Chosen:** A, by Cal on 13 November 2026. The options check added D after that choice.

### 2. What an early Enter does

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** None.
- **Background:** With decision 1 A, a user can type a whole command and press Enter before the shell exists.
- **Problem:** An early Enter can run a command at a bad moment, such as while the disk still restores.
- **Impact if no action:** The plan cannot set the rule for Enter.
- **Root question:** When the user presses Enter before the shell is ready, when does the command run?
- **Options:**
  - **A.** Run the command at the first prompt. This is the fastest, but the user does not see the real shell before the command runs. Effort: Small.
  - **B.** Put the held line at the first prompt without Enter, and the user presses Enter again. This is safer, but it costs one more key. Effort: Small.
  - **C.** Added by the options check. Send the line only at a prompt after the end of the disk restore, so that the restore hook has moved the shell first. Each early command then waits 5 seconds or more after the start. Effort: Large.
  - **D.** Added by the options check. Show the line at the real prompt, and run it after about 2 seconds unless the user presses Ctrl-C. It is slower than A, and it adds a timer. Effort: Medium.
- **Left out:** Block Enter during the wait. It fails the goal, and B is safer at the same cost.
- **Wider fix:** None. This is a new feature, not a defect class.
- **Previous examples:** Warp sends a held command when its prompt hooks show that the shell is ready.
- **Related:** Decision 1.
- **Recommendation:** A. A new login Bash is the normal target after a start, and the status line shows that the command waits. The options check kept A: its restore risk is the same as for a command typed at the first prompt today, and B has the same risk.
- **Chosen:** A, by Cal on 13 November 2026. The options check added C and D after that choice.

### 3. The prompt of the early screen

- **Severity:** Low. **Effort:** Small.
- **Source:** Design.
- **Category:** Mockup.
- **Location:** `docs/mockups/src/screens/workspaceRun.ts:60`, `worker/terminal/scripts.ts:35`.
- **Background:**
  - Cal asked on 13 November 2026 whether the early screen can show the branch and the folder, which the app already knows.
  - The mockup draws the prompt as `<repository> (<branch>) $`.
  - The ready terminal of the mockups draws the same prompt (`docs/mockups/src/fixtures/terminal.ts:34-37`).
  - The real prompt comes from the Bash startup files of the org image. The prompt hook only changes its full path to the folder name (`docs/protocol/workspace-tools.md:158-159`). With the Ubuntu default, it reads `user@<host>:<folder>$`, and the host name is new for each sandbox. An org image can set its own prompt.
- **Problem:** The app cannot draw the exact real prompt before the shell starts. A different early prompt changes when the shell starts.
- **Impact if no action:** The mockup milestone cannot draw the early screen.
- **Root question:** How does the early screen show where the held command will run, with nothing that the real shell then contradicts? The options check wrote this question again, because a prompt is only one place to show the folder and the branch.
- **Options:**
  - **A.** Show no prompt. Show the status line and the held line only. The real prompt appears when the shell starts. Effort: Small.
  - **B.** Show `<repository> (<branch>) $` from the data of the workspace, as the mockup does. The real prompt replaces it when the shell starts, and it can look different. Effort: Small.
  - **C.** Do B, and change the default real prompt to the same shape, so that the two match. This changes the protocol rule that the prompt shows only the folder name. It can override the prompt of an org image, and an existing workspace gets it only from a new image. Effort: Medium.
  - **D.** Added by the options check. Show no prompt, as A does. The status line names the folder and the branch, such as "storefront on fix/checkout". Nothing on the early screen changes when the shell starts. The screen looks less like a ready prompt. Effort: Small.
  - **E.** Added by the options check. Do C, but the start command of the terminal sets the prompt hook in the running tmux server. The Worker builds that command at each start (`worker/terminal/service.ts:96-104`), so an existing workspace gets the prompt at its next start. The other costs of C stay. Effort: Medium.
- **Left out:** Read the real prompt from the last session and draw it again. A stop ends the shell, and the host name changes at each start, so the copy would be wrong.
- **Wider fix:** None. This is a new feature, not a defect class.
- **Previous examples:** Powerlevel10k draws a cached prompt while zsh starts, so the user can type at once.
- **Related:** Decision 1. Milestone 1 waits for this answer.
- **Recommendation:** D. It shows the folder and the branch at once, as Cal asked, at the cost of B, and nothing disappears when the shell starts. The plan first recommended B. The options check recommended D.
- **Action:** ask the user, because the options trade a match with the real prompt against a change of the prompt of every workspace.

## Design

### Mechanics

- The Terminal tool mounts during a start, also while the open resumes the sandbox. The Preview and Desktop tools keep the wait panel. `ToolsPart` takes the placeholder for those tools only.
- The tool keeps one xterm.js screen through its states. In `loading` and `starting`, the screen has no connection. In `ready`, the same screen gets its connection. So the focus and the held line stay when the shell connects.
- During the wait, a held-line editor takes the user's input. It accepts printable text, Backspace, Left, Right, and paste. Enter ends the held line. Ctrl-C clears it. It drops every other key. It draws the held line with local echo, in the place that decision 3 sets.
- The editor stays active from the connection until the first-prompt signal. So no key reaches the shell before its first prompt.
- A status line under the screen says that the terminal connects. It names the start, not Boat.
- When the shell connects, tmux draws its screen. The app keeps the held line until the first-prompt signal, then sends it as a bracketed paste. When the user pressed Enter, the app sends Enter after it (decision 2 A).
- When no first-prompt signal comes within a time limit after the connection, the app does not send the held line. The status line says that the command was not sent, and shows its text. This covers an older image without the signal, and a session that another tab created first.
- When the start fails or the sandbox stops, the tool shows its error or its Stopped state, as today. The held line shows with it.

### Design calls

These are the agent's calls of 13 November 2026.

- The held-line editor drops arrows, Tab, Esc, and Ctrl keys other than Ctrl-C. Reason: these keys need a real shell, and a guess can run the wrong command.
- A stopped sandbox keeps its Stopped state with Resume. Typing does not start it. Reason: decision 11 says that Resume avoids a start that the user did not ask for.
- A failed start keeps the held line on the screen with the error. Reason: the user can copy the line and try again.
- During the wait, only the default terminal tab shows. Reason: terminal tabs (`plans/terminal-tabs.md`) need a running computer to create a tab.
- Phones get the same behaviour, with the key row. During the wait, the keys of the row that the editor drops are off, and Ctrl with C clears the held line. Reason: a key that does nothing must not look active.
- A paste with line breaks goes to the shell as one bracketed paste, so no line runs before an Enter of the user. Reason: Bash treats a paste at a real prompt the same way, so the held line acts as if the user typed it at the first prompt. The options check raised this case.
- When two tabs each hold a line during one start, each tab sends its own line at the first prompt. Reason: decision 118 lets several connections type into the one shared shell today, and the case is rare. The options check raised this case.
- Left and Right move in the held line. Reason: they need no shell, as the options check said.
- The first-prompt signal must come from the shell at a new prompt, not from a program or a screen that already runs. Milestone 3 chooses the mechanism. Candidates: a title that the prompt hook sets, with tmux `set-titles`, or a marker through tmux passthrough. Reason: tmux drops most private sequences of a pane, so the mechanism needs a test in a real cloud computer.
- The start command of the terminal, which the Worker builds at each start, delivers the signal where it can. Reason: an existing workspace keeps the terminal files of its first image, so a signal in the image alone reaches only new workspaces. The options check raised this case.
- Milestone 3 measures the time from the connection to the first prompt, and sets the time limit from it. Reason: no measurement supports a fixed number yet.
- The screen work also does option E of `plans/follow-ups/hidden-terminal-line-spacing.md`: it builds xterm.js at mount and calls `open` when the host has a size. Reason: both changes split the screen from the connection in the same code.

### Related work

- `plans/terminal-tabs.md` changes the same tool and its backend. The branch that merges second resolves the overlap.
- `plans/follow-ups/hidden-terminal-line-spacing.md` closes with Milestone 4.

## Milestone 1: Mockups

Tags: mockup

Depends on: none. The prompt waits for decision 3.

- [ ] Update `app/shell/starting` so that the Terminal tool shows the early screen, with the status line and the place of the held line that decision 3 sets.
- [ ] Add states for a held line, a held line with Enter, a command that was not sent, and a failed start with a held line.
- [ ] Add the phone layout of the early screen, with the key row.
- [ ] Run `npm run mockups:check`. Smoke-test the changed pages.
- [ ] Update the design and the TODOs of this plan for each problem that the mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

- [ ] Update `docs/protocol/workspace-life.md` so that the Terminal shows during a start, with the held line and the early Enter.
- [ ] Update the Terminal section of `docs/protocol/workspace-tools.md`.
- [ ] Update `src/shell/workspace/screen-parts.md`, `src/terminal/README.md`, and `worker/terminal/README.md`.
- [ ] Update the public guide `src/marketing/docs/terminal-and-previews.md`. Read each public guide in full, and update each sentence that restates a changed fact.
- [ ] Read the Terms and Privacy pages in full. Update each sentence that restates a changed fact.
- [ ] Check the terminal rows of `src/marketing/from-conductor/`.

## Milestone 3: First-prompt signal

Depends on: 2

- [ ] Choose the first-prompt mechanism in a real cloud computer. Prefer one that the start command in `worker/terminal/service.ts` delivers at each start. Record the call in this plan.
- [ ] Measure the time from the connection to the first prompt. Record the time limit in this plan, and the measurement under `.context/early-terminal/`.
- [ ] Add the mechanism to the terminal software, with tests.
- [ ] Do decision 3 C or E here, if Cal chooses one of them.

## Milestone 4: One terminal screen through the states

Tags: ui

Depends on: 2

- [ ] Split the xterm.js screen from the connection, so one screen lives through `loading`, `starting`, and `ready`.
- [ ] Build xterm.js at mount and call `open` when the host has a size. Delete `plans/follow-ups/hidden-terminal-line-spacing.md`.
- [ ] Keep the current behaviour of the ready terminal. Run its tests.

## Milestone 5: Held line and status line

Tags: ui

Depends on: 3, 4

- [ ] Add the held-line editor, the early prompt, and the status line.
- [ ] Send the held line at the first-prompt signal, with Enter when the user typed it.
- [ ] Show "not sent" when no signal comes within the time limit of Milestone 3.
- [ ] Add tests for each key rule, for paste, for the signal, and for the time limit.

## Milestone 6: Terminal during a start

Tags: ui

Depends on: 5

- [ ] Mount the Terminal tool during a start in `ToolsPart` and `WorkspaceScreen`. Keep the wait panel for the other tools.
- [ ] Add tests for a start, a resume at open, a failed start, and a stop.
- [ ] Check the change in a browser with a real start.

## Milestone 7: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run the targeted tests and `npm run check`.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the `implementation-review` skill after the push. Report the findings, then apply the fix rule: fix the `fix now` findings, record follow-up items under `plans/follow-ups/` for the rest, re-review once, and report.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the plan".
- [ ] Open the pull request. Its description gives the decisions and the design calls of this plan with their dates, a permalink to this plan, and the follow-up items that the change adds.

## Post-merge follow-up (non-blocking)

- [ ] Start a stopped workspace on the test deployment. Type a command during the start, and check that it runs at the first prompt.
