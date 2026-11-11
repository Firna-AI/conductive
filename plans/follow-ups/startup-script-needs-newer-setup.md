# A resume can fail before the setup notice shows

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-11, from branch `calummoore/build-image-install-order`, a new problem of the options check of the decisions of the software image plan.
- **Location:** `worker/lifecycle/workspace-resume.ts:48`, and "Startup script and env vars" in `docs/protocol/workspaces-and-sandboxes.md`.
- **Reason:** the behaviour already holds on `main`, and the plan of this branch changes only what the notice of an old setup offers.

- **Terms:**
  - **Startup script:** the org's script that runs in the cloud computer of each workspace at each start and resume.
  - **Install script:** the org's script that prepares the org image in each build and refresh.
- **Background:**
  - A resume runs the saved startup script of the org, the newest one.
  - An admin can change the install script and the startup script together, so that the new startup script needs a tool that only the new install script installs.
  - An old workspace keeps the setup of the install script that its disk holds. The plan of this branch adds a notice that offers the new install script, but the notice shows only after the start.
- **Problem:** The resume of such an old workspace can fail in the startup script, before the notice can offer the new install script.
- **Impact if no action:** The member sees a failed start, and the error does not say that the workspace has an older setup.
- **Root question:** How does an old workspace start when the newest startup script needs a newer setup?
- **Options:**
  - **A.** When a start fails in the startup script and the workspace has an older install script, the error names the older setup and offers the run of the install script. Effort: Medium.
  - **B.** Run the startup script of the org image that the workspace started from, not the newest one. Effort: Medium.
  - **C.** Keep a failed startup script from failing the start: the start goes on, and the workspace shows the failure with the setup notice. Effort: Medium.
- **Left out:** Change nothing, because the cause of the failure stays hidden.
- **Wider fix:** None found.
- **Previous examples:** None found.
- **Recommendation:** A. It keeps the startup script rule and names the real cause.
- **Action:** ask the user, because each option changes what a start does after a failed startup script, and no requirement covers it.
