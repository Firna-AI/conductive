# Diff replies lack the facts of their row

- **Severity:** Medium. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-24, from branch `calummoore/object-memory-runner-report-limits-0m1g`, the wider fix that the agent split off review finding 150 of round 8.
- **Location:** `crates/cnd-runner/src/repository/diff.rs:119`, `worker/files/content.ts:70`, and `src/files/page/DiffPage.tsx`.
- **Reason:** It adds an optional field to the diff reply across the runner, the Worker, the app, and the protocol, and the change that found it was in its last fix round with no re-review left.

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Review.
- **Category:** Code structure.
- **Location:** See the header.
- **Terms:**
  - **Omitted path:** A changed file that the limited Changes list leaves out.
- **Background:** For an omitted path, the diff page takes the header line counts and the deletion state from the patch text of its own diff reply, because no Changes row names the path. The runner already finds the path's Changes row, with Git's counts and change kind, when it reads the diff (`diff.rs:119`).
- **Problem:** Reading facts from patch text depends on the patch grammar. Review finding 150 found two defects there: the headers of a second patch section in a type change, and a deletion marker inside content. The fix of that finding corrected the reader, but any later Git output change can break it again.
- **Impact if no action:** The header of an omitted path's diff can show counts or a deletion state that differ from Git's.
- **Root question:** How does the diff page of an omitted path get the same counts and deletion state as a listed row?
- **Options:**
  - **A.** Add an optional field with the change kind and the added and removed counts to the diff reply. `read_diff` fills it from the row that it already finds. The Worker's `parseDiff` copies a well-formed field and drops a malformed one. The page uses the Changes row first, then this field. During a Worker rollback the field is dropped, and the page falls back to the patch. Effort: Medium.
- **Left out:** A third-party patch parser, because it still reads text, and the runner already has the facts.
- **Wider fix:** A.
- **Previous examples:** Review findings 26 and 75 of the same branch, which first named this field as their wider fix.
- **Related:** `plans/follow-ups/runner-diff-plumbing.md` changes the same patch command.
- **Recommendation:** A.
- **Action:** fix after merge, apply A, because it is a cross-layer wire change that needs its own review.
