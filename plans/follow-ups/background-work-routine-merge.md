# Check a routine merge after background work

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-11, from branch `conductor/background-work-keeps-turn-open-implementation`.
- **Location:** `runner/README.md`, `docs/protocol/agent-runner.md#background-work`, and the existing routine in Conductive.
- **Reason:** The task needs the merged runner in a new org image and a real routine workspace.

- **Terms:**
  - **Routine:** a saved prompt that starts an agent in a new workspace.
  - **Turn:** the agent's work on member input, including its waits and work after background notifications.
  - **Org image:** the software image that supplies the runner when a new cloud computer starts.
- **Background:**
  - On 11 November 2026, a routine opened PR #225, watched CI in the background, and ended its reply.
  - The runner then closed its Claude process and killed the watch, so the agent never merged the pull request.
  - Five earlier routine runs had the same outcome: PRs #209, #214, #217, #218, and #224.
  - On 11 November 2026, the user chose to keep Claude turns open for live background work, with one note and native notifications.
  - The limit is 120 minutes from the first wait. On 13 November 2026, the user raised it to 30 days. Agent work after a wake-up counts.
  - A member message during a wait restarts that count. The limit applies after a reply that runs past it.
  - At the limit, the turn finishes with duration, files, and the line "Background work stopped at the time limit".
  - Codex turns keep their existing behavior. The Worker lifecycle, idle stop, and turn-token rules stay the same.
  - Local proof used the pinned Claude program and real tasks with scripted replies from a local model endpoint.
  - A real deployed routine must still prove the complete model, gateway, image, GitHub, and CI path.
- **Task:** After the merged change is deployed, build an org image with the new runner. Run the existing routine once.
  Use its prompt that authorizes the agent to merge its pull request after CI passes.
  Check that its background watch survives the reply and that the notification continues the same turn.
  Check that the agent merges the pull request after CI passes without another member message.
- **Impact if no action:** A fault that needs the deployed image or real model path can still leave routine pull requests unmerged.
- **Needs:** The deployed change, a new org image with this runner, a connected Claude login, and a routine authorized to merge.
  The merge must follow the repository's current rules and the routine's explicit authorization.
- **Done when:** One routine run receives its CI result after the reply and merges its pull request in that same turn.
