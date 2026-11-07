# An approved Mac command can end up to 19 seconds late

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-07, from PR #23, branch `conductor/boat-native-remote-workspaces-milestone-15f`, round 2 finding 11.
- **Location:** the approval handler and `DeviceBroker.store()` in `worker/devices/`.
- **Reason:** the request still ends within its 30-second lease, which the agent tools protocol allows.

- **Background:** An approved command gets an execution deadline, which an alarm enforces.
- **Problem:** The approval stores the deadline without moving the alarm, so a short command can end only at the 30-second lease.
- **Impact if no action:** A command that the Mac never answers reports "not available" up to 19 seconds late.
- **Root question:** How does every stored deadline get its alarm?
- **Options:**
  - **B.** Put the alarm call into `DeviceBroker.store()`, so that no write of a pending item can skip it. Test an approval without a later ping. Effort: Small.
- **Left out:** A test that checks the alarm after each broker operation, because B prevents the case.
- **Wider fix:** B.
- **Previous examples:** None found.
- **Recommendation:** B.
- **Action:** fix after merge, apply B, because the lease still ends the request in time.
