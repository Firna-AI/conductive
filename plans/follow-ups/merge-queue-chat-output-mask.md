# Mask branch secrets at chat output

- **Severity:** High. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-23, finding 13 of `calummoore/merge-queue-k2ep`.
- **Location:** `worker/chat/queue-fix.ts`, `src/chat/components/TranscriptItem.tsx`, and `worker/chat/session-transcript.ts`.
- **Reason:** A shared chat filter would also hide secret values that members type in their own messages. That change needs a decision.

- **Source:** Review. **Category:** Security.
- **Terms:**
  - **Branch label:** The name a screen shows after it hides known secret values from the workspace's latest computer start.
  - **Chat output boundary:** The text that chat, copied transcripts, and session titles expose to a reader.
- **Background:** The queue sends rebase instructions as chat messages. On 23 November 2026, the queue prompts moved to numbered pull request refs and commits for Git. Their branch labels use the workspace's secret filter. `docs/protocol/tokens-and-secrets.md` requires such labels on screens.
- **Problem:** In a reproduced restack, the pull request bar hid a synthetic secret that appeared in the stored chat message. The prompt change protects new queue prompts. A later prompt that inserts an unfiltered value could still expose it. A shared output filter would also change the display of text that members submit themselves.
- **Screenshot:** The restack message in chat showed the synthetic value that the bar hid.
- **Impact if no action:** Other sources of chat text can expose known secret values in shared history, transcript copies, and screen captures.
- **Root question:** Which chat text should hide known secret values before a reader sees it?
- **Options:**
  - **A.** Keep the filters at the sources of app prompts. Add a source filter when a prompt uses a branch label. Member-authored text keeps its current display. Effort: Small.
  - **B.** Filter app-generated prompts and titles through one output rule. Mark their source so the same rule can cover transcript copies. Effort: Medium.
  - **E.** Filter all displayed chat text through a shared output rule. Apply it to screen text, transcripts, copies, and derived titles. This also hides secret values typed by members. Effort: Medium.
- **Left out:** Replace raw command inputs with masked names. Git cannot use those names to identify the correct branch.
- **Wider fix:** E. It covers a leak even when a new message source applies no label filter.
- **Previous examples:** Commits `0be683d13` and `b3bba92fe` give Continue and Change repository separate display labels and execution values.
- **Related:** `fixed-prompts-show-raw-branch-names.md` tracks the existing prompts outside the queue.
- **Recommendation:** E. It protects every chat output path when the same secret arrives from different sources.
- **Action:** Ask the user, because E changes the display of secret values that a member types.
