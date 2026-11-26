# An allow-all answer leaves other requests waiting

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-21, from branch `calummoore/mac-permission-issue-o7fv`, review round 3. Updated on 2026-11-26 by branch `calummoore/needs-input-at-the-composer-milestones-3-j8a8`, from the finding check of review finding 87 of its round 2, which found that the Mac commands protocol doc states the behaviour of option A.
- **Location:** `desktop/src/device/session.ts:134` (the `command.approval` handling, with the two allow-all answers at lines 150 and 155) and `:173` (the `settings.operation` handling of the switch). `docs/protocol/desktop-commands.md:117`.
- **Reason:** The same path is on `main`, so the fix belongs in a separate branch.

- **Terms:**
  - **Grant:** a permission on one Mac that runs every command from one workspace with no question, for 15 minutes or until Stop.
- **Background:**
  - When a member answers a waiting Mac command request with "Allow all commands for 15 minutes" or "Allow all commands until I stop", the Mac app starts a grant for the workspace and runs the answered request.
  - The start of a grant from the Capabilities switch already runs every waiting request of the workspace that the grant permits, in the `settings.operation` handling for `start-workspace-until-stop`.
  - `docs/protocol/desktop-commands.md`, "The choices", says of a start from the switch: "Such a start also runs each request of that workspace that waits on that Mac, as Allow all commands until I stop does." So the doc says that the answer Allow all commands until I stop runs each waiting request of the workspace on that Mac.
  - The same section says: "A grant is the permission of the 15 minutes or until Stop. It covers every command from one workspace on one Mac."
  - The doc sentence came with the Mac access switch, in commit `69d60d0d0` (#614) on 22 November 2026.
- **Problem:** An allow-all answer runs only the answered request. Another waiting request of the same workspace, which the new grant covers, keeps waiting for an answer. A review diagnostic confirmed that only the first request ran. So the Mac app does not do what the Mac commands doc says.
- **Impact if no action:** The member must answer a request that the grant they just gave already covers. A reader of the doc expects the other requests to run.
- **Root question:** When a member gives a grant, does every waiting request that it covers run?
- **Options:**
  - **A.** After an allow-all answer, run each waiting request of that workspace that the new grant covers, as a start from the switch does. The Mac app then meets the doc. Effort: Small.
  - **B.** Change nothing in the Mac app. Correct the doc sentence, so that only a start from the switch runs the waiting requests. It changes a requirement, so it needs the user. Effort: Small.
- **Left out:** None. The fix has one place.
- **Wider fix:** A. One helper that runs the covered waiting requests after each new grant serves the answer and the switch.
- **Previous examples:** The start from the Capabilities switch already runs the waiting requests.
- **Recommendation:** A. It meets the doc and the reach of a grant, so a member never answers a request that their grant covers.
- **Action:** fix after merge, apply A, because the same path is on `main`, and the change that found the doc sentence does not touch the Mac app.
