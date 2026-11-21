# Update cleanup fails when the previous release is lost

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-20, from branch `calummoore/sandbox-start-issue-secrets-q3is`, during the repair of a sandbox whose runner parts a disk restore lost.
- **Location:** `collect_unused` in `crates/cnd-cli/src/update/state.rs`, `started` in `crates/cnd-cli/src/update/engine.rs`.
- **Reason:** the warning costs nothing at a start, and it goes away by itself at the next release, so the fix can wait for its own branch.

- **Source:** Implementation. **Category:** Product bug.
- **Terms:**
  - **Release store:** the folder `/opt/conductive` of a sandbox. It holds `versions/<version>/`, content-addressed `parts/<sha256>/`, and the links `current` and `previous`.
  - **Collection:** the cleanup that `conductive update started` runs after the runner confirms its release. It keeps current, previous, and the release that the next apply selects, and removes other versions and unused parts.
- **Background:**
  - On 2026-11-20, a Boat disk restore lost older files under `/opt/conductive` of sandbox `bx_wfd6s4h2`. The folder `versions/0.0.1311` was gone, but the link `previous` still named it.
  - Collection reads `parts.json` of each kept version to find the parts to keep. A missing `parts.json` returns an error before any removal.
  - So after each runner start, the journal shows `WARN The connected runner release could not be confirmed.` The pending marker is already clear at that point, so the start works.
  - A fallback to that missing previous release would also fail, because the system installer of the previous release is gone.
  - The next release replaces `previous` with a version that exists, so the warning then stops.
- **Problem:** One lost version folder stops all collection, and it makes each start log a false warning that the release is not confirmed.
- **Impact if no action:** Unused versions and parts stay on the disk until the next release. The warning hides real confirmation failures in the journal.
- **Root question:** How does collection behave when a version that it must keep is no longer on the disk?
- **Options:**
  - **A.** Skip a kept version whose folder or `parts.json` is missing, log one warning, and collect the rest. Effort: Small.
  - **B.** Option A, and also remove a `previous` link that names a missing version, so that apply cannot fall back to it. Effort: Small.
  - **C.** Change nothing. The next release clears the state. Effort: Small.
- **Left out:** Downloading the lost previous release again, because the release server keeps only the newest release metadata, and a fallback target older than current has little value.
- **Wider fix:** B, because it also removes the broken fallback target.
- **Previous examples:** None found.
- **Recommendation:** B. It keeps collection working and stops a fallback to a release that cannot start.
- **Action:** fix after merge, apply B, because the problem is rare and the start works without the fix.
