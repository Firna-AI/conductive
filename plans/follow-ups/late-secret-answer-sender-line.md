# Late secret answers have a sender line

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-20, from UI research on `calummoore/wake-a-session-when-a-turn-ends-b5kh`.
- **Location:** `docs/protocol/message-lines.md`, `runner/sdk-helper/src/providers/message.ts:36`, `runner/sdk-helper/src/providers/claude-input.ts`, `runner/sdk-helper/src/providers/codex-input.ts`, and `worker/secrets/late-delivery.test.ts:86` and `:120`.
- **Reason:** This mismatch predates the watch call and concerns the existing late-secret-answer contract.

- **Terms:**
  - **Late answer:** an answer to a secret request after its tool call stopped waiting.
  - **Sender line:** the agent-only message line that names a member and their ID.
- **Background:** A late answer saves an app notice as a hidden message in `worker/chat/secret-notice.ts`. The stored sender belongs to the asking turn, or to the turn that the notice joins. The late-delivery test checks separate text and sender fields. One assertion expects `member gave TOKEN for this workspace.` and sender ID `owner`. The shared `senderLines` builder in `runner/sdk-helper/src/providers/message.ts:36` writes the attribution. The Claude and Codex input builders place it after ordinary message text under the current message-lines contract. Older installed runners can prepend it. `runner/sdk-helper/src/providers/instructions.test.ts:56` and `:83` check ordinary member-message attribution, not late-answer notices.
- **Problem:** The protocol says the notice names the answering member in place of a sender line. The implementation sends both the sender line and the notice text.
- **Impact if no action:** The protocol misstates the agent input. The agent gets the asking or running turn's sender line with words that name the answering member. Neither cited test pins that final text for a late-answer notice. Removing only the sender line from late-answer input would leave both cited tests passing.
- **Root question:** What sender information should the agent receive with a late secret answer?
- **Options:**
  - **A.** Document the current sender line and app text. Keep the stored authority and behavior. Effort: Small.
  - **B.** Remove the sender line for late-answer notices. Keep the stored sender for access. This needs a compatible way to identify app notices. Effort: Medium.
  - **C.** Add an explicit system-message contract for app notices and their attribution. Move all app notices to it. Effort: Large.
- **Left out:** Removing attribution from the notice text loses the answering member. Changing the stored turn sender would change access and is unnecessary.
- **Wider fix:** None. The documentation alignment rule already requires the protocol and behavior to agree.
- **Previous examples:** None found in the focused search.
- **Recommendation:** A. It states the behavior that callers already receive without changing access or older runners.
- **Action:** Ask the user in separate work. The protocol and implementation disagree, and no recorded choice settles which behavior to keep.
