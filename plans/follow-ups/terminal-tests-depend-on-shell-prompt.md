# Terminal bridge tests depend on the host prompt

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-18, from the complete gate of branch `calummoore/follow-up-read-only-mac-app-copies-never-9ai6` at commit `0bb735ef334484c181e6cf58f71af1e52178cfe6`, at the request of the parent orchestrator of that branch.
- **Location:** `worker/terminal/bridge/bridge.test.ts:22`, the `prompt` pattern and its nine waits, and the waits for `/\$ /` at lines 87 and 119. `worker/terminal/bridge/bridge.test-support.ts:67`, `tmuxServer`, line 131, the `Viewer` constructor, and line 181, `Viewer.waitFor`.
- **Reason:** The branch that met the failures changes no file under `worker/terminal/`, so a separate branch must fix the test harness.

- **Terms:**
  - **Conductive workspace:** a cloud computer where an agent works on one branch. Its checkout is at `/home/user/code/remote-code`. Its home folder is `/home/user`.
  - **Terminal bridge:** the program that passes the output of a tmux pane to a workspace terminal viewer. Its entry is `worker/terminal/bridge/main.ts`.
  - **Real-tmux case:** one of the nine tests under `the terminal bridge with a real tmux` in `worker/terminal/bridge/bridge.test.ts`. Each runs a real tmux, the real bridge, and a real login Bash.
  - **Login Bash:** Bash started with `-l`. It reads the system startup files, then a startup file of the home folder, such as `~/.profile`.
  - **Prompt wait:** the first wait of each real-tmux case. It waits until the raw output holds `/\$ $/m`, the end of a Bash prompt.
- **Background:**
  - `worker/terminal/bridge/bridge.test.ts` holds ten tests. These are the nine real-tmux cases, by their full names under `the terminal bridge with a real tmux`:
    1. `passes every line of fast output, so xterm.js keeps the history`
    2. `shows the history to a new connection, at the size of that connection`
    3. `rebuilds a full-screen program for a new connection, and the history after it`
    4. `keeps the colour of a run that crosses lines for a new connection`
    5. `pastes with the bracketed paste marks of a program, also after a reconnect`
    6. `gives the window the size of the viewer that typed last`
    7. `keeps a size that a program sets inside the limit, then takes its own size again`
    8. `drops the output while the screen does not acknowledge, and rebuilds the screen when it caught up`
    9. `ends the connection when the shell ends`
  - The tenth test, `starts no server, and exits with code 3 so that the launcher runs the plain client`, has no prompt wait.
  - `tmuxServer` in `worker/terminal/bridge/bridge.test-support.ts` makes a run folder `.context/terminal-bridge-tests/run-<six random characters>` under the current folder. Vitest runs in the checkout, so the run folder is inside the Git work tree.
  - `tmuxServer` starts a private tmux server with `-f /dev/null`. Each viewer runs the production bridge `worker/terminal/bridge/main.ts` in a pseudo terminal of its size.
  - The bridge creates the tmux session with `/bin/bash -l` in the run folder. The product starts the shells of workspace terminals in the same way.
  - The test sets no environment for the tmux server or the viewers. So tmux and its login Bash inherit the environment of the test process, with its `HOME`.
  - The production session server also sets a prompt command from `terminalPromptCommand` in `worker/terminal/scripts.ts`. That command makes the prompt show only the folder name, not the full path. The test server sets no prompt command.
  - Each real-tmux case first connects a viewer of 12 rows and 60 columns. Its prompt wait then waits up to 10 seconds for `prompt = /\$ $/m` in the raw output bytes.
  - The comment of that pattern says that the prompt differs between machines. Two later waits also look for a prompt: `/\$ /` at line 87, after `less` quits, and at line 119, after a reconnect.
  - In the Conductive workspace of the failing run, the login Bash reads `/home/user/.profile`, which reads `/home/user/.bashrc`. That file sets this prompt: `PS1='\[\e[32m\]$(git_prompt)\[\e[0m\]:\[\e[34m\]\w\[\e[0m\]$ '`.
  - Its function `git_prompt` prints the current branch from `git branch` in square brackets. In the run folder, `git branch` gives the branch of the checkout.
  - On 2026-11-18, `npm run check` ran in that workspace on branch `calummoore/follow-up-read-only-mac-app-copies-never-9ai6`, at commit `0bb735ef334484c181e6cf58f71af1e52178cfe6`. The branch name has 56 characters.
  - The run reported 13 failed tests in 6 files. Nine of the failed tests are the nine real-tmux cases. The tenth test of the file did not fail. This item covers only the nine cases.
  - Each of the nine cases failed at its prompt wait with `Error: The output never held /\$ $/m. It ends with "…"`. The quoted output ends with this text, with a run suffix that changes in each case: `\u001b[32m[calummoore/follow-up-read-only-mac-app-copies-never-9ai6]\u001b[0m:\u001b[34m~/code/remote-code/.context/terminal-bridge-tests/run-FowS0l\u001b[0m$\r\n\r "`.
  - So the prompt holds the branch name and the full path of the run folder. After the `$`, the bytes hold a carriage return, a line feed, a carriage return, and then the space.
  - The prompt in that output has 121 visible characters on a 60-column screen. So the `$` is the last character of the second row, and the space starts the third row.
  - Rerun: `npm run test -- worker/terminal/bridge/bridge.test.ts -t 'passes every line of fast output' --reporter=verbose` in the same checkout failed again. It gave 1 failed, 9 skipped, and exit code 1, in 13.25 seconds. The prompt wait failed after 10054 ms with the same text.
  - Baseline: unchanged `main` at `9983ba58be06f4a082bc34a806d507b5853c73a0` ran the whole file in a detached worktree under `/tmp` on the same cloud computer. All nine real-tmux cases passed their prompt waits. That checkout had another path and no branch name.
  - In that baseline run, 9 tests passed and 1 failed. The fast-output case failed later, at `expect(shown.at(-1)).toBe(3000)`, with `AssertionError: expected 755 to be 3000 // Object.is equality`. Alone, it then passed, with 1 passed and 9 skipped.
  - The failure reproduced twice on this branch name in that checkout. To reproduce it, run the file on a local branch with the same name, in a workspace checkout at `/home/user/code/remote-code`.
  - Suspected source: the prompt wait reads the prompt that the startup files of the host give the login Bash. That prompt, and the place where it breaks, change with the branch name, the checkout path, the home folder, and those files.
  - Not shown: the shortest branch name that fails, which program writes the line break, and whether every long prompt fails.
  - Fix goal: the real-tmux cases pass or fail by the behaviour of the bridge, whatever the branch, the checkout path, the home folder, or the startup files of the host.
  - All options keep the real tmux, the production bridge with its login Bash, and every existing assertion. CI always runs these cases, as `runTmuxTests` in the support file says. The flaky-test rule of the `testing` skill keeps every assertion and adds no retry, sleep, or skip.
