# A stale switch wake fails its own build

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-20, from branch `calummoore/operator-switch-user-boat-e2b-rn5q`, review finding 2.
- **Location:** `waitProviderSwitch` in `worker/lifecycle/provider-switch-data.ts`, and `progressProviderSwitch` in `worker/lifecycle/provider-switch-builds.ts`.
- **Reason:** It needs an unusual overlap of two wakes, and the switch retries without losing the current org image.

- **Terms:**
  - **Switch:** an operator's change of an org's provider account, stored in `org_provider_switches`. It is `waiting` until its switch build starts, then `building`.
  - **Switch build:** the hidden build of the org image on the new account.
  - **Wake:** a request or an image alarm that checks whether a switch can start or continue. It calls `progressProviderSwitch`.
  - **Fence:** `fenceSwitchBuild`, which fails a switch build when its switch is no longer `building` with that build.
- **Background:** Requests, Lift, Restore, the image alarm, the repair cron, and the repository-change webhook can all progress the same switch. Progression reads the switch and the running job in separate reads. Then it admits the switch build, or records a wait with `waitProviderSwitch`. The admission write already requires `state = 'waiting'`. The wait write does not check the state.
- **Problem:** One wake reads the switch as `waiting`. A second wake then admits the switch build. The first wake sees that build as another job, and `waitProviderSwitch` moves the switch back to `waiting` with the reason `job`. The next advance of the build meets the fence and fails the valid switch build.
- **Impact if no action:** The switch loses its build progress and starts again later. A member build that waited behind it runs first, on the old account. The operator sees a wait for the switch's own build.
- **Root question:** How does each progression write stay valid when another wake changed the switch after this wake read it?
- **Options:**
  - **A.** In the wait write, exclude the switch's own build ID from a job wait. Add the interleaving as a regression test. It covers only the job wait. Effort: Small.
  - **B.** Make `waitProviderSwitch` update the wait only while the stored switch is `waiting`. Remove its move from `building` to `waiting`. The failure and suspension writers keep that move. Add the interleaving as a regression test. Effort: Small.
  - **C.** Give the image coordinator sole ownership of progression, and route every caller through it. Effort: Medium.
  - **D.** Stop storing the wait. Derive it when the Worker reads the switch, from the running job and the org state. Effort: Medium.
  - **E.** Add a `revision` column to `org_provider_switches`, and apply each progression write only at the revision that it read. Effort: Medium.
- **Left out:** A read again just before the write. It leaves the same race between that read and the write.
- **Wider fix:** B. Each wait caller uses this writer, so a waiting-only writer cannot undo an admitted build, whatever the wait reason.
- **Previous examples:** Commit `5e23fb565`, PR #530, centralized image-build endings so that a stale publisher could not overwrite an earlier failure.
- **Recommendation:** B. It gives the one switch writer without a state check the same check that the other switch writers use, at Small cost.
- **Action:** fix after merge, apply B, because it needs an unusual overlap of two wakes, and the switch retries without losing the current org image. Apply it only with the repair of review finding 1 in place: today the move to `waiting` also clears a switch whose build an older Worker ended.
