# The runner pre-start step has no own limit

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-20, from branch `calummoore/sandbox-start-issue-secrets-q3is`, review round 1, the wider fix of finding 2.
- **Location:** `image/release/conductive-runner.service`, the `ExecStartPre=` line, and `crates/cnd-cli/src/update/repair.rs`.
- **Reason:** the branch bounds the part downloads of apply at 60 seconds, so a backstop for the other steps can wait.

- **Source:** Review. **Category:** Product bug.
- **Terms:**
  - **Pre-start step:** the `ExecStartPre=` command of `conductive-runner.service`. It runs `conductive update apply` when `/run/conductive/workspace-ready` exists.
- **Background:**
  - The unit sets no `TimeoutStartSec=`, so it uses the systemd default of 90 seconds. On a timeout, systemd ends the step, and the start fails.
  - Apply bounds its part downloads at 60 seconds in total. The unpack of a part is synchronous, and that limit does not cover it. The `sdk-helper` part unpacks to about 794 MB. The wait for `part-publish.lock` covers only one rename.
  - The Restart command of the workspace header needs the runner back within 3 minutes.
- **Problem:** A slow unpack can still pass the systemd limit. Then apply ends with no warning.
- **Impact if no action:** That start fails like a start before the repair, with no log line that names the cause.
- **Root question:** How does the runner start go on when any step of apply is slow?
- **Options:**
  - **A.** Change nothing. The download limit covers the slow step that the incident showed. Effort: Small.
  - **B.** Set an explicit `TimeoutStartSec=` in the unit, and run apply under `timeout` with a limit below it. On exit status 124, log a warning and start the runner. Cost: a cut activation can start a release whose system installer did not finish. A cut fallback starts the unconfirmed pending release again, which can then confirm itself or loop when it exits at launch. So B must not start the runner while a pending marker remains. Effort: Small.
  - **C.** Run the unpack in a blocking task that reports progress, and stop the repair at the deadline. Cost: a blocking task cannot be stopped, so the process still waits for it at exit. Effort: Medium.
- **Left out:** A higher systemd limit alone, because Restart needs the runner back within 3 minutes.
- **Wider fix:** B, because it bounds the whole step, whatever step is slow.
- **Previous examples:** Commit `93ae7fc22` bounds the update check inside Restart.
- **Recommendation:** B. It is a small backstop for every slow step.
- **Action:** fix after merge, apply B, because the branch covers the downloads, and B changes the unit, which the release installs on every sandbox.
