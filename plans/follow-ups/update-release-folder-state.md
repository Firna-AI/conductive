# One rule for the state of a release folder

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-22, from branch `calummoore/sandbox-start-issue-secrets-v2-ffdj`, review round 2, the wider fix of finding 8.
- **Location:** `prepare_version` in `crates/cnd-cli/src/update/staging.rs`, `release_ready` and `switch_waits` in `crates/cnd-cli/src/update/presence.rs`, `download` in `crates/cnd-cli/src/update/download.rs`, and `next_version` and `apply` in `crates/cnd-cli/src/update/engine.rs`.
- **Reason:** the branch tests each rule on the real store, and one shared classification changes the store interface and every update caller.

- **Source:** Review. **Category:** Code structure.
- **Terms:**
  - **Release folder:** `/opt/conductive/versions/<version>/`, with the program, `parts.json`, one link for each part, and a `complete` marker.
- **Background:**
  - Four places decide what a release folder can do. `prepare` refuses to replace a complete folder with a readable `parts.json`. `release_ready` decides if a start or an idle install may select a newer release. `switch_waits` decides if a switch or a fallback must wait. The check decides between an in-place repair and staging again.
  - Each place reads the marker, the parts list, the parts, or the links on its own.
- **Problem:** A change to one rule can leave another place with a different meaning of the same folder state.
- **Impact if no action:** A later change can make a check replace a folder that a start still selects, or a start select a folder that a check replaces.
- **Root question:** How do all update callers share one meaning of a release folder's state?
- **Options:**
  - **A.** Change nothing. The real-store tests guard each rule. Effort: Small.
  - **B.** Add one store result for a release folder: ready, missing parts or links, parts list unreadable, or no complete marker. Make the check, the selection, the switch rule, and `prepare` read only that result. Test each outcome once on disk. Effort: Medium.
- **Left out:** A second store decision only for staging, because it adds a fifth copy of the rule.
- **Wider fix:** B, because one result removes the separate copies.
- **Previous examples:** Review round 1 of this branch found that the check deleted a complete folder that a start could still select.
- **Related:** `plans/follow-ups/update-repair-selected-release.md`: its option C returns a value that names the release that a repair checked. B can carry that value.
- **Recommendation:** B. It gives each caller the same answer.
- **Action:** fix after merge, apply B, because the branch already guards each rule with a real-store test.
