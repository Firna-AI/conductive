# Build notice waits for the next poll

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** Low. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-25, from branch `calummoore/remove-repo-from-menu-ouc2`, outside the scope of round 1.
- **Location:** `src/app/settings-actions.ts:31`
- **Reason:** The behaviour is on `main` for removals in Edit, so it belongs to a branch about the builds read.

- **Background:** After a removal, `setRepositorySelected` calls `org.reload('builds')`, so that the repository notice shows Build computer. A builds read that started before the removal can answer that reload.
- **Problem:** The repository notice can show the removed repository only after the next poll.
- **Impact if no action:** The admin waits up to one poll interval for Build computer.
- **Root question:** How does the notice reflect a removal at once?
- **Options:**
  - **A.** Reread the builds with a read that starts after the save, as `Refresher.reread` in `src/app/refresh.ts:78` does. Effort: Small.
  - **B.** Change nothing. Effort: Small.
- **Left out:** None.
- **Wider fix:** The shared read state of `plans/follow-ups/dialog-fresh-read-state.md`.
- **Previous examples:** None found.
- **Recommendation:** A.
- **Action:** fix after merge, apply A, because the cause is on `main`, outside the diff.
