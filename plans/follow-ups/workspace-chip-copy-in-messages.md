# A copied workspace chip loses its link

- **Severity:** Low. **Likelihood:** Common. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-10, from branch `calummoore/file-selector-list`, a new problem of the check of finding 2 of review round 1.
- **Location:** `src/chat/links/LinkedText.tsx` (`LinkChip`), `src/chat/links/mention-copy.ts`.
- **Reason:** the behaviour is older than the branch, and no rule covers it yet.

- **Background:** A sent message and an answer show each workspace link as a chip. The branch makes a copy of chat text give the mention of each file chip, through one copy handler in `src/chat/links/mention-copy.ts`, which reads a `data-mention` mark on each file chip. `docs/protocol/workspace-links.md` gives no copy rule for chips in messages and answers.
- **Problem:** A copy of a workspace chip in a message gives text such as `W-401 Dark mode for emails, Starting`, not its link.
- **Impact if no action:** A pasted message loses the links of its workspaces.
- **Root question:** What does a copy of a workspace chip in a message or an answer give?
- **Options:**
  - **A.** Give the link: mark each workspace chip with its source, as file chips are marked, so the same copy handler gives it. Add the rule to `docs/protocol/workspace-links.md`. Effort: Small.
  - **B.** Keep the label text, and write that rule in the protocol. Effort: Small.
- **Left out:** None.
- **Wider fix:** A, because one handler then copies every chip by its source.
- **Previous examples:** The copy of file chips that this branch added.
- **Recommendation:** A. The message field already copies the exact link of each chip.
- **Action:** ask the user, because the change adds a copy rule that no requirement covers.
