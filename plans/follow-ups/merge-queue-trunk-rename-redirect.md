# Verify trunk renames with GitHub redirects

- **Severity:** High. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-23, finding 7 of `calummoore/merge-queue-k2ep`.
- **Location:** `worker/merge-queue/step.ts:96` and `worker/merge-queue/step-data.ts:78`.
- **Reason:** This fix needs live GitHub evidence for the old branch lookup after both a rename and a switch.

- **Source:** Review. **Category:** Product bug.
- **Terms:**
  - **Trunk:** The repository's default branch into which the queue merges.
  - **Trunk-facing pull request:** An open pull request that targets the trunk on GitHub.
- **Background:** A default-branch rename keeps every entry. A switch to a different branch makes every entry leave. Re-order and leave can change the first entry before GitHub changes its base. The queue saves the last pull request it saw targeting the trunk to help confirm a rename.
- **Problem:** The first-entry check kept the old trunk through a second alarm in the isolated re-order test. The saved pull request fixes that case. It can still be closed when GitHub renames the branch. A missing old ref alone cannot prove a rename because a switch followed by deletion also removes the old ref.
- **Impact if no action:** A queue with no usable trunk-facing pull request can keep waiting to verify the change.
- **Root question:** How can the queue verify a rename when no open pull request can confirm it?
- **Options:**
  - **A.** Check an entry that previously targeted the trunk. It can leave before the rename. Effort: Small.
  - **B.** Inspect the saved GitHub stack. A single entry can have no stack. Effort: Medium.
  - **C.** Save a verified change in the shared repository update path. This needs a verification source. Effort: Large.
  - **D.** Verify the redirect from `GET /repos/{owner}/{repo}/branches/{old_branch}`. Use a real test repository and the token type that the queue will use. Record the status and destination before following the redirect. Check that a switch followed by deletion gives a different result. Effort: Medium.
  - **E.** Keep the saved trunk-facing pull request as a witness. That handles re-order and leave while the witness remains open. Effort: Small.
- **Left out:** Assume that a missing old ref proves a rename. A deleted previous default after a switch gives the same observation.
- **Wider fix:** D. A confirmed same-repository redirect to the new default would give evidence independent of the queue's order and pull requests.
- **Previous examples:** Commit `9983ba58b` added shared handling for repository name and default-branch changes.
- **Recommendation:** D. Verify the GitHub response before changing the queue's classification. Keep the pending wait for a result that does not prove a rename or switch.
- **Action:** Fix after merge, apply D. Save the real repository results and cover rename, switch, and unresolved checks in Worker tests.
