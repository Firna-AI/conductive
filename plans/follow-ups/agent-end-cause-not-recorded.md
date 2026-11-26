# The cause of an agent end is not recorded

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-18, from branch `calummoore/agent-stopped-mn5l`, item 2 of the investigation of "The agent process ended."
- **Location:** `runner/sdk-helper/src/providers/process.ts:29`, `runner/sdk-helper/src/providers/claude-process.ts:24`, `crates/cnd-runner/src/helper/process.rs:35`, and `docs/protocol/runner-warnings.md`.
- **Reason:** Option B changes the runner messages and stop diagnostics decision 4, so the user decides.

- **Source:** Implementation. **Category:** Product bug.
- **Terms:**
  - **SDK helper:** the Node program in each cloud computer that starts the Claude or the Codex program for the runner, in `runner/sdk-helper/`.
  - **Turn-end warning:** the line that the Worker writes to its log for each turn that ends without a Stop request, as `docs/protocol/runner-warnings.md` says.
  - **Stop diagnostics decision 4:** the decision in `docs/protocol/runner-warnings.md` that keeps the cause of a stopped turn out of the runner messages, because a new end reason is a larger change.
- **Background:** When an agent program ends during a turn, the chat says "The agent process ended." The helper discards the error output of the agent program, with `stdio: ['pipe', 'pipe', 'ignore']`. It keeps no exit code and no signal. The runner also discards the error output of the helper, with `Stdio::null()`. On 18 November 2026, an investigation of this text in a Mokly workspace took hours. The helper itself had stopped Codex with SIGTERM, after an output line that it could not read. No log said so.
- **Problem:** No one can tell a crash of the agent program, a kill by the system, and a stop by the helper apart.
- **Additional evidence:** A service lifetime probe on 21 November 2026 confirmed this diagnostic limit after a real idle stop and resume. The old boot ID was `18ebf1ea-06dd-4827-9f03-a4f98dcd3485`. The new boot ID was `32d060d9-950c-4ca6-9736-4bbe1a720bd5`. The restored disk held no journal or text system-log lines from the old boot. It held about 3,000 lines from a build machine, `box-node-f844b349b5a3ea97`, instead. Those lines covered 12:05:27 to 12:12:21 UTC.

  Evidence files in the checkout survived, including continuous process heartbeats until about 13:02:50 UTC. Neither heartbeat stream recorded a stop signal. The missing journal therefore prevented a firm conclusion about the guest shutdown path. The services themselves ended, and none returned after resume. This is one observed restore, not a claim about every provider or every stop.
- **Impact if no action:** Each case needs a manual read of the cloud computer. The evidence is lost when the cloud computer stops.
- **Root question:** How does an operator learn why an agent program ended?
- **Options:**
  - **A.** The helper writes a warning with the exit code, the signal, and the last lines of error output. The warning goes only to the runner journal. No protocol change. The journal is lost when the cloud computer stops. Effort: Small.
  - **B.** Option A, and the runner also sends the exit code and the signal with the failed turn. The Worker writes them to its log, beside the turn-end warning. The error text stays in the cloud computer, so no secret reaches the log. This adds optional fields to the runner messages and changes stop diagnostics decision 4. Effort: Medium.
  - **C.** Option B, and the chat also shows a short cause, such as "The agent process ended with signal 9." This changes text that users see. Effort: Medium.
- **Left out:** Send the full error output to the Worker log. It can hold secrets, and the warning rules of `docs/protocol/runner-warnings.md` forbid error text.
- **Wider fix:** B. It records the cause of every later agent end, for Claude and for Codex.
- **Previous examples:** Stop diagnostics decisions 4 and 5 in `docs/protocol/runner-warnings.md` added warnings for the same kind of gap.
- **Related:** `plans/follow-ups/codex-unreadable-output-cause.md` gives the text of a stop by the helper itself. Both items help an operator name the cause of an agent end.
- **Recommendation:** B. The exit code and the signal stay after the cloud computer stops, and they tell a crash from a kill.
- **Action:** ask the user, because option B changes the runner messages and stop diagnostics decision 4, and no decision covers that change.
