# Wait for completed terminal output in the test

- **Severity:** Medium. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-17, from CI of PR 439 on `calummoore/stops-show-why-a-turn-stopped-ccqn`.
- **Location:** `worker/terminal/bridge/bridge.test.ts:25`, the fast-output test, and `worker/terminal/bridge/bridge.test-support.ts:181`, `Viewer.waitFor`.
- **Reason:** The unchanged real-tmux test failed and then passed, so its fix belongs in a separate branch.

- **Source:** Implementation, CI failure outside the diagnostic change.
- **Category:** test.
- **Terms:**
  - **Terminal bridge:** The program that passes a tmux pane's output to a workspace terminal viewer.
  - **tmux:** The terminal program that runs the shared shell and stores its history.
  - **xterm.js:** The terminal renderer whose headless build replays the output in this test.
  - **Command echo:** The shell terminal's display of the command before the command runs.
- **Background:** The test `passes every line of fast output, so xterm.js keeps the history` uses a real tmux. It sends `seq 1 3000; echo END`, then waits for `END\r\n`. It replays the bytes in xterm.js and checks the last number, history length, and consecutive lines. The runner diagnostics change touches neither this test nor its production code. The intervening main merge changed no terminal bridge file or dependency manifest.
- **Problem:** CI run 44095588319 on commit `921229b62d602cf5a65b34373d606dc22d683c78` failed at `expect(shown.at(-1)).toBe(3000)` with `AssertionError: expected undefined to be 3000`. Fresh CI run 44097068658 on merge `cef468b13133c79758cf04081d7f4999f375cc90` passed this exact test in 769 ms. Its shard passed all 308 files and 931 tests, with no skips.
- **Suspected source:** `Viewer.waitFor` tests whether raw output contains the requested text. The echoed command itself ends with `END\r\n`. That can satisfy the wait before the command writes its numbers. Confirm this event order before changing the test. No captured failing output proves the cause yet.
- **Impact if no action:** A passing implementation can receive a red complete gate. Repeated runs cost CI time and make a real regression harder to assess.
- **Root question:** How should the test wait for completed command output before it checks the terminal history?
- **Options:**
  - **A.** Change this test to wait for an execution marker that cannot match the command echo. Limit the wait to output after the command starts. Keep every history assertion. Cost: a local fix that other cases must repeat. Effort: Small.
  - **B.** Add a shared helper that sends a command and waits for a marker which its command echo cannot contain. Use a fresh output mark. Move existing completion waits to the helper and preserve all assertions. Reproduce the race before the fix. Record pass counts before the fix and ten passes of each changed asynchronous case after the fix. Cost: one helper and its callers. Effort: Small.
- **Left out:** A sleep, a retry, or a longer timeout does not prove readiness and can hide the race. Mocking tmux drops the real-terminal requirement. Waiting only for pane state does not prove that the viewer received the output. There are two useful approaches: a direct execution marker or a shared helper that owns it.
- **Wider fix:** B. The helper prevents a command echo from satisfying a command-completion wait.
- **Previous examples:** The history test in `bridge.test.ts` also sends a command that ends with `echo END` and waits for `END\r\n`. The colour test waits for `red2`, which also appears in its echoed command. These are other uses of the same wait pattern, not confirmed CI failures.
- **Recommendation:** B, after reproducing and confirming the suspected event order. It gives the tests one explicit readiness boundary without changing product behavior.
- **Action:** fix after merge, apply B, because the flaky test is outside the diagnostics change and needs one fix that reaches all branches.

Failure: https://github.com/Firna-AI/conductive/actions/runs/44095588319.
Passing recheck: https://github.com/Firna-AI/conductive/actions/runs/44097068658/job/134086888750.
