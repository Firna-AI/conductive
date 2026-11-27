# A relative runner state path lands in the repository

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-27, from branch `calummoore/failed-message-action-kssx`, round 1 check of review finding 3.
- **Location:** `crates/cnd-runner/src/config.rs:124`, `crates/cnd-runner/src/disk_files.rs:37`
- **Reason:** the behaviour is on `origin/main`, outside the disk hold change.

- **Terms:**
  - **State file:** the runner's file of chat events and turn records, `~/.conductive/runner-state.json` by default, or the path in `CONDUCTIVE_STATE_PATH`.
- **Background:** The runner accepts a relative `CONDUCTIVE_STATE_PATH`. It resolves it from its working folder, which is the repository folder (`image/runner-start.sh`). The Worker passes org env vars to the sandbox, so an org admin can set this name.
- **Problem:** With a relative path, the state file, which holds chat events, sits in the repository folder as an untracked file that an agent can commit.
- **Impact if no action:** Chat content can reach a commit and the remote repository.
- **Root question:** Where may the runner keep its state file?
- **Options:**
  - **A.** Reject a relative `CONDUCTIVE_STATE_PATH` with one warning, and use the default path. Effort: Small.
  - **B.** Drop an org env var named `CONDUCTIVE_STATE_PATH` in the Worker, as it drops `CONDUCTIVE_DISK_LINE_BYTES`. Effort: Small.
- **Left out:** Resolving the path from the home folder, because it still accepts a path into the repository.
- **Wider fix:** B, because the state file then has one owner.
- **Previous examples:** None found.
- **Recommendation:** B, because no Conductive code sets the variable, so only an org env var can set it.
- **Action:** ask the user, because B removes a documented setting.
