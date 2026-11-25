# A partial save at Done says that nothing changed

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-20, finding 12 of review round 3, branch `calummoore/build-stability-additions-jjdx`.
- **Location:** `src/shell/settings/RepositoriesTab.tsx`, the `done` action and its fixed failure title "The repositories did not change".
- **Reason:** a partial save needs one failed request among several, and normal use rarely meets that.

- **Terms:**
  - **Repositories tab:** the org settings tab where an admin chooses the repositories of the cloud computer: Edit, then Add and Remove, then Done.
  - **Partial save:** a Done where some changes of the edit save and at least one change does not.
- **Background:**
  - Done saves each change of the edit. A change that does not save stays in the edit, and the other changes still save, as `docs/protocol/org-image-repositories.md` (section "Added repositories") says.
  - After the saves, the tab shows one failure toast with the fixed title "The repositories did not change".
- **Problem:** After a partial save, some repositories did change, and an add among them may have started a build. The toast says that nothing changed.
- **Impact if no action:** The admin can repeat or undo changes that already saved.
- **Root question:** How does the admin learn which changes Done saved?
- **Options:**
  - **A.** Choose the toast title from the outcome: keep "The repositories did not change" when Done saved nothing, and use "Some repositories did not change" after a partial save. Effort: Small.
  - **B.** Name each repository whose change did not save in the toast. Effort: Small.
  - **C.** Mark each row of the open edit whose change did not save. It needs a new mockup state. Effort: Medium.
- **Left out:** Saving nothing when one change fails, because `docs/protocol/org-image-repositories.md` requires that the other changes save.
- **Wider fix:** None found. No other action of the app saves several changes in one step and reports one result.
- **Previous examples:** None found.
- **Recommendation:** A. It makes the title true with the fewest new words.
- **Action:** fix after merge, apply A, because a partial save needs one failed request among several, and normal use rarely meets that.
