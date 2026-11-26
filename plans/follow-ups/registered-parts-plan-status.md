# Registered parts plan says a merged PR is open

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-26, from branch `calummoore/needs-input-at-the-composer-milestones-3-j8a8`, a problem outside the scope that the check of review finding 44 of round 1 found.
- **Location:** `plans/registered-mockup-parts.md:3`, the status paragraph.
- **Reason:** The plan belongs to other work, and the change that found the line does not touch that plan.

- **Terms:**
  - **Status paragraph:** the first paragraph below the title of a plan. It says whether the plan is active, names its branch, and says whether a pull request is open, as the `plans` skill says.
- **Background:**
  - `plans/registered-mockup-parts.md` registers the parts of the mockup catalogue with Mokly, in milestones. Milestones 1 to 4 are done, and Milestones 5 to 8 are open.
  - Its status paragraph says: `Status: Active. [PR #607](https://github.com/Firna-AI/conductive/pull/607) is open with Milestones 1 to 4.`
  - Pull request #607 merged into `main` on 20 November 2026, as commit `061ec1961`, from the branch `calummoore/riga-skgh`.
  - The `plans` skill keeps a plan while its work spans more than one pull request. The last pull request deletes it.
- **Problem:** The status paragraph says that a merged pull request is open.
- **Impact if no action:** A reader looks for an open pull request that does not exist, and cannot tell whether work on Milestones 5 to 8 runs.
- **Root question:** What does the status paragraph say while the work waits for its next pull request?
- **Options:**
  - **A.** Say that pull request #607 merged Milestones 1 to 4 into `main` on 20 November 2026, and that the plan stays for Milestones 5 to 8, with no pull request yet. Keep the sentence on the deletion of the plan. Effort: Small.
  - **B.** Wait until a branch starts Milestone 5. Then name that branch, and say that no pull request exists yet. Effort: Small.
- **Left out:** A deletion of the plan, because Milestones 5 to 8 are open. Only one fact of the line is wrong, so the options differ only in when the line changes.
- **Wider fix:** None. A status paragraph is one line that each change of the work keeps current by hand.
- **Previous examples:** `plans/boat-native-remote-workspaces.md:3` gives the form for a plan whose first pull request merged: "Pull request #57 merged the first version into `main` on 8 November 2026, and this plan stays for the later pull requests (decision 141)."
- **Related:** None.
- **Recommendation:** A. It states the merge and the work that stays, as the status of the Boat plan does.
- **Action:** fix after merge, apply A, because the plan belongs to other work outside the change that found the line.
