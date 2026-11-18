# A resume soon after a stop ends programs

- **Severity:** Low. **Likelihood:** Common. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-18, from the options check of the plan `plans/idle-stop-cancel.md` on the branch `calummoore/sandbox-issue-hrpv`.
- **Location:** the resume call in `worker/lifecycle/start-machine.ts:118`, and the restart of `conductive-runner.service` at the end of the startup command, which "Start in a workspace" in `image/start.md` describes.
- **Reason:** the change that found it cancels a stop in progress, and a resume after a completed stop follows a separate rule of `docs/protocol/stop-and-resume.md`.

- **Terms:**
  - **Kept machine:** the machine that Boat keeps for 10 minutes after a stop. A plain resume in that time usually gets it back, with its memory and its running programs.
  - **Runner service:** `conductive-runner.service`, the systemd service of the program in the sandbox that runs the agent turns. A restart of it ends each program that an agent started.
- **Background:** Boat keeps the machine of a stopped sandbox for 10 minutes, and Boat does not bill that time. A plain resume in that time usually takes back the machine, with its memory and its running programs. Boat counts no start for such a resume. The resume of the app sends the org's env vars in the `env` field, which replaces the env vars of the sandbox. Its startup command then runs the org's startup script and restarts the runner service.
- **Problem:** A resume soon after a stop ends the programs that Boat kept, such as a dev server that an agent started. The rule "A stop ends every process in the sandbox" in `docs/protocol/stop-and-resume.md` allows this.
- **Impact if no action:** A member who resumes a few minutes after a stop must start each dev server again, although Boat kept it.
- **Root question:** Does a resume soon after a stop keep the programs that Boat kept?
- **Options:**
  - **A.** Keep the current rule. A stop ends every process, also when Boat keeps the machine. Effort: Small.
  - **B.** Take back the kept machine without `env` and without the startup steps, when its runner connects again within a short time. Run the normal start steps otherwise. B changes the stop rule. It also changes decision 17 of `docs/protocol/workspaces-and-sandboxes.md`, which gives each resume the current env vars of the org. Effort: Medium.
- **Left out:** A resume that never runs the startup steps, because a new machine from the snapshot then has no runner. Only two approaches exist, because the app either keeps the programs of the kept machine or ends them.
- **Wider fix:** None, because the problem is one rule of the resume.
- **Previous examples:** None found.
- **Recommendation:** A. The cancel of a stop in progress already keeps the programs for a member who returns during the stop, and B changes decision 17 for a window of 10 minutes.
- **Action:** ask the user, because B changes the stop rule and decision 17.
