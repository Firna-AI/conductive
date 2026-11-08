# No rule sends a protocol change to the legal pages

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-08, split off from finding 6 of PR #46, branch `conductor/boat-native-remote-workspaces-milestone-7w`, round 2, option D of its check.
- **Location:** `AGENTS.md` (`CLAUDE.md` is a link to it), and the section "Legal drafts" of `src/marketing/README.md`.
- **Reason:** the fix reaches `AGENTS.md`, outside the diff of the branch, and it serves every branch.

- **Terms:**
  - **Legal pages:** the draft Terms (`src/marketing/terms.ts`) and Privacy page (`src/marketing/privacy.ts`) of the marketing site. They restate facts of the architecture doc and the protocol docs in their own words, for visitors and the lawyer.
- **Background:** The `documentation` skill keeps `docs/`, the protocol docs, the mockups, and the READMEs in line with the code. It does not name the legal pages, and its search rule covers only removals and renames.
- **Problem:** A change to a protocol fact can leave a legal page stale, because no rule sends the change there, and the old fact can sit in words that a search does not find.
- **Impact if no action:** The public pages tell visitors false facts about logins, tokens, and costs. Two cases came up on 8 November 2026: finding 6 of PR #46 (the pages still said that each message uses its sender's login, after decision 105 F) and finding 8 of PR #45 (the privacy page lacked the GitHub token risk of decision 121 A).
- **Root question:** How does each change of a protocol fact reach the legal pages?
- **Options:**
  - **D.** Add one repository rule to `AGENTS.md`, and the same sentence to "Legal drafts" in `src/marketing/README.md`: when a change alters a fact in the architecture doc or a protocol doc, read both legal pages in full, and update each sentence that restates the fact, in the same change. The rule asks for a full read, not a search for the old words. Effort: Small.
  - **E.** As D, and put a comment above each restated sentence in `terms.ts` and `privacy.ts`, with a link to its source section. A search for the link of a changed section then finds each sentence. About 30 facts to map, and the links must be mapped again after the lawyer rewrites the pages. Effort: Medium.
- **Left out:** A test or a lint that compares the legal text with the docs, because the `testing` skill gives doc prose no test, and a wording check misses a sentence in new words.
- **Wider fix:** D.
- **Previous examples:** commit `f0f2ec7` updated both legal pages when the owner of the cloud computer account changed. Finding 6 of PR #46 and finding 8 of PR #45.
- **Recommendation:** D. It costs one sentence and covers new words too.
- **Action:** fix after merge, apply D, because it reaches `AGENTS.md`, outside the diff of PR #46, and serves every branch.
