# Decision numbers can name different records

- **Severity:** Low. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-09, during workspace-link integration.
- **Location:** `docs/protocol/`, `docs/architecture.md#decision-numbers`.
- **Reason:** Existing collisions span unrelated features and predate the workspace-link change.

**Terms:** A decision number names a dated choice whose record stays in
its plan and then in its pull request.

**Background:** The architecture requires each decision number to name
one record. Parallel branches can choose the same number. Existing docs
use 142 for session edits, Preferences, and the operator section. They
use 145 for the palette key, masked paths, and lifting a suspension.

**Problem:** A number alone can lead a reader to the wrong choice.

**Impact if no action:** Agents and reviewers can cite the wrong reason
for a requirement.

**Root question:** How can each existing decision reference lead to its
correct record?

**Options:**

- **A.** Give colliding records distinct numbers. Update live references
  and preserve old-number mappings beside the records. Effort: Medium.
- **B.** Add the topic and source link to each colliding reference while
  keeping its number. Effort: Medium.
- **C.** Keep the collisions. Readers use the topic and Git history to
  distinguish them. Effort: Small.

**Left out:** A new gate or repository-wide numbering process. That
changes repository rules and needs a separate user choice.

**Wider fix:** The existing architecture already requires one record per
number. This task repairs references without adding another rule.

**Previous examples:** The 142 and 145 collisions listed above. Workspace
links originally used 150 and 151, which turn folding also uses. The
workspace-link change moved its references to 211 and 212 before merge.

**Related:** None.

**Recommendation:** A. Distinct numbers meet the existing rule and old
mappings preserve the historical references.

**Action:** fix after merge, apply A, because the existing collisions
span unrelated feature docs.
