# The isolation doc passes the length target

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-24, from branch `calummoore/own-computers-milestone-8-builds-over-ef32`, Milestone 8 of the own computers plan.
- **Location:** `docs/protocol/isolation.md:152-196` and `docs/protocol/isolation.md:197-286`
- **Reason:** A split adds protocol pages, and the branch that found it could change only one sentence of this doc.

- **Source:** Implementation.
- **Category:** Docs or spec.
- **Background:**
  - `docs/protocol/isolation.md` holds the isolation requirements of orgs and sandboxes. It has 286 lines. Its sections are "Orgs and workspaces", two key sections, "What a sandbox holds", "What the workspace tools reach" (lines 152-196), and "Agent logins in a sandbox" (lines 197-286).
  - The `documentation` skill sets a target of about 250 lines for each protocol doc. It says that a change to a longer doc splits that doc into linked pages in the same change.
  - The doc had 283 lines before the Milestone 8 change. That change made the software image sentence of "What a sandbox holds" say that its build sandbox gets only its machine token. The scope of that branch allowed no other edit of the doc.
  - The doc already keeps short pointer headings for the two key sections, which link to `docs/protocol/provider-keys.md`.
- **Problem:** The doc passes the length target, and the change that touched it did not split it.
- **Impact if no action:** The next change to this doc meets the same rule. A long protocol doc is slower to read and review.
- **Root question:** How does the isolation doc get back under its length target, with every inbound link still working?
- **Options:**
  - **A.** Move "What the workspace tools reach" to its own page, such as `docs/protocol/workspace-tool-reach.md`. Leave the heading in the isolation doc with one sentence that links the new page, as the key sections do. Two files link to its anchor today, and the pointer heading keeps them working. The doc then has about 245 lines. Effort: Small.
  - **B.** Move "Agent logins in a sandbox" to its own page in the same way. About 28 links point into that section and its subsection, so more anchors need a pointer. Effort: Small.
- **Left out:** Cutting sentences: that drops requirements. Leaving the doc as it is: it breaks the rule of the `documentation` skill.
- **Wider fix:** None. The `documentation` skill already gives the rule.
- **Previous examples:** The pointer headings "The app's Boat key" and "The app's E2B key" of the same doc moved their content to `docs/protocol/provider-keys.md`.
- **Recommendation:** A. It brings the doc under the target and changes no inbound link.
- **Action:** fix after merge, apply A, because the split adds a protocol page outside the scope of the branch that found it.
