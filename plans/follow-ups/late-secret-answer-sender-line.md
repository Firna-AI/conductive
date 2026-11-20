# Late secret answers have a sender line

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-20, from UI research on `calummoore/wake-a-session-when-a-turn-ends-b5kh`.
- **Location:** `docs/protocol/message-lines.md:36`, `runner/sdk-helper/src/providers/message.ts:36`, and `worker/secrets/late-delivery.test.ts`.
- **Reason:** This mismatch predates the watch call and concerns the existing late-secret-answer contract.

- **Terms:**
  - **Late answer:** an answer to a secret request after its tool call stopped waiting.
  - **Sender line:** the agent-only message prefix that names a member and their ID.
- **Background:** A late answer saves an app notice as a hidden message in `worker/chat/secret-notice.ts`. The stored sender belongs to the asking turn, or to the turn that the notice joins. The provider message builder prepends a sender line to every message. The late-delivery test expects that prefix.
- **Problem:** The protocol says the notice names the answering member in place of a sender line. The implementation sends both the sender line and the notice text.
- **Impact if no action:** A future change can follow the protocol and remove behavior that the existing test expects.
- **Root question:** What sender information should the agent receive with a late secret answer?
- **Options:**
  - **A.** Document the current sender prefix and app text. Keep the stored authority and behavior. Effort: Small.
  - **B.** Remove the prefix for late-answer notices. Keep the stored sender for access. This needs a compatible way to identify app notices. Effort: Medium.
  - **C.** Add an explicit system-message contract for app notices and their attribution. Move all app notices to it. Effort: Large.
- **Left out:** Removing attribution from the notice text loses the answering member. Changing the stored turn sender would change access and is unnecessary.
- **Wider fix:** None. The documentation alignment rule already requires the protocol and behavior to agree.
- **Previous examples:** `worker/secrets/late-delivery.test.ts` checks the sender line before the late-answer words.
- **Recommendation:** A. It states the behavior that callers already receive without changing access or older runners.
- **Action:** Ask the user in separate work. The protocol and implementation disagree, and no recorded choice settles which behavior to keep.
