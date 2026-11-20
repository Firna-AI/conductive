# Mask follow-up names the closed activation item

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-19, from the first-pass review of branch `calummoore/follow-up-worker-filter-rewrites-all-x0d4`, under Outside the scope.
- **Location:** `plans/follow-ups/merged-masks-lose-literal-marker-boundaries.md:19` and `plans/follow-ups/merged-masks-lose-literal-marker-boundaries.md:43`.
- **Reason:** The stale lines came from `main` in commit `8d6a955ad`, and the branch that found them does not change that item.

- **Source:** Review.
- **Category:** Docs or spec.
- **Terms:**
  - **Mask item:** `plans/follow-ups/merged-masks-lose-literal-marker-boundaries.md`, a Low follow-up item about merged masks that lose the boundary of a literal `[redacted]`.
  - **Activation item:** `plans/follow-ups/activate-symbolic-answer-state.md`, the post-merge task that turned the control on, which commit `8d6a955ad` deleted.
  - **The control:** `CONDUCTIVE_SYMBOLIC_ANSWER_STATE` in `wrangler.jsonc`, which makes the Worker save answer filter state in the symbolic format while it is `"true"`.
- **Background:**
  - Commit `8d6a955ad` of 19 November 2026 set the control to `"true"`. It deleted the activation item, because its work was complete.
  - That commit changed line 18 of the mask item to say that the control starts true. It did not change lines 19 and 43.
  - Line 19 says: "`plans/follow-ups/activate-symbolic-answer-state.md` owns the later activation after the compatible reader deploys."
  - Line 43, the Related line, starts: "`plans/follow-ups/activate-symbolic-answer-state.md` activates the symbolic path where this defect occurs. It does not change the repair and does not wait for this Low bug."
  - The rest of line 43 links the separate literal-marker decision of `plans/follow-ups/split-literal-marker-in-answers.md`. That part is still correct.
  - The section "Rollout" of `docs/protocol/answer-text-secrets.md` gives the rollout and rollback rules of the symbolic format.
  - `plans/follow-ups/split-literal-marker-in-answers.md:47` had the same stale path. Its Related line now names `docs/protocol/answer-text-secrets.md` in its place.
- **Problem:** The mask item names a deleted file as the owner of a future activation. The control is already true, so the symbolic path where the defect occurs is active.
- **Impact if no action:** A reader looks for a missing file. The reader can also think that the defect cannot occur yet in new answer state.
- **Root question:** How does the mask item state the current rollout of the symbolic format?
- **Options:**
  - **A.** Replace the two stale sentences with current facts and the protocol doc. Keep every other word, every option, the action, and the separate literal-marker decision. Effort: Small.
  - **B.** Replace the two paths with a history permalink to the activation item at commit `0dd60af97cc3e328c29084a098ebbcb1112d1261`, the parent of `8d6a955ad`. Put both sentences in the past tense. Cost: the reader must follow a link for the context, and the item then depends on a link. Effort: Small.
- **Left out:**
  - Restore the activation item: its work is complete, so a restore reopens closed work.
  - Delete the two sentences: the item then does not say that the symbolic path is active, or where the rollout rules are.
  - Change nothing until a branch fixes the mask item: each reader meets the missing file until then.
- **Wider fix:** None. The rule in force covers this class. A change that removes a file searches `docs/`, `plans/`, and every `README.md` for its name, as the `documentation` and `git-commit` skills say.
- **Previous examples:** `plans/follow-ups/preview-follow-up-stale-activity-example.md` records a follow-up item that kept a stale claim after `main` deleted a related item. `plans/follow-ups/split-literal-marker-in-answers.md:47` had the same stale path, as the background says.
- **Related:** `plans/follow-ups/merged-masks-lose-literal-marker-boundaries.md` is the item that this work corrects. Its repair and its literal-marker decision do not wait for this item. When a branch deletes that item first, delete this item with no other change.
- **Recommendation:** A. The mask item then states the current facts itself, so it stands alone with no link.
- **Action:** fix after merge, apply A, because the stale lines came from `main`, and the branch that found them does not change the mask item.

Proposed text for A. Replace line 19 with: "`docs/protocol/answer-text-secrets.md` gives the rollout and rollback rules of the symbolic format. With the control true, new answer state uses the symbolic path where this defect occurs." In line 43, replace the first two sentences with: "`docs/protocol/answer-text-secrets.md` gives the rollout of the symbolic path where this defect occurs. That rollout does not change the repair, and it did not wait for this Low bug." Keep the rest of line 43. Change no other line of the mask item.
