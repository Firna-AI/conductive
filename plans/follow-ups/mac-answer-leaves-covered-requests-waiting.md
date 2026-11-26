# An allow-all answer leaves other requests waiting

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-21, from branch `calummoore/mac-permission-issue-o7fv`, review round 3.
- **Location:** `desktop/src/device/session.ts` (the `command.approval` handling, near line 150).
- **Reason:** The same path is on `main`, so the fix belongs in a separate branch.

- **Terms:**
  - **Grant:** a permission on one Mac that runs every command from one workspace with no question, for 15 minutes or until Stop.
- **Background:** When a member answers a waiting Mac command request with "Allow all commands for 15 minutes" or "Allow all commands until I stop", the Mac app starts a grant for the workspace and runs the answered request. The start of a grant from the Capabilities switch already runs every waiting request of the workspace.
- **Problem:** An allow-all answer runs only the answered request. Another waiting request of the same workspace, which the new grant covers, keeps waiting for an answer. A review diagnostic confirmed that only the first request ran.
- **Impact if no action:** The member must answer a request that the grant they just gave already covers.
- **Root question:** When a member gives a grant, does every waiting request that it covers run?
- **Options:**
  - **A.** After an allow-all answer, run each waiting request of that workspace that the new grant covers, as a start from the switch does. Effort: Small.
  - **B.** Change nothing. Effort: Small.
- **Left out:** None. The fix has one place.
- **Wider fix:** A. One helper that runs the covered waiting requests after each new grant serves the answer and the switch.
- **Previous examples:** The start from the Capabilities switch already runs the waiting requests.
- **Recommendation:** A.
- **Action:** fix after merge, apply A.
