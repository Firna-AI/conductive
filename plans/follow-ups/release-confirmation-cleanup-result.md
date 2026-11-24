# Cleanup hides a successful release confirmation

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-18, from the options check of branch `calummoore/oslo-3u7a`.
- **Location:** `started` in `crates/cnd-cli/src/update/engine.rs`, `crates/cnd-runner/src/engine/handler.rs:124`.
- **Reason:** The repository trust change does not change release confirmation or release cleanup.

### 1. Cleanup hides a successful release confirmation

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small.
- **Source:** Review.
- **Category:** Product bug.
- **Terms:**
  - **Release confirmation:** The saved update state that clears a pending release after its runner connects.
- **Background:** The runner confirms its release after its first welcome. The updater clears the pending value, then removes old releases.
- **Problem:** The command returns the later cleanup error even when the confirmation was saved. The runner then logs "The connected runner release could not be confirmed." A successful command can also skip confirmation when another process holds the apply lock.
- **Impact if no action:** The warning can describe the wrong failure. New code must not treat this command's success as exact proof of confirmation.
- **Root question:** How do callers distinguish release confirmation from optional cleanup?
- **Options:**
  - **A.** Keep the result and make the warning describe both possible failures. Effort: Small.
  - **B.** Keep cleanup separate from the result that confirms the running release. Make a skipped confirmation explicit to callers that require proof. Preserve fallback and lock ownership. Effort: Small.
  - **C.** Read the saved update state with a stable current/journal/current read. This can prove confirmation, but it leaves the incorrect warning. Effort: Medium.
- **Left out:** Removing old-release cleanup would leave persistent disk growth. Ignoring every updater error would hide a failed confirmation.
- **Wider fix:** B separates the required state transition from optional maintenance.
- **Previous examples:** The skills copy schedule treats later cleanup errors as nonfatal. Its startup cleanup has a separate follow-up in `plans/follow-ups/skills-startup-cleanup-hides-restored-copy.md`.
- **Related:** `plans/follow-ups/skills-copy-status-in-app.md` plans a stable confirmation reader for its report gate. That gate leaves this warning unchanged.
- **Recommendation:** B. It gives callers an explicit confirmation result and retains cleanup.
- **Action:** fix after merge, apply B, because this rare updater path is outside repository trust.
