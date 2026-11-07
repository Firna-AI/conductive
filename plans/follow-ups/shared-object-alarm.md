# The device broker overwrites the workspace alarm

- **Severity:** Medium. **Likelihood:** Common. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-08, a problem outside the scope of the check of finding 3 of PR #47, branch `conductor/boat-native-remote-workspaces-milestone-5c`, round 2.
- **Location:** `worker/workspace.ts:215-218` and `worker/devices/broker.ts:188-199`.

- **Terms:**
  - **Workspace object:** the Durable Object that owns one workspace's lifecycle, chat, and Mac device requests. It has one alarm.
  - **Device broker:** the part of the workspace object that sends commands to a connected Mac.
- **Background:** The lifecycle sets the object's alarm for start polls, provider retries, idle stops, and disk restarts. The device broker sets the same alarm for its own timeouts.
- **Problem:** While a Mac is connected, the device broker writes its alarm time over the time that the lifecycle set. No code keeps the earlier of the two times.
- **Impact if no action:** A start poll or a provider retry can wait up to 30 seconds longer, and a lifecycle step can be late while a Mac is connected.
- **Root question:** How do the lifecycle and the device broker share the one alarm of the workspace object?
- **Options:**
  - **A.** Make each writer keep the earlier time: read the current alarm and set the new time only when it is earlier, and let the alarm handler run both owners' due work. Effort: Small.
  - **B.** Add one alarm scheduler to the object that holds the next due time of each owner and sets the alarm to the earliest. Each owner asks the scheduler, and no owner calls `setAlarm` itself. Effort: Medium.
- **Left out:** A second object for the device broker, because the device commands must stay in the same serial queue as the workspace.
- **Wider fix:** B. One scheduler prevents the next owner from writing over the alarm too.
- **Previous examples:** None found.
- **Recommendation:** B. It ends the class with one small owner of the alarm.
- **Action:** fix after merge, apply B, because the problem is outside the scope of PR #47.
