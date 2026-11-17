# Skills copy warnings reach only the runner log

- **Severity:** Low. **Likelihood:** Common. **Effort:** Large. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-17, from branch `calummoore/oslo-3u7a`, a design call of the org skills repository plan.
- **Location:** `crates/cnd-runner/src/skills/service.rs`, `docs/protocol/org-skills.md`.
- **Reason:** A status in the app adds a new report from the runner to the Worker and a new state in the Skills section, which is new behaviour that the user decides.

### 1. Skills copy warnings reach only the runner log

- **Severity:** Low. **Likelihood:** Common. **Effort:** Large.
- **Source:** Design.
- **Category:** Product bug.
- **Location:** `crates/cnd-runner/src/skills/service.rs`.
- **Terms:**
  - **Skills copy:** the copy of the org skills repository that the runner keeps in each cloud computer.
- **Background:** The Skills section shows the skills that a GitHub lookup finds. The runner warns in its own log when a copy or a check fails, when it removes a link, or when two skills have the same name. No member reads that log.
- **Problem:** When a workspace's copy fails, for example on a network fault, the section still lists the skills, and the agents of that workspace do not have them.
- **Impact if no action:** A member can believe that agents have skills that they do not have.
- **Root question:** How does a member learn that a workspace's agents do not have the org skills?
- **Options:**
  - **A.** Keep the log only. Effort: Small.
  - **B.** Each runner reports the result of its last copy, and the section shows the newest result of the org. Effort: Large.
  - **C.** As B, but the section lists each workspace without skills and its cause. Effort: Large.
- **Left out:** A check at Save, because it cannot see a fault of one workspace.
- **Wider fix:** C.
- **Previous examples:** Options D and F of decision 7 of the org skills repository plan, which the user did not choose.
- **Related:** `plans/follow-ups/skills-startup-cleanup-hides-restored-copy.md` changes the same runner warning paths. Its fix does not depend on this status choice. A cleanup warning must not make a later status report mark a usable published copy as failed.
- **Recommendation:** B. It shows the common fault with one result for the org.
- **Action:** ask the user, because it adds a new report and a new state.
