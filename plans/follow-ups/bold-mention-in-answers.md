# A bold mention in an answer gives no chip

- **Severity:** Medium. **Likelihood:** Common. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-13, from branch `calummoore/delft-i3g7`, review round 2.
- **Location:** `src/shared/mention-text.ts:18`, `src/chat/links/chat-parts.ts:114`, `docs/mockups/src/components/chat/fileMentions.ts:37`.
- **Reason:** the fix changes the start rule of a mention, which the protocol states and no user decision covers.

- **Terms:**
  - **Mention:** `@` and a path of the repository in chat text, such as `@src/app.ts`. The chat shows it as a file chip when it names a file or a folder of the file tree.
  - **File chip:** a small box in chat text with the icon and the name of a file. A press opens the file.
- **Background:**
  - Agent answers show a file chip for each mention of an entry of the file tree, by the user's choice of 13 November 2026.
  - The agent instructions ask agents to name each file in a chat reply as a mention.
  - `docs/protocol/file-mentions.md` says that a mention starts at the start of the text, or after a space or a line break. `startsMention` in `src/shared/mention-text.ts` checks this.
  - Where `**` marks bold, as in an answer, a mention ends before the next `**`. So `**Read @src/app.ts**` gives a bold chip.
- **Problem:** In `**@src/app.ts**`, the character before `@` is `*`, so no mention starts. The answer shows bold text `@src/app.ts` and no chip. Agents often write bold file names, such as `- **@src/app.ts**: added the hook`.
- **Impact if no action:** Each bold file name that an agent writes as a mention shows as text, not as a chip.
- **Root question:** Which marks of an answer can stand right before a `@` mention?
- **Options:**
  - **A.** Keep the reader. Add to the agent instructions that a mention must not touch `**`. Agents can ignore it. Effort: Small.
  - **B.** In an answer, a mention can also start right after a `**` mark. Update the start rule in `docs/protocol/file-mentions.md`, the mockup reader in `docs/mockups/src/components/chat/fileMentions.ts`, and add a test. Effort: Small.
  - **C.** B, and a mention can also start after `(` or `[`. More text can become a chip. Effort: Small.
  - **D.** Where the chat reads Markdown marks, a mention can also start right after any mark that the reader reads. Today that is only `**`, so it acts as B. The rule then covers a mark that the reader learns later. Change `tokens` in `src/chat/links/chat-parts.ts`, not `startsMention`, because the composer and pastes read no marks. Mirror it in the mockup reader. Effort: Small.
- **Left out:** A start after any character, because `a@b.com` would then start a mention. A full Markdown parser, because D gives the same result with far less change.
- **Wider fix:** D.
- **Previous examples:** The rule that a mention ends before the next `**`, added on 13 November 2026, fixed only the closing mark.
- **Recommendation:** D. It gives the chip for the common bold form, and it covers later marks. Each of B, C, and D changes a protocol fact, so the change also reads both legal pages and each public guide in full.
- **Action:** ask the user, because the fix changes the start rule of a mention that `docs/protocol/file-mentions.md` states, and no user decision covers that change.
