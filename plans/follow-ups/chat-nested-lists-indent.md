# Choose the indent that nests a chat list line

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-10, from branch `calummoore/markdown-formatting-issue`, after the user reported that a chat answer "looks off".
- **Location:** `src/chat/components/agent-text.ts:28` (the list marker patterns), and the section "Formatting" of `docs/protocol/chat-markdown.md`.
- **Reason:** the rule is a new requirement for the user to review, and it matters only when `plans/follow-ups/chat-nested-lists-approach.md` chooses its option C or D.

- **Source:** Design. **Category:** Docs or spec.
- **Terms:**
  - **CommonMark:** the Markdown standard that GitHub and the file preview of the app follow.
  - **Marker:** the `-`, `*`, `+`, or number such as `1.` that starts a list item.
- **Background:**
  - CommonMark puts a line under a list item only when its indentation reaches the text of the item: 2 spaces under `- `, 3 under `1. `, and 4 under `10. `. GitHub and the file preview, in `src/files/markdown/markdown-lists.ts`, follow this rule.
  - The chat parser in `src/chat/components/agent-text.ts` ignores indentation today. It reads a marker at any indentation as an item of the same flat list.
  - The answer in the user's screenshot indented its options 3 spaces under `1.`, so they nest under both rules.
  - In both options, a tab counts up to the next stop of four columns, as in the file preview.
- **Problem:** The chat-only approaches C and D of `plans/follow-ups/chat-nested-lists-approach.md` need a rule for the indentation that puts a line under an item. The protocol doc has none.
- **Impact if no action:** Under the CommonMark rule, a list that an agent indents only 2 spaces under a numbered item keeps showing flat.
- **Root question:** Which indentation shows that a line belongs to the list item above it?
- **Options:**
  - **A.** Two or more spaces more than the marker of the item. The 2-, 3-, and 4-space styles all nest. A 2-space list under `1.` then looks different from GitHub. The chat also needs its own rule for a marker that stands between two levels. Effort: Small.
  - **B.** The CommonMark rule: the indentation reaches the text of the item. The chat nests as GitHub and the file preview do. A 2-space list under `1.` stays flat. Effort: Small.
- **Left out:** One space or more: a stray space would nest an item, so it fails the goal. Only two rules are real, because a rule counts either from the marker or from the text of the item.
- **Wider fix:** None, because this item chooses a rule. Option E of `plans/follow-ups/chat-nested-lists-approach.md` prevents the class, because one shared list reader keeps the chat and the file preview the same.
- **Previous examples:** None found.
- **Related:** Parent item `plans/follow-ups/chat-nested-lists.md` holds the work. This item waits for `plans/follow-ups/chat-nested-lists-approach.md`. With its option E, rule B comes with the shared reader.
- **Recommendation:** B. It keeps the chat, the file preview, and GitHub the same, and no agent text on record uses 2 spaces under a number. The first draft recommended A.
- **Action:** ask the user, because the rule is a new requirement, and A follows more agent text while B matches GitHub.
