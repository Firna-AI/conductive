# One failed save of agent text fails the whole turn

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-08, the blocked wider fix of finding 2 of PR #48, branch `conductor/boat-native-remote-workspaces-milestone-7v`, round 1, option D of its check, with a problem outside the scope of that check.
- **Location:** `Runner.emit` in `runner/src/runner.ts:150`, and the catch in `runner/src/engine-runtime.ts:203`.

- **Terms:**
  - **Runner:** the program in each cloud computer that runs the agent and saves each event to a state file before it sends it to the app.
  - **Agent output:** the text, tool updates, and thinking that the agent writes during a turn.
- **Background:** The runner saves each event to its state file. A failed save keeps the event in memory, and the next save that works writes it. Today a failed save of agent output rejects its caller, and the running turn then ends with `turn.failed`, also when the agent already finished its work. Decision 109 says that the runner still ends a step after a failed read or save. Milestone 7v fixes the lost text of a failed final save, but not this rule.
- **Problem:** One failed save of agent text, for example during a short disk error, fails the whole turn, although the next save would keep the text.
- **Impact if no action:** A short disk error in a cloud computer shows a failed turn for work that the agent finished. The user must send the message again.
- **Root question:** What does a failed save of agent output do to a running turn?
- **Options:**
  - **A.** Keep the rule: a failed save of agent output fails the turn. Effort: Small.
  - **D.** A failed save of agent output keeps the event in memory, tries one more save, warns, and lets the turn go on. The next save that works writes and sends the event. A failed save of `turn.started` still fails the turn. Risk: a lasting disk failure no longer stops the agent, and each new output event type must join the list. Effort: Medium.
- **Left out:** Saving a failed entry a second time from the buffer, because the failed save already kept it in memory, so the chat would show it twice.
- **Wider fix:** D. No output loop can then stop early, whatever its shape.
- **Previous examples:** commit `6d5d54e`, which made the output filter loop attempt every event after a failed save, decision 109 D, and finding 2 of PR #48.
- **Recommendation:** D. A short disk error then costs a warning, not a failed turn.
- **Action:** fix after merge, apply D, because the user chose A now and D as a later follow-up on 8 November 2026 (decision 131).
