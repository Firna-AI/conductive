# Fixed prompts expose hidden branch values

- **Severity:** High. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-23, from the second review of `calummoore/merge-queue-k2ep`.
- **Location:** `src/ui/components/workspace/barCopy.ts`, `src/ui/components/workspace/mergeLatestCopy.ts`, `worker/chat/session-titles.ts`, and `docs/protocol/tokens-and-secrets.md:113`.
- **Reason:** The problem exists on `origin/main` in the ordinary pull request actions. A separate change can fix those actions for workspaces outside the merge queue.

- **Source:** Review. **Category:** Security.
- **Terms:**
  - **Fixed prompt:** A message that the app writes and sends as the member who selects a pull request action.
  - **Branch label:** The name a screen shows after it hides known secret values.
- **Background:** Create PR opens a pull request into the workspace's base. Resolve conflicts and Merge latest fetch that base to update the workspace branch. Screens must show masked branch labels. A session can take its first message as its title.
- **Problem:** On `origin/main`, the three ordinary prompts put the raw base branch name in their message text. The chat shows that text. A session title derived from it can also show the raw name. A test in `src/github/barPrompts.test.ts` expects the raw name in the message even when the banner has a masked label.
- **Screenshot:** The bar shows the masked base label. The resulting chat message shows the value that the label hides.
- **Impact if no action:** Other members can see a known secret value in chat, session titles, and copied transcripts.
- **Root question:** How can the ordinary actions give Git the correct base while chat and session titles show its masked label?
- **Options:**
  - **A.** Use pull request refs or verified commits where available. Supply the execution base separately for Create PR and any action that needs a branch name. Show its masked label in the message and title. Effort: Medium.
  - **B.** Give app-generated prompts separate execution and display text. Use the display text in chat, transcripts, and title generation. Effort: Large.
  - **C.** Filter at every chat output boundary, including derived titles. This also affects values that members type if the filter applies to all messages. Effort: Medium.
- **Left out:** Use the masked label as the command argument. That can select the wrong base or cause Git to fail.
- **Wider fix:** C covers text from other sources as well. Its scope needs a separate decision.
- **Previous examples:** The 23 November 2026 queue prompt change uses pull request numbers and commits in Git commands and masked branch labels in message text.
- **Related:** `merge-queue-chat-output-mask.md` holds the decision about masking all chat text.
- **Recommendation:** A. It fixes the three known sources while preserving their Git inputs.
- **Action:** Fix after merge in a separate branch. Verify all three chat messages and their derived titles.
