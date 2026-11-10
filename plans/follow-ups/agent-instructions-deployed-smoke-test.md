# Check agent instructions in a deployed workspace

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-09, from branch `conductor/conductor-prompts`.
- **Location:** `docs/protocol/agent-instructions.md`, the deployed app, and the runner in a new workspace.
- **Reason:** this check needs the merged Worker and an org image with the new runner.

- **Terms:**
  - **Agent instructions:** the fixed workspace facts that the runner gives each agent session before its messages.
  - **Sender line:** the display name and GitHub login that the runner adds to each input for the agent.
- **Background:** The runner gives agents powered by Claude and Codex the repository folders and the tracked and target branches. Each session keeps its chosen instruction text across turns and sandbox resumes. Each input also names its current sender. The chat and stored user message keep only the text that the member wrote. The sender line grants no access. Mac commands and GitHub operations still belong to the member whose message started the turn.
- **Task:**
  1. Use the deployed Worker and rebuild an org image with the new runner.
  2. Create a new workspace from that image. Start a session for each agent with a valid connected login.
  3. Ask each agent for its repository folders, tracked branch, target branch, and the sender of the message. Compare the replies with the workspace record and the signed-in member.
  4. Let a second org member send a message to each session while its starter permits login sharing. Ask who sent the message. Check that the answer names the second member.
  5. Confirm that the chat shows only each member's original message text. Stop and resume the cloud computer. Ask each agent again for its workspace facts and sender.
  6. Save sanitized replies and the deployed versions under the ignored `.context/` directory of the verification workspace. Record each mismatch without including credentials.
- **Impact if no action:** Local provider tests and SDK proofs do not show that a deployed Worker, image, and multi-member session work together.
- **Needs:** The merged and deployed change, a new org image with the runner update, valid Claude and Codex logins, and two org members who permit the test.
- **Done when:** Both agents report the correct workspace facts and the sender of each message. A sandbox resume keeps each session's instruction text. The stored message and chat contain no added sender line.
