# The chat README passes 300 lines

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-09, from the documentation milestone of the fold of the work of an ended turn, branch `calummoore/tool-calls-and-thinking-collapse`.
- **Location:** `src/chat/README.md`.
- **Reason:** other open branches edit the same README, so one split after they merge avoids merge conflicts.

- **Terms:**
  - **Chat guide:** a Markdown file beside the chat README that holds one group of rules for the chat code, such as `src/chat/transcript.md` and `src/chat/sessions.md`.
- **Background:** `src/chat/README.md` documents the chat of a workspace: how the app mounts it, a chat that the app keeps, the rules for the code, the development page, the tests, and the key code. The always-on rules keep each file near 200 lines and split a file that passes 300 lines. The README had 323 lines on `main` on 9 November 2026, and the fold of the work of an ended turn adds a few more.
- **Problem:** The README passes 300 lines, and each change to the chat makes it longer.
- **Impact if no action:** A reader scans a long page to find one rule, and the file goes further past the limit.
- **Root question:** How does the chat README stay under 300 lines?
- **Options:**
  - **A.** Move "A chat that the app keeps", about 32 lines, into its own chat guide. The README then has a little under 300 lines. Effort: Small.
  - **B.** Move "Rules for this code", about 85 lines, into a chat guide beside `transcript.md` and `sessions.md`. The README then has about 245 lines. Update each link to `src/chat/README.md#rules-for-this-code`, such as the one in `plans/follow-ups/chat-session-record-owner.md`. Effort: Small.
- **Left out:** Change nothing, because it breaks the length rule. Move "Use it in the app", because a README keeps its interface docs.
- **Wider fix:** None. No command measures Markdown files, and a new check needs the user.
- **Previous examples:** `src/chat/transcript.md` and `src/chat/sessions.md`, which earlier changes split out of the same README.
- **Recommendation:** B. It leaves room for later changes, as the existing chat guides do.
- **Action:** fix after merge, apply B, because other branches edit this README and the split does not serve the fold.
