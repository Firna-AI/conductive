# Terminal fixes do not reach existing workspaces

- **Severity:** Medium. **Likelihood:** Common. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-08, from branch `calummoore/directory-path-length`, review round 1, finding 1. It is the blocked wider fix of that finding.
- **Location:** `terminalInstallCommand()` at `worker/lifecycle/image-software.ts:82`, `startWorkspaceTerminal` at `worker/terminal/service.ts:98`, and the delivery rule in `worker/terminal/README.md`, the paragraph that starts "The command puts no password in the image".
- **Reason:** the fix overrides a documented rule on `main`, so it needs the user's approval.

- **Terms:**
  - **Terminal programs:** the launcher, the shell server, and the password program of the Terminal tab, under `/usr/local/lib/conductive/` in each sandbox.
  - **Org image:** the saved snapshot that every new workspace of an org starts from. Each image build installs the terminal programs.
- **Background:**
  - Only the software step of an org image build runs `terminalInstallCommand()`, at `worker/lifecycle/image-software.ts:82`. A refresh of the image does not run it.
  - A workspace keeps the files of the image that it started from. A resume restores the workspace's own disk, so it keeps its terminal programs too. `worker/terminal/README.md` states this rule.
  - On 8 November 2026, the branch `calummoore/directory-path-length` fixed the launcher so that the workspace shell opens in the live repository folder after Boat restores the disk. Its post-merge check had to use a new workspace, because an existing workspace keeps the old launcher.
  - No recorded reason covers this rule for the three programs. The plan gives a reason only for putting the service into the image.
- **Problem:** A fix to the terminal programs reaches only the workspaces that start from an image that a build makes after the deploy. Each existing workspace keeps the old programs and their bug, also after a resume.
- **Impact if no action:** Users of an existing workspace keep a fixed terminal bug until they create a new workspace. For example, the workspace where the user saw the long `/var/lib/ascii-lazy/retired/` path keeps that bug.
- **Root question:** How does a fix to the terminal programs reach the workspaces that already exist?
- **Options:**
  - **A.** Keep the rule. Say in each terminal fix that existing workspaces need a new workspace to get it. Effort: Small.
  - **B.** Install the three terminal programs at each workspace start. `startWorkspaceTerminal` writes them from `worker/terminal/scripts.ts` before it starts the unit. Every start then runs the programs of the deployed Worker. It adds root file writes to each start, and new programs can run with the older systemd units of an older image. Effort: Medium.
  - **C.** As B, but write the programs only when a version marker in the sandbox is older than the Worker's version. It skips the writes when nothing changed, and it adds a marker to keep. Effort: Medium.
- **Left out:** A refresh that runs the install command. A refresh changes only new workspaces, so it fails the goal for existing ones.
- **Wider fix:** B. Each start then gets the programs of the deployed Worker, so no later terminal fix has this problem.
- **Previous examples:** None found.
- **Recommendation:** B. It is the simplest way to keep every workspace on the deployed programs, and the start already runs root commands for the terminal. C adds a marker for a small saving.
- **Action:** ask the user, because B and C override the documented rule that a workspace keeps the terminal files of its image.
