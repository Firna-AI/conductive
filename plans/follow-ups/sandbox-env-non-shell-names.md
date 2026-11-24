# Saved env names that the sandbox shell cannot load

- **Severity:** High. **Likelihood:** Rare. **Effort:** Large. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-24, from branch `calummoore/own-computers-milestone-10-own-computer-hena` (pull request #677), the blocked wider fix of review finding 2, with two problems outside its scope.
- **Location:** `worker/app-api/feature-settings.ts:29`, `worker/lifecycle/sandbox-environment.ts:68`, `worker/sandbox/e2b/environment.ts:34`, `crates/cnd-host/src/config.rs:37`, `image/runner-start.sh:5`
- **Reason:** The fix changes decision 17 and the cloud path on `main`, so it waits for the user.

- **Terms:**
  - **Shell name:** a name of the form `[A-Za-z_][A-Za-z0-9_]*`, which `/bin/sh` can export.
  - **Env file:** `/run/ascii-secrets/env.sh` in each sandbox, which the sandbox software loads with `/bin/sh`.
- **Background:** An admin saves env vars on the Cloud computer tab. The settings accept each trimmed name that is not empty (`worker/app-api/feature-settings.ts:29`). The shared builder gives them to every sandbox (`worker/lifecycle/sandbox-environment.ts:68`). On E2B, each saved variable becomes an `export` line of the env file (`worker/sandbox/e2b/environment.ts:34`). The host program reads the env file through `/bin/sh` (`crates/cnd-host/src/config.rs:37`), and so does the runner start (`image/runner-start.sh:5`). Each own computer uses the same setup, and the computer connection accepts each name that Linux can hold, with no `=` and no NUL.
- **Problem:** A saved name that is not a shell name, such as `APP.CONFIG`, makes dash stop the whole env file load with status 2 at that line, so the lines after it do not load. A saved name that holds `=`, such as `CONDUCTIVE_TURN_ID=x`, passes the exact-name filter of the builder, and the E2B env file then sets `CONDUCTIVE_TURN_ID` to `x=<value>`. Only an admin can save such names.
- **Impact if no action:** Each start of such an org can fail on E2B today: the host program gets no machine token, and the runner start exits. The same happens on an own computer when its computer program writes the name into the env file of a container.
- **Root question:** Which saved env var names does a workspace get on each computer, and what happens to a saved name that its environment cannot hold?
- **Options:**
  - **A.** Keep the rule that each saved name goes as typed. Each env file writer, including the computer program of an own computer, writes only shell names and leaves out the others with no notice. Effort: Small.
  - **B.** One shared rule in the builder of every computer: leave out each saved entry whose name is not a shell name or whose value holds NUL, start the workspace, and mark that variable on the Cloud computer tab as not given to workspaces. It needs a protocol rule, a guide change, a mockup, and a read of both legal pages. Effort: Large.
  - **C.** As B, but give each non-shell name a derived name, such as `APP_CONFIG`, as secret variables do, with a rule for collisions. Effort: Large.
  - **D.** Refuse a non-shell name when the admin saves it, and handle older saved names as B does. Effort: Large.
- **Left out:** Refuse each start of an org with such a name: it blocks every start of the org.
- **Wider fix:** B.
- **Previous examples:** Commit `4ff3a95a2` aligned the displayed and supplied env names of secret runs and kept older names usable.
- **Recommendation:** B. It starts the workspace on every computer with one rule, and it tells the admin which variable the workspace does not get.
- **Action:** ask the user, because B changes decision 17 and the cloud path on `main`, and no recorded user decision covers the change.
