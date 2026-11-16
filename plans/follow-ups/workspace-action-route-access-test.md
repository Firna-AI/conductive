# One access test for all workspace action routes

- **Severity:** Medium. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-16, from branch `calummoore/clickable-dropdown-restart-server-6gn7`, review item 3.
- **Location:** `worker/features/restart-routes.test.ts`, `worker/features/continue-routes.test.ts`, `worker/features/archive-routes.test.ts`.
- **Reason:** It is a test for a class of issue, which needs the user's approval.

- **Background:** Each workspace action route, such as Resume, Continue, Archive, Restore, and Restart, checks the org, the membership, and the suspension of the org and the owner. Each route has its own test, or none.
- **Problem:** A new action route can miss one check, and only its own test, when written, would find it.
- **Impact if no action:** A later route could let an outsider or a suspended org act on a workspace.
- **Root question:** What proves that every workspace action route refuses the same people?
- **Options:**
  - **A.** Keep one test for each route. Effort: Small.
  - **B.** One table-driven test sends each action route as an outsider, a member of a suspended org, and a member while the owner is suspended. Effort: Medium.
- **Left out:** A shared access guard for all routes. It is structural, but the routes have different owner rules, such as Archive for the owner and the admins only.
- **Wider fix:** B.
- **Previous examples:** Review item 3 of the Restart branch.
- **Recommendation:** B.
- **Action:** ask the user, because a test for a class of issue needs approval.
