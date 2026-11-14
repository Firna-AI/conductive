# Org routes wait for sequential gate checks

- **Severity:** Low. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-13, from the branch `calummoore/milan-ofz5`, outside the scope of its review.
- **Location:** `worker/members/gate.ts:37-44`, `worker/members/permissions.ts:11`, `worker/data/users.ts:88`, `worker/security/gate.ts:60-82`.
- **Reason:** The branch changed only the create route, and this gate runs before every org route.

- **Source:** Review. **Category:** Performance.
- **Terms:**
  - **D1:** the SQL database of the app, in Western Europe. The Worker runs near the user, so each read is one network trip.
- **Background:** Before each org route, the session gate reads the session and the app access. Then the members gate reads the user state, the membership, and the org state, one after another. So each org route waits for about five D1 trips before its handler runs. The branch `calummoore/milan-ofz5` added `settleInOrder` in `worker/lifecycle/access.ts`. It runs independent checks together, and the first failed check in its list names the error.
- **Problem:** The gate reads that do not depend on each other still run in turn. `requireOrgMember` in `worker/members/permissions.ts` also reads the user suspension again, after `sessionUser` already refused a suspended user in the same request.
- **Impact if no action:** Each org request far from Europe waits for some hundred milliseconds more than it needs.
- **Root question:** How does each org request pass its gate with the least wait for D1?
- **Options:**
  - **A.** Drop the second read of the user suspension in the members gate, because `sessionUser` already makes that check. Keep it for callers that did not pass the session gate. Effort: Small.
  - **B.** Run the independent reads of the members gate together with `settleInOrder`, in their current order. Effort: Small.
  - **C.** Read the user state, the membership, and the org state in one SQL statement, and pick the error in the current order. Effort: Small.
  - **D.** Turn on Smart Placement for the Worker, so that it runs near D1. This moves every route and needs a measurement first. Effort: Medium.
- **Left out:** Cache the membership in the Worker. A removed member could then keep access for the life of the cache, which breaks isolation.
- **Wider fix:** B. It uses the shared helper of the create route for every independent read.
- **Previous examples:** The branch `calummoore/milan-ofz5` did the same for `createWorkspace` and `requireOrgMember`.
- **Recommendation:** A, then B. A removes a full trip with no change of errors, and B removes the rest of the wait.
- **Action:** fix after merge, apply A and B, because they change the gate of every org route.
