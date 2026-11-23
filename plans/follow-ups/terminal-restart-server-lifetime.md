# Verify servers outside terminal turns

- **Severity:** Medium. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-20, from `calummoore/run-dev-servers-as-services-55oo`.
- **Location:** `crates/cnd-runner/src/helper/process.rs`, the pinned agent command runtimes, and the separate terminal restart work.
- **Reason:** The terminal restart change owns server restoration and has a separate branch and plan.

- **Terms:**
  - **Turn:** An agent's work on member input, including any tracked background wait.
  - **Detached server:** A server whose process outlives the agent's tracking of its shell command.
- **Background:** The separate terminal restart work records commands and proposes starting some of them again after a computer resume. Its unmerged branch is `calummoore/restoring-processes-after-shutdown-qpmj`. Its description says a plain agent server ends with the agent's turn.
- **Problem:** The runner ends the helper's process group at turn end. That does not establish the lifetime of shell children in other process sessions. A test on 18 November 2026 found that a plain Claude `command &` outlived its shell call and left the helper's process group. The test did not cross a real turn end. The pinned Codex source at version 0.167.0 starts shell commands with `setsid`. No real Codex turn test was run.
- **Impact if no action:** The terminal restart work can classify agent-started servers from an unsupported lifetime assumption. Its restoration choices can omit servers that remain alive until the computer stops.
- **Root question:** Which agent-started servers can remain after a turn, and how should the terminal restart work describe them?
- **Options:**
  - **A.** Remove the unconditional claim and describe only the verified process-group behavior. Keep the remaining uncertainty explicit. Effort: Small.
  - **B.** Run one-time checks across real turn ends for Claude and Codex in an isolated workspace. Then correct the terminal restart work from the results. Effort: Small.
- **Left out:** Change turn cleanup to make the old claim true. That changes process lifetime and requires a separate user decision. This item verifies and corrects the claim only.
- **Wider fix:** None. The task needs a one-time behavior check, not a new gate or a test of documentation.
- **Previous examples:** The runner's `KillMode=control-group` ends agent children at a runner-service restart. A turn end uses helper process-group cleanup instead. These are different boundaries.
- **Recommendation:** B. It settles the real turn boundary before restoration relies on the claim.
- **Action:** fix after merge, apply B, because the correction belongs to the separate terminal restart change.

The services change must not alter idle stop, background work, turn limits, or cleanup of ordinary agent commands. The user chose service units outside the runner on 20 November 2026. That choice does not settle restoration of unregistered detached servers.
