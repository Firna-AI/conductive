# Remove question keeps the order of its opening

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-25, from branch `calummoore/remove-repo-from-menu-ouc2`, review finding 2.
- **Location:** `src/shell/settings/useRowRemoval.ts:60`, `src/shell/settings/useRowRemoval.ts:67`, `src/shell/settings/RemoveRepositoryDialog.tsx:64`
- **Reason:** The bug needs a move that fails while the question is open, so the fix rule defers a rare bug that is not High.

- **Terms:**
  - **Remove question:** the dialog that Remove in the row menu of a chosen repository opens on the Repositories tab of the org settings.
  - **Default repository:** the first chosen repository of the org order. New workspace picks it.
- **Background:**
  - A move of a row shows at once and goes back when its save fails. The removal waits behind earlier moves in one send queue.
  - The question names the repository that becomes the default when the admin removes the first row, as `docs/protocol/repository-order.md` says under "Remove in the row menu".
  - `useRowRemoval.ask` saves the place of the row and the focus target when the question opens.
- **Problem:** When a move fails while the question is open, the order goes back, but the question keeps its old words and its old focus target. Example: Make default on acme/marketing-site, Remove on acme/storefront, then the move fails. acme/storefront is the default again, but the question does not say that acme/billing-service replaces it. After the removal the focus can go to the wrong row.
- **Impact if no action:** An admin can change the default of the org without the warning. The Default label shows the new default at once, so the admin can see it and change it back.
- **Root question:** How can the words of the question and the focus after a removal follow the order that the removal changes, also when that order changes while the question shows?
- **Options:**
  - **A.** Wait for earlier moves to settle, and derive the words from the resulting order before Remove is on. Add a regression with a held move that fails. Effort: Small.
  - **D.** Keep only the repository when the question opens. Derive the words from the shown order at each render until the press. Keep Remove off, and Cancel on, while earlier moves wait. At the press, take the focus target from the settled order. Update the design call in the plan or the PR record that the words do not change while the question shows. Effort: Small.
  - **B.** Give the repository resource a way to read the saved order after earlier writes finish. Effort: Medium.
  - **E.** The DELETE carries the place that the question showed. The Worker refuses with 409 when the stored order gives another place, and the question asks again. It also covers a move by another admin. It adds a new refusal, which needs the user. Effort: Medium.
  - **F.** As D, and a toast names the new default when the DELETE answer differs from the question. Effort: Small.
- **Left out:** A refresh from the shown order alone: the DELETE still saves on the order after the rollback. Remove off in the row menu while a move saves: Remove is never off, by the protocol.
- **Wider fix:** E. The Worker compares the place that the admin saw with the stored order, so it also covers another admin and a stale read.
- **Previous examples:** Commit `92c23ed97` fixed overlapping moves of the org rail order.
- **Recommendation:** D. It fixes the words and the focus target in one Small change. Remove off while a move waits is a busy state of one dialog, not a new rule of the Worker.
- **Action:** fix after merge, apply D, because the bug is rare and not High.
