# Three merged changes skipped their final review

- **Severity:** Medium. **Effort:** Medium. **Confidence:** High. **Harder later:** Yes.
- **Kind:** Post-merge task.
- **Added:** 2026-11-13, from the open review tasks of the plans `plans/composer-file-drops.md`, `plans/org-rail-order.md`, and `plans/remove-runner-protocol-v1.md`, which branch `calummoore/bern-86hk` deletes.
- **Location:** The merge commits `ece84da69` (pull request #266), `731b1077b` (pull request #293), and `b409ef7f2` (pull request #339) on `main`.
- **Reason:** The three changes merged before the review that their plans asked for, so the review can only run on `main` now.

- **Terms:**
  - **Final review:** the review of the complete diff of a branch against `origin/main` with the `implementation-review` skill, after the last push. It reports findings, fixes the `fix now` findings, records the rest as follow-up items, and reviews once more.
  - **Complete gate:** `npm run check`. CI runs it as the job "Complete gate" on each pull request.
- **Background:**
  - Each plan ended with a final review before its pull request merged. The complete gate passed in CI on each pull request, but the final review did not run.
  - Pull request #266, "feat(chat): drop files into the composer as chips in the text", merged on 2026-11-11 as `ece84da69`. Its description says that the final review "runs after the two open decisions". Those decisions are still open, in `plans/follow-ups/composer-inline-touch-controls.md` and `plans/follow-ups/composer-mixed-refused-items.md`.
  - Pull request #293, "feat(orgs): let each person reorder the orgs in the rail", merged on 2026-11-12 as `731b1077b`. Its description says that "the full implementation review remains open because the complete gate has not passed". The gate passed in CI later.
  - Pull request #339, "refactor(runner)!: remove protocol version 1", merged on 2026-11-13 as `b409ef7f2`. Its description says that Cal asked for the pull request before the post-push review, and that the review comes in later commits. No later commit came before the merge.
- **Task:**
  1. For each of the three changes, review the diff of its merge commit against its first parent with the `implementation-review` skill. Use the protocol docs that each change names as its contracts.
  2. Fix each `fix now` finding in a fix branch. Record each other finding as a follow-up item.
  3. Review the fixes once more.
- **Impact if no action:** A defect that the review would find stays on `main`. Later work builds on the three changes, so each fix costs more as time passes.
- **Needs:** Nothing.
- **Done when:** Each of the three changes has a final review, with its `fix now` findings fixed and its other findings recorded.
