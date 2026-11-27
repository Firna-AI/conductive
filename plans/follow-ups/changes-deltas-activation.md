# Turn on changes deltas and check them live

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-27, from branch `calummoore/changes-list-deltas-aedi`, the post-merge tasks of its plan.
- **Location:** `wrangler.jsonc`, the `CHANGES_DELTAS` variable.
- **Reason:** The activation must wait until the compatibility release has been live for at least one hour, so that a rollback never reaches a Worker that cannot read a stored changes delta.

- **Terms:**
  - **Changes delta:** the event `changes.changed`, an update of the branch changes list with only the rows that change, as `docs/protocol/changes-deltas.md` says.
  - **Compatibility release:** the release that holds all the code of changes deltas, with `CHANGES_DELTAS` set to `"off"`, so that no welcome accepts deltas.
- **Background:** Cal chose changes deltas on 26 November 2026. Current tabs get each delta, and older tabs and older Mac apps get the complete list under the same event number. The rollout takes two releases, as "When a deploy fails" in `docs/automatic-deploys.md` says. After activation, do not roll back past the compatibility release, because an older Worker cannot replay a large stored delta.
- **Task:**
  - Open a pull request that sets `CHANGES_DELTAS` to `"on"` in `wrangler.jsonc`, and the row of "Public variables" in `docs/deployment.md` if it names the value. Merge it only after the compatibility release has been live for at least one hour.
  - After the deploy and the normal runner update of a sandbox, edit a file in a workspace with a current tab open. Confirm that the tab's event socket gets `changes.changed` with one row, and that the Changes panel shows the edit.
  - Open the same workspace in a tab without `forms` in its event socket address, or in an older Mac app. Confirm that it gets `changes.updated` with the complete list and the same event number.
  - Reconnect the cloud computer. Confirm that the runner sends a full changes list and that both tabs keep the right list.
- **Impact if no action:** Every edit keeps sending the complete changes list, so the cost of each edit still grows with the list size.
- **Needs:** The compatibility release deployed for at least one hour, and a sandbox after its normal runner update. The fix of `plans/follow-ups/git-attribute-edit-stale-diff-heading.md` in the runner release that the sandboxes run.
- **Done when:** `CHANGES_DELTAS` is `"on"` in production, and each check above passes, or a new follow-up item records a failure.
- **Related:**
  - `plans/follow-ups/git-attribute-edit-stale-diff-heading.md`: work that this task waits for. Without that fix, an open diff keeps a stale hunk heading after an edit of a `.gitattributes` file once deltas are on.
  - `plans/follow-ups/open-tab-labels-miss-new-secrets.md`: the same rollout. Once deltas are on, a current tab that stays open keeps the old label of an unchanged row after a run first uses a secret value. That item waits for the user's answer.
