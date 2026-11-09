# Keep one record of every cloud computer

- **Severity:** High. **Effort:** Large. **Confidence:** High. **Harder later:** Yes.
- **Kind:** Fix after merge.
- **Added:** 2026-11-08, split off from finding 10 of PR #52, branch `conductor/boat-native-remote-workspaces-milestone-15o`, round 1, option F of its check. Option D of the check fixed the org suspension in that branch.
- **Location:** `createResource` and each Delete path under `worker/lifecycle/`, `worker/operator/org-data.ts`, the user suspension under `worker/operator/`, the org deletion inventory at `worker/members/deletion-data.ts:110`, and the operator org search in `worker/operator/org-directory.ts`.
- **Reason:** F reaches the allocation helper, the user suspension, and the org deletion, outside the diff of PR #52, and it needs a migration with a backfill.

- **Terms:**
  - **Cloud computer:** the sandbox that runs one workspace, or one image build.
  - **Cleanup record:** a database row that keeps the identity of a computer after its workspace row is removed, until a Delete succeeds.
  - **Org suspension:** the operator action that stops every computer of an org and blocks its members.
- **Background:** Each feature finds its computers in its own way. The org suspension and the org deletion inventory read the workspace rows, the unfinished builds, and the cleanup records. The user suspension reads only the workspace and build rows. The operator org search, added on 8 and 9 November 2026, finds the org of a cloud computer ID. It reads the workspace and build rows, the cleanup records, the listener computer ID of the preview rows, and the computer ID of the terminal credentials, because an abuse report can name a computer after its workspace was archived or deleted.
- **Problem:** A computer that only a cleanup record keeps, after a failed Delete, is missing from the user suspension. So the user suspension can report done while it still runs. The operator org search must list each table that keeps a computer ID, so the next such table repeats the gap.
- **Impact if no action:** A computer of a suspended user or a deleted org can keep running until its auto-stop deadline, and each new way to create a computer needs its own fix in every reader.
- **Root question:** How does every action that must stop or delete computers find all of them?
- **Options:**
  - **E.** Build one shared query of the computers, with an org scope and an owner scope. It returns live workspaces, unfinished builds, and cleanup records. The org suspension, the user suspension, and the org deletion all use it. The owner scope needs an owner column on the cleanup record, which is a small migration. Effort: Medium.
  - **F.** Keep one ledger of every computer, with its org, its owner or starter, and its purpose. `createResource` writes each entry before the provider creates the computer. A confirmed Delete marks the entry deleted, and the entry stays until the purge of its org. The suspensions, the org deletion, and the cleanup read the live entries. The operator org search reads every entry, so it finds the org of a computer also after its delete. Cost: a migration with a backfill, and each Delete path must mark its entry. A missed mark only makes a later Stop get "not found". Effort: Large.
- **Left out:** A fix in each reader alone, because the next new kind of computer repeats the gap.
- **Wider fix:** F.
- **Previous examples:** finding 10 of PR #52, the cleanup-record gap of the org deletion that its check found, and finding 3 of branch `calummoore/admin-section-brainstorm`, where the operator org search missed the computer IDs of cleanup records, preview rows, and terminal credentials. That branch fixed the search directly and moved the kept entries into F on 9 November 2026.
- **Recommendation:** F. It gives each reader one source that no create can skip.
- **Action:** fix after merge, apply F, as the final call on finding 10 of PR #52 said on 8 November 2026.
