# Late-answer line reaches agent with sender line

- **Severity:** Low. **Likelihood:** Common. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-20, from branch `calummoore/workspace-capability-prompts-issue-2daj`, the options check of `plans/capability-prompts.md`.
- **Location:** `worker/chat/secret-notice.ts` lines 43-95, `runner/sdk-helper/src/providers/message.ts` line 36.
- **Reason:** The capability change lines add a runner command for a line of the app, and this item can reuse it after that change merges.

- **Terms:**
  - **Late-answer line:** the text that the app sends to an agent when a member answers a secret request after the agent's call ended.
  - **Sender line:** the `Sender:` line that the sdk-helper puts before each message to an agent.
- **Background:** The Worker stores the late-answer line as a member message, with the sender of the turn that asked. The sdk-helper writes a `Sender:` line from that sender. `docs/protocol/message-lines.md` says that the late-answer line names the member who answered in place of a sender line.
- **Problem:** The agent reads `Sender:` with the member of the turn, then text that names another member. The code does not meet the protocol doc.
- **Impact if no action:** The agent can think that the member of the turn wrote the line. No access changes, because the Worker takes the sender of each action from its own record.
- **Root question:** How does the agent see that a late-answer line comes from the app, not from a member?
- **Options:**
  - **A.** Send the late-answer line through the `notice` runner command that the capability change lines add. The agent then reads an app header in place of a sender line. Effort: Small.
  - **B.** Add an optional marker on the member message, so that the sdk-helper writes an app header for it. Effort: Small.
  - **C.** Change the protocol doc to say that the line comes under the sender line of the turn. Effort: Small.
- **Left out:** None.
- **Wider fix:** A. One path then carries each line of the app.
- **Previous examples:** None found.
- **Recommendation:** A. It reuses the new command and meets the doc in force.
- **Action:** fix after merge, apply A, because the `notice` command must exist first.
