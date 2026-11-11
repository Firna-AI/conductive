# The field and messages read chip text apart

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-10, from branch `calummoore/file-selector-list`, finding 10 of review round 2, with the new problems of its check.
- **Location:** `src/chat/components/chip-field/field-content.ts` (`$fieldNodes`), `src/chat/components/chip-field/field-text.ts` (`joinFieldParts`), `src/chat/links/chat-parts.ts` (`tokens`).
- **Reason:** only unusual text meets it, and the fix is as easy after the merge.

- **Terms:**
  - **Chip text:** the plain text of a message with workspace links and file mentions, such as `@src/app.ts`, which the field and the sent message show as chips.
- **Background:** Three readers handle chip text. The message field reads mentions first, then links, in `$fieldNodes`. The separator rule of the field checks a link chip with `textParts` alone and a mention chip only for spaces, in `joinFieldParts`. The sent message reads code, links, and mentions left to right, in `tokens` of `chat-parts.ts`. `docs/protocol/workspace-links.md` shows a Markdown link to a workspace as its chip alone, and `docs/protocol/file-mentions.md` shows each mention outside code as a chip.
- **Problem:**
  - A pasted Markdown workspace link whose label holds a mention, such as `[Review @README.md](<link>)`, shows as text: the mention reader runs through the label and the target.
  - A typed `cc @alice` and a pasted workspace link give the draft `cc @alicehttps://…`. A restored draft and the sent message then read one mention and lose the chip, although the sent message on `main` showed it.
  - A sent message shows a mention in the label of a Markdown link of no workspace as text, while the field shows a chip.
- **Impact if no action:** Rare drafts and messages lose a workspace chip or a file chip, and the field and the sent message can disagree.
- **Root question:** How does a workspace link stay one chip when a mention touches it, in a paste, in a draft, and in the sent message?
- **Options:**
  - **A.** Keep complete links apart before the field reads mentions. Effort: Small.
  - **B.** Share one tokenizer between the field and sent messages, with complete links before mentions. Effort: Medium.
  - **C.** Build one tokenizer for the three users: the field reader, the separator rule, and the sent reader. At each place it reads code where code counts, then a complete link, then a mention, so a link ends a mention that runs into it. A Markdown link to a workspace stays one unit. In the label of every other Markdown link, a mention stays a mention. Add regressions for each case above. Effort: Medium.
- **Left out:** Structured drafts, because the clipboard gives plain text. A field without Markdown workspace chips, because it removes behaviour of `main`. A new end for an unquoted mention alone, because a quoted mention still splits the link.
- **Wider fix:** C. It also covers the separator rule, which writes the draft.
- **Related:** `plans/follow-ups/chat-code-not-read-as-markdown.md` rewrites the code reader of `tokens`. One branch can do both. [chip-separator-before-link-period.md](chip-separator-before-link-period.md) records another defect of `joinFieldParts`: a space before a full stop after a link chip, when another chip follows. Its wider fix checks each chip in the text that the rule writes. Option C here rewrites the same rule, so both items may share one future wider fix.
- **Previous examples:** None found.
- **Recommendation:** C.
- **Action:** fix after merge, apply C, because only unusual text meets it.
