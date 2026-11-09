# Late scheduling failure adds a false log

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-09, from the independent check of review finding 2 on `calummoore/box-auto-build-onboarding`.
- **Location:** `worker/lifecycle/build-data.ts:157` and `worker/lifecycle/image-build-failure.ts:24`.
- **Reason:** A late scheduling reply must follow an alarm's failure, and the fix costs the same after the merge.

- **Terms:**
  - **Image build:** A job that prepares the saved cloud computer image of an org.
  - **Image coordinator:** The org's Durable Object that advances image builds through alarms.
- **Background:** `startImageBuild` calls `failUnscheduledBuild` when its scheduling request fails. A lost scheduling reply can reach that caller after an alarm already failed the build. `failUnscheduledBuild` calls the shared `failBuild` writer.
- **Problem:** `failBuild` updates the error only while the build is running. Its log statements run even when that update changes no row. A late scheduling failure therefore appends `The cloud computer build could not start. Try again.` after the actual failure.
- **Impact if no action:** The log shows an additional failure that did not cause the build to end. An admin can follow the wrong cause during recovery.
- **Root question:** How does a build log keep only the failure that ended its running build?
- **Options:** Each option includes a regression that fails the build, delivers a late scheduling failure, and reads the log.
  - **A.** Guard only the log added by `failUnscheduledBuild`. Other callers can still append a failure without a state change. Effort: Small.
  - **B.** Make shared `failBuild` write its state change and failure log only when that call wins the running-to-failed transition. Preserve one atomic operation. Effort: Small.
  - **C.** Give the scheduling caller and coordinator guarded ownership of a job before either can fail it. This reaches build admission and changes the immediate scheduling failure rule. Effort: Medium.
- **Left out:** Removing the scheduling failure log loses the reason when that failure really ends the build. Suppressing all later log output would also hide cleanup diagnostics.
- **Wider fix:** B. One shared writer ties the failure log to the failure transition.
- **Previous examples:** The conditional state write already exists in `failBuild`. Its unconditional log statements remain outside that condition. No earlier fix for this log defect was found.
- **Related:** `plans/follow-ups/scheduling-failure-loses-build-cleanup.md` records the cleanup effect of the same late scheduling failure. Its recommended cleanup query fix does not fix this log.
- **Recommendation:** B. It protects each caller without changing normal failure behavior.
- **Action:** fix after merge, apply B, because this is a Rare product bug and the fix is not harder after the merge.
