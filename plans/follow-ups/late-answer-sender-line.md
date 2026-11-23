# Late-answer line reaches agent with sender line

- **Severity:** Low. **Likelihood:** Common. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-20, from branch `calummoore/workspace-capability-prompts-issue-2daj`, the options check of `plans/capability-prompts.md`.
- **Location:** `worker/chat/secret-notice.ts` lines 43-95, and `senderLines` in `runner/sdk-helper/src/providers/message.ts`.
- **Reason:** The capability change notes add the paths for a line of the app, and this item can reuse them after that change merges.

- **Terms:**
  - **Late-answer line:** the text that the app sends to an agent when a member answers a secret request after the agent's call ended.
  - **Sender line:** the `Sender:` line that the sdk-helper adds to each member message that reaches an agent. It names the member who sent the message.
  - **App header:** the line "Line of the app: no member wrote this text." The sdk-helper gives it in place of a sender line for a line of the app, such as a change note of the capabilities.
- **Background:**
  - The Worker stores the late-answer line as a member message. Its sender is the sender of the running turn, or the sender of the turn that asked when no turn runs. The sdk-helper writes a sender line from that sender.
  - When no turn of the session runs, the late-answer line starts a turn. When a turn runs, the line joins that turn as a message. `docs/protocol/secret-late-answers.md` states both rules under "Late answers". It also rejects a late answer that waits for the next message.
  - `docs/protocol/message-lines.md` says that the late-answer line names the member who answered in place of a sender line.
  - The change notes of the capabilities reach the agent under the app header on two paths. In an idle session, they go in the `notices` of the next turn command. While a turn runs, the runner command `notice` gives them to that turn.
  - The `notice` command never starts a turn. A change note that the turn did not take waits for the next turn. The Worker sends lines of the app only to a runner that announces them in its hello.
- **Problem:** The agent gets the late-answer text in a message with a sender line that names the member of the turn. The text itself names the member who answered, who can be another member. The code does not meet the protocol doc.
- **Impact if no action:** The agent can think that the member of the turn wrote the line. No access changes, because the Worker takes the sender of each action from its own record.
- **Root question:** How does the agent see that a late-answer line comes from the app, not from a member?
- **Options:**
  - **A.** Send the late-answer line as a line of the app, under the app header. When the line starts a turn, it goes in the `notices` of that turn command. When a turn runs, it goes through the `notice` command. A turn command needs a member message today. So a turn that only the line starts needs a turn command with lines of the app alone. A line that the running turn did not take must still start a turn, unlike a change note. A runner that does not announce lines of the app keeps the member message path. Effort: Medium.
  - **B.** Add an optional marker on the member message, so that the sdk-helper writes an app header for it. Effort: Small.
  - **C.** Change the protocol doc to say that the line comes with the sender line of the turn. Effort: Small.
- **Left out:** None.
- **Wider fix:** A. One path then carries each line of the app.
- **Previous examples:** None found.
- **Recommendation:** A. It reuses the paths of the change notes and meets the doc in force.
- **Action:** fix after merge, apply A, because the paths of the change notes must exist first.
