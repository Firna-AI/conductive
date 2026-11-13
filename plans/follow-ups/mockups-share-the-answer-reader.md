# The mockups read answers with their own rules

- **Severity:** Low. **Effort:** Medium. **Confidence:** High. **Harder later:** Yes.
- **Kind:** Fix after merge.
- **Added:** 2026-11-13, from branch `calummoore/delft-i3g7`, the wider fix of a review finding of round 2.
- **Location:** `docs/mockups/src/components/chat/fileMentions.ts`, `docs/mockups/src/components/chat/strongText.ts`, `docs/mockups/src/components/chat/workspaceLinks.ts`, `docs/mockups/src/components/chat/MessageText.tsx`.
- **Reason:** the change replaces the text pipeline of every message of the mockup catalogue, which is larger than the branch that found it.

- **Terms:**
  - **Mockup catalogue:** the visual spec of the app, in `docs/mockups/`, built with Mokly from fixtures.
  - **`chatParts`:** the reader of chat text in `src/chat/links/chat-parts.ts`. It splits a sent message or an answer into text, code, bold, workspace chips, and file chips.
- **Background:**
  - The app reads chat text with `chatParts`. The mockups read the same text with their own readers: the mention reader in `fileMentions.ts`, the bold rule in `strongText.ts`, and the link reader in `workspaceLinks.ts`.
  - On 13 November 2026 the mockups started to use the path and line rules of the app, through `docs/mockups/src/components/chat/answerPaths.ts`. The other rules stay copies.
- **Problem:** The copies already differ. The app ends a mention before the next `**`, so `**Read @src/app.ts**` gives a bold chip. The mockup shows it as text with no chip. Each change of a rule needs two edits, and the visual spec can show what the app does not show.
- **Impact if no action:** The catalogue drifts from the app at each change of the chat reader.
- **Root question:** How do the mockups read an answer, with its mentions, code, line targets, and bold, by the same rules as the app?
- **Options:**
  - **A.** Keep the copies, and add a test under `src/` that runs the same cases on both readers. Vitest does not run tests under `docs/mockups/`, so the test imports mockup code. Effort: Small.
  - **B.** Draw the text of answers and sent messages in the mockups through `chatParts`, with an entry lookup over the mockup file tree and the mockup repository folder. Delete the mention reader of `fileMentions.ts`, `strongText.ts`, and `answerPaths.ts`. Map the mockup link rows to the workspace links of the app. The mockups already import from `src/app/` and `src/shared/`. Effort: Medium.
- **Left out:** None.
- **Wider fix:** B.
- **Previous examples:** `mentionPattern` in `fileMentions.ts` copied `mentionAt` of `src/shared/mention-text.ts`. `answerPaths.ts` copied the path rules until 13 November 2026.
- **Recommendation:** B. It removes the drift for every rule of the reader.
- **Action:** fix after merge, apply B, because it changes the text pipeline of the whole catalogue.
