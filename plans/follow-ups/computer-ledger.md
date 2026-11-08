# Keep one record of every cloud computer

- **Severity:** High. **Effort:** Large. **Confidence:** High. **Harder later:** Yes.
- **Kind:** Fix after merge.
- **Added:** 2026-11-08, split off from finding 10 of PR #52, branch `conductor/boat-native-remote-workspaces-milestone-15o`, round 1, option F of its check. Option D of the check fixed the org suspension in that branch.
- **Location:** `createResource` and each Delete path under `worker/lifecycle/`, `worker/operator/org-data.ts`, the user suspension under `worker/operator/`, and the org deletion inventory at `worker/members/deletion-data.ts:110`.
- **Reason:** F reaches the allocation helper, the user suspension, and the org deletion, outside the diff of PR #52, and it needs a migration with a backfill.

- **Terms:**
  - **Cloud computer:** the sandbox that runs one workspace, or one image build.
  - **Cleanup record:** a database row that keeps the identity of a computer after its workspace row is removed, until a Delete succeeds.
  - **Org suspension:** the operator action that stops every computer of an org and blocks its members.
- **Background:** Each feature finds its computers in its own way. The org suspension reads the workspace rows, the unfinished builds, and now also the cleanup records. The user suspension and the org deletion read only the workspace and build rows.
- **Problem:** A computer that only a cleanup record keeps, after a failed Delete, is missing from the user suspension and from the org deletion inventory. So the org purge never stops or deletes it, and the user suspension can report done while it still runs.
- **Impact if no action:** A computer of a suspended user or a deleted org can keep running until its auto-stop deadline, and each new way to create a computer needs its own fix in every reader.
- **Root question:** How does every action that must stop or delete computers find all of them?
- **Options:**
  - **E.** Build one shared query of the computers, with an org scope and an owner scope. It returns live workspaces, unfinished builds, and cleanup records. The org suspension, the user suspension, and the org deletion all use it. The owner scope needs an owner column on the cleanup record, which is a small migration. Effort: Medium.
  - **F.** Keep one ledger of every computer, with its org, its owner or starter, and its purpose. `createResource` writes each entry before the provider creates the computer. Only a confirmed Delete removes the entry. The suspensions, the org deletion, and the cleanup read the ledger. Cost: a migration with a backfill, and each Delete path must clear its entry. A missed clear only makes a later Stop get "not found". Effort: Large.
- **Left out:** A fix in each reader alone, because the next new kind of computer repeats the gap.
- **Wider fix:** F.
- **Previous examples:** finding 10 of PR #52, and the cleanup-record gap of the org deletion that its check found.
- **Recommendation:** F. It gives each reader one source that no create can skip.
- **Action:** fix after merge, apply F, as the final call on finding 10 of PR #52 said on 8 November 2026.
