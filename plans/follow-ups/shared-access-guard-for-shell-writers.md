# Each shell writer copies its access guard

- **Severity:** Medium. **Effort:** Large. **Confidence:** Medium. **Harder later:** Yes.
- **Kind:** Needs decision.
- **Added:** 2026-11-17, from branch `calummoore/conductive-mcp-nested-agents-iet3`, review finding 3, the blocked wider fix.
- **Location:** `worker/app-api/feature-shell-access.ts`, `worker/app-api/feature-workspaces-data.ts`, `worker/app-api/feature-sections-data.ts`, `worker/app-api/workspace-parent-change-data.ts`, `worker/automations/automation-write-data.ts`
- **Reason:** The fix refactors four SQL-heavy writer files and adds a lint, and the user must approve a new lint.

- **Terms:**
  - **Shell writer:** a Worker function that changes the workspace list, such as a rename, a section move, a parent change, or a section write, in one D1 batch.
  - **Access guard:** the SQL condition `activeShellMemberPredicate`, which checks that the org is active and that the sender is still an active member, inside the write batch.
- **Background:** Each shell writer checks access early, then writes in one D1 batch. The batch repeats the check, so a sender who loses access between the two steps changes nothing (`docs/protocol/agent-tool-access.md` and `docs/protocol/operator-actions.md`). Each writer writes the guard and its bound values by hand, with about 16 uses in 4 files.
- **Problem:** A writer can leave out the guard, bind it to the wrong values, or put it in the wrong statement. Only a race test for that writer finds it. Commit `446204638` added a missing race test for the section writer. The parent change writer of `move_workspace` had the same gap until its own race test was added.
- **Impact if no action:** A new writer can let a removed member or a suspended org change the workspace list, and no test fails.
- **Root question:** How does every shell writer keep the access check inside its batch, without a hand-written copy?
- **Options:**
  - **A.** Change nothing in the structure. Keep one race test for each writer, as the `testing` skill asks. Effort: Small.
  - **B.** Add one shared table of access-race cases that runs each writer. A new writer that nobody adds to the table is still missed. Effort: Medium.
  - **C.** Move the guard into one builder. The builder takes the org, the user, and a write statement, adds the guard and its bindings, and returns a branded statement type. The shared batch call accepts only that type. One race test covers the builder. A lint forbids a raw `db.batch` in the writer files. Effort: Large.
- **Left out:** A lint that only checks that each writer names the predicate. A guard with wrong bindings or that is always false still passes it.
- **Wider fix:** C. It removes the hand-written guard.
- **Previous examples:** Commit `446204638`, the section-move race test. Review finding 3 of `calummoore/conductive-mcp-nested-agents-iet3`, the parent-move race test.
- **Related:** `plans/follow-ups/workspace-action-route-access-test.md` covers the same class for workspace action routes, not for D1 writers.
- **Recommendation:** C. A type that cannot hold an unguarded write prevents the class, and the class has happened twice.
- **Action:** ask the user, because C adds a new lint, and a new lint needs the user's approval.
