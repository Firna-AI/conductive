# Org NODE_OPTIONS reach the runner and helper

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-11, from the check of finding 5 in review round 1 of the branch `calummoore/github-push-failure`.
- **Location:** `image/runner-start.sh:3` to `:7`, `image/git-credential-helper.sh:4` to `:8`, and for comparison `worker/tools/image.ts:45` and `worker/tools/image.test.ts:74`.
- **Reason:** the review found it in code that the branch did not change.

- **Terms:**
  - **Sandbox variables:** the env values that the Worker gives a cloud computer at each start, with the org's env vars. The sandbox provider writes them to `/run/ascii-secrets/env.sh`.
  - **Private Node:** the Node runtime that the org image installs for Conductive's own programs, apart from the Node of the org's project.
- **Background:**
  - `runner-start.sh` loads every sandbox variable with automatic export, and then starts the agent runner with the private Node.
  - `git-credential-helper.sh` does the same before it starts the credential helper.
  - An org can set `NODE_OPTIONS` as an env var for its own app, for example to preload a module with `--require` or `--import`.
  - The tools launcher in `worker/tools/image.ts` removes `NODE_OPTIONS` before it starts the private Node. `worker/tools/image.test.ts` checks this.
- **Problem:** The runner and the credential helper get the org's `NODE_OPTIONS`. A preload that names a file of the org's project, or an option that the private Node does not accept, can stop them.
- **Impact if no action:** In such an org, the agents do not start, or Git gets no GitHub access. The org sees no reason.
- **Root question:** Which env values may reach the private Node of Conductive's own programs?
- **Options:**
  - **A.** Remove `NODE_OPTIONS` in `runner-start.sh` and `git-credential-helper.sh` before they start the private Node, as the tools launcher does. Add the case to the launcher tests. Effort: Small.
  - **B.** Start each program of the private Node with a fixed list of env values from the file, as `env -i` with the names that it reads. This also stops other Node variables, such as `NODE_PATH`. The runner reads many values, so its list is long. Effort: Medium.
  - **C.** Refuse an org env var named `NODE_OPTIONS` in the settings. This adds a new rejection, and an org then cannot set it for its own app. Effort: Small.
- **Left out:** Change nothing, because an org cannot see why its agents fail.
- **Wider fix:** B, because it also covers other variables that change Node.
- **Previous examples:** The tools launcher removes `NODE_OPTIONS` for the same reason.
- **Related:** `plans/follow-ups/launcher-turn-id-restore.md` changes the same credential launcher.
- **Recommendation:** A. It matches the tools launcher at a small cost.
- **Action:** ask the user, because the review found it outside the branch, and the user chooses when to fix it.
