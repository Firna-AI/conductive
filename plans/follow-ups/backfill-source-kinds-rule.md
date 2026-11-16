# Backfills must name each kind of source row

- **Severity:** Medium. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-16, from branch `calummoore/milan-mq6q`, review round 1.
- **Location:** `skills/databases/SKILL.md` in the shared skills repository `futex-ai/skills`
- **Reason:** The fix changes the shared skills repository, which this branch cannot change.

- **Terms:**
  - **Backfill:** an `UPDATE` in a migration that fills a new column from rows that the database already holds.
  - **One-time run:** the run of a migration on a local database with sample rows, whose output the branch keeps as proof. The `testing` skill asks for it in place of a migration test.
- **Background:**
  - Migration `202611161200_user_last_active.sql` adds `users.last_active_at`, the time of the last real action of a person: a workspace or a chat message that the person creates or sends in the app.
  - Its first backfill took the newest workspace that the user owns. That also took workspaces that a routine run or an agent tool created, and workspaces that another member created and handed over. A review found it before the merge, and the branch fixed it to read `workspace_runtime.created_by_user_id` and to leave out agent tool and routine workspaces. A second review found that a routine delete removes the `routine_runs` rows that mark its workspaces, so the branch now counts only workspaces whose first message ID has the 36-character form that only the app makes.
  - Commit `50959871f` fixed an earlier backfill, of the computer ledger, for a similar reason: its source rows needed the provider account scope.
- **Problem:** No rule asks a backfill to name each kind of source row and to say whether the requirement of the new column counts that kind. So a backfill can take rows that the requirement leaves out.
- **Impact if no action:** A later backfill can fill a column with values that break its own requirement. A merged migration does not change, so the wrong values stay.
- **Root question:** How does each backfill make sure that it takes only the rows that the requirement of its column counts?
- **Options:**
  - **A.** Add a rule to the `databases` skill: a migration that fills a column from other rows names each kind of source row and each kind of writer of those rows. It says whether the requirement of the column counts each kind. It tells the kinds apart by a fact that a delete or a failed later write cannot remove. Its one-time run adds one sample row for each kind, also a row whose linked rows are gone. Effort: Small.
- **Left out:** A test of each backfill: the `testing` skill says that a migration gets no test. A lint: it cannot read the meaning of a requirement.
- **Wider fix:** A. It is the process rule for the class.
- **Previous examples:** Commit `50959871f` (computer ledger backfill). The `users.last_active_at` backfill of branch `calummoore/milan-mq6q`.
- **Recommendation:** A. It is a short rule in the skill that every database change already reads.
- **Action:** fix after merge, apply A, because it changes the shared skills repository outside this repository.
