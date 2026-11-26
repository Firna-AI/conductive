# Choose service restoration after resume

- **Severity:** Medium. **Effort:** Large. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-20, from the approved services scope on `calummoore/run-dev-servers-as-services-55oo`.
- **Location:** `docs/protocol/services.md`, `docs/protocol/stop-and-resume.md`, `crates/cnd-runner/`, and `worker/lifecycle/`.
- **Reason:** Cal deferred service restoration from the first release on 20 November 2026.

- **Terms:**
  - **Service:** A named process that runs in its own systemd unit, outside agent turns and the runner service.
  - **Resume:** A new run of a stopped workspace's cloud computer.
  - **Keep mark:** A proposed explicit request to restore one service after resume.
- **Background:** The first services release uses runtime storage for definitions and logs. A computer stop ends each service and discards those records. A new computer run starts with no registered services. Cal approved this first-release scope on 20 November 2026.
- **Problem:** A member must start each needed service again after a stop. Automatic restoration remains a separate choice.
- **Impact if no action:** Previews stay without their service until a member or agent starts it again.
- **Root question:** What should a computer resume restore for services?
- **Options:**
  - **A.** Keep the current runtime-only rule. A member or agent starts each service again. Effort: Small.
  - **B.** Keep encrypted definitions across stops and list them as stopped after resume. Start nothing automatically. Effort: Large.
  - **C.** Add an explicit keep mark. Save protected definitions and restart only marked services after normal workspace startup. Use fresh allowed variables. Effort: Large.
  - **D.** Keep protected definitions and restart services recorded as running before the stop. Explicitly stopped and ended services stay stopped. Effort: Large.
  - **E.** Start services from the org startup script after each normal resume. This needs the command before runner readiness. Only admins change that script. Effort: Medium.
  - **F.** Restore services declared in a repository file. This adds a file format and a new automatic execution source. Effort: Large.
- **Left out:** Copy process memory. A registered service already has its command and folder, so restoration needs no memory image.
- **Assumptions:** Services remain outside turns and never count as activity. Cal chose that rule on 20 November 2026. Restoration must not change idle stop, background work, or turn limits.
- **Wider fix:** C or D use recorded service definitions instead of guessing from detached processes.
- **Previous examples:** On 16 November 2026, Cal chose automatic command restoration for Terminal commands. That separate design left servers outside Terminal open under the title "Restart decision 3: Servers that run outside the Terminal".
- **Related:** This item covers registered services only. The separate terminal restoration work still owns Terminal commands and its question about unregistered servers.
- **Recommendation:** C. An explicit mark makes automatic service execution a visible choice for each service.
- **Action:** ask the user, because automatic execution after resume and storage of definitions need a new approved contract.

Any restoration design must protect full arguments and explicit values that can contain secrets.
It must use fresh allowed settings and must not restore turn credentials or secret-run additions.
It must start no project service during a build or a disk-retention boot.
The keep proposal clears the mark on Stop. Its logs and other ended records still end with the computer run.
Changing this behavior needs its own plan, mockups when needed, compatibility path, tests, and pull request.

History: [the separate terminal restoration question](https://github.com/Firna-AI/conductive/blob/6e9164d74503f381c9f1bd4f26eabbd758257290/plans/restart-terminal-commands.md#3-servers-that-run-outside-the-terminal).
