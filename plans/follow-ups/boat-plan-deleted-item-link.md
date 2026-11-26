# The Boat plan links a deleted follow-up item

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-26, from branch `calummoore/needs-input-at-the-composer-milestones-3-j8a8`, outside the scope of its review round 1.
- **Location:** `plans/boat-native-remote-workspaces.md:8075`, in "Milestone 13c: GitHub follow-ups".
- **Reason:** The plan belongs to other work, and the change that found the link does not touch that plan.

- **Terms:**
  - **History:** in an active plan, the completed milestones and the checked TODOs. The `git-commit` skill says that a change never rewrites the words of history.
  - **Permalink:** a GitHub link to a file at one commit, so it works after the file is gone.
- **Background:**
  - Milestone 13c of `plans/boat-native-remote-workspaces.md` is complete, so its text is history.
  - Line 8075 says: `The [follow-up item](follow-ups/github-tests-on-real-object.md) records that wider move.`
  - Commit `87784a5a4` wrote that line and added the item `plans/follow-ups/github-tests-on-real-object.md` on 9 November 2026. Both are on `main`.
  - Commit `da9ee7bfa` (#469, 18 November 2026) applied the item and deleted its file.
  - The `git-commit` skill says: when a link inside history breaks, replace it with a permalink at a commit where the target still matches the text. Start with the commit that wrote the link.
  - Permalinks of this repository use `https://github.com/Firna-AI/conductive/`, as commit `24fd00004` set for older plans.
- **Problem:** The link at line 8075 leads to a file that no longer exists.
- **Impact if no action:** A reader of the milestone cannot open the item that records the wider move.
- **Root question:** How does the history of the milestone keep a working link to the deleted item?
- **Options:**
  - **A.** Replace the target with `https://github.com/Firna-AI/conductive/blob/87784a5a406bc20cb37d602613977cb3ce283ffd/plans/follow-ups/github-tests-on-real-object.md`, the item at the commit that wrote the link. Keep the words of the line. Effort: Small.
  - **B.** Use a permalink at commit `9983ba58b`, which the message of commit `da9ee7bfa` gives for the last version of the item. Keep the words of the line. Effort: Small.
- **Left out:** A removal of the link, because it changes the words of history. Only the commit of the permalink is a real choice.
- **Wider fix:** None. `plans/follow-ups/doc-references-unchecked.md` holds a reference check, but that check skips history content, so it would not find this link.
- **Previous examples:** The same plan already links another deleted item with a permalink, at line 3792.
- **Related:** None.
- **Recommendation:** A. The skill names the commit that wrote the link first, and the item there matches the text of the line.
- **Action:** fix after merge, apply A, because the plan belongs to other work outside the change that found the link.