- **Problem:** In the workspace of the failing run, each of the nine real-tmux cases fails at its prompt wait, before its checks. The long prompt of the host breaks its line between the `$` and its trailing space, so the pattern never matches.
- **Impact if no action:** The complete gate stays red in a workspace where the prompt breaks this way, also for a change that touches no terminal code. There, the nine cases check no bridge behaviour, and an agent can mistake the failure for a regression.
- **Root question:** How do the real-tmux cases know that the shell is ready, whatever prompt the host gives the login Bash?
- **Options:**
  - **A.** Give the login Bash of the tests an isolated startup with one fixed short prompt. The test tmux server and the viewers get a fresh home folder under the run folder. Its startup file sets a fixed prompt, such as `$ `, and clears the prompt command. The bridge still starts its real login Bash through `worker/terminal/bridge/main.ts`. The waits and every assertion stay as they are. Reproduce the failure before the change, and record ten passes of each case after it. Cost: one change in the harness. The system startup files still run first, so the startup file must set the prompt last. Effort: Small.
  - **B.** Wait for a readiness marker in place of the prompt. One harness helper types a command whose output holds a unique marker that its own echo cannot hold. It waits for that output after a mark. The nine prompt waits and the two waits for `/\$ /` move to the helper or to another explicit signal. Cost: each typed command adds lines to the screen and to the shell history, so each case must keep its assertions true. The case that pastes into `od` cannot type while `od` reads its input. The login Bash still reads the startup files of the host. Effort: Medium.
- **Left out:**
  - A pattern that allows a line break between the `$` and the space, or a check of the screen that xterm.js draws: the wait still reads the prompt of the host, which can change again. It fails the goal.
  - The prompt command of the production session server in the test server: it shortens only the path. The prompt still comes from the startup files of the host and still holds the branch name, so it fails the goal.
  - A wider viewer: the cases assert the size of 60 columns and 12 rows, and a longer prompt still wraps.
  - A fixed prompt or `--noprofile` in the product: it changes the shell that people get in their terminals, only to pass a test.
  - A run from a copy under `/tmp`, a shorter branch name, or a written rule: workspace branches keep their names, and each agent must remember the rule. It fails the goal.
  - A skip in workspaces, a fake tmux, a retry, or a longer wait: a skip or a fake drops the real check, and the pattern never matches, so more time cannot help.
- **Wider fix:** A. One fixed startup in `tmuxServer`, the one entry of the harness, reaches every real-tmux case, also new ones. It removes the dependency on the host with no guard.
- **Previous examples:** `plans/follow-ups/worker-tests-fail-under-home-folder.md`, Worker tests that pass or fail by the path of the checkout.
- **Related:**
  - `plans/follow-ups/terminal-fast-output-readiness.md`: same file and same `Viewer.waitFor`. It covers a later wait of the fast-output case that can match the command echo, at the assertion that failed in the baseline run. One branch can fix both items. Neither fix replaces the other.
  - `plans/follow-ups/worker-tests-fail-under-home-folder.md`: the same class of a test that depends on the host. It covers the paths of Worker tests, not this prompt wait.
- **Recommendation:** A. It removes the dependency on the host prompt for every real-tmux case with one harness change, and it keeps every wait and assertion.
- **Action:** fix after merge, apply A, because the failure is outside the diff of the branch that met it, and one fix in a separate branch reaches every open branch.
