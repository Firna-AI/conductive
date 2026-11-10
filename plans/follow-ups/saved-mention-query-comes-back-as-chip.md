# A saved query of @ comes back as a chip

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-10, from branch `calummoore/file-selector-list`, a new problem of the check of finding 1 of review round 1.
- **Location:** `src/chat/components/chip-field/field-content.ts:80`.
- **Reason:** only a draft saved in the middle of a query that is itself a path meets it.

- **Background:** A draft keeps plain text, as `docs/protocol/file-mentions.md` says. When a draft comes back, each mention of an entry of the file tree shows as a chip. A pick always puts a space after its chip.
- **Problem:** A person types `@src/` to search, switches to another session, and comes back. `@src/` names the folder `src`, so it comes back as a chip, and the person cannot continue the search.
- **Impact if no action:** The person removes the chip and types the query again.
- **Root question:** How does a draft tell an unfinished query from a chip?
- **Options:**
  - **A.** When a draft comes back, keep a mention at the very end of the text, with no space after it, as text. A pick always adds a space, so a chip at the end has one. Effort: Small.
  - **B.** Keep the draft model, and let a press on a chip in the field turn it back into its query. Effort: Medium.
- **Left out:** Storing chips beside the draft text, because the draft is plain text, as the protocol says.
- **Wider fix:** None. This is one rule of the field.
- **Previous examples:** None found.
- **Recommendation:** A. It needs no new control.
- **Action:** fix after merge, apply A, because only a rare draft meets it.
