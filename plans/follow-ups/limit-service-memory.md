# Choose memory limits for services

- **Severity:** Medium. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-20, from the approved services scope on `calummoore/run-dev-servers-as-services-55oo`.
- **Location:** `docs/protocol/services.md`, `docs/protocol/agent-runner.md`, and `crates/cnd-runner/`.
- **Reason:** Cal deferred memory caps and changed memory-victim preferences from the first release on 20 November 2026.

- **Terms:**
  - **Service:** A named process that runs in its own systemd unit, outside agent turns and the runner service.
  - **Memory cap:** A maximum for the memory used by one service's complete process tree.
- **Background:** A service uses memory only while its computer runs for another reason. Services never count as activity. The first release sets no per-service memory cap and changes no memory-victim preference. A memory kill stops that service unit and reports Failed. Ordinary agent commands keep their existing memory behavior.
- **Problem:** A runaway service can use memory needed by agents and terminals. The later memory-limit proposal has no approved value or override rule.
- **Impact if no action:** Computer-wide memory pressure can end work or make the computer slow.
- **Root question:** Which memory policy should services use?
- **Options:**
  - **A.** Keep the current computer-wide behavior with no service cap. Effort: Small.
  - **B.** Set a fixed 512 MiB maximum for each service. A service that exceeds it can fail. This value is a proposal, not an approved limit. Effort: Medium.
  - **C.** Add an optional memory value with no default cap. The caller chooses the maximum for that service. Effort: Medium.
  - **D.** Set no cap and give service processes an out-of-memory score adjustment of +1000. Memory pressure then favors ending a service. An agent's build can cause a member's server to end. Effort: Small.
- **Left out:** Limit all agent processes. That changes unrelated work and does not change service awake time.
- **Assumptions:** Every option preserves the existing idle, activity, background-work, and turn-limit rules. Cal required those rules to stay unchanged on 20 November 2026.
- **Wider fix:** C can bound a complete service process tree through one systemd property.
- **Previous examples:** A systemd probe on 18 November 2026 used `MemoryMax=256M` for a separate unit. It proved the mechanism, not a product limit.
- **Recommendation:** C. A caller can bound a service without guessing one memory budget for every project.
- **Action:** ask the user, because a cap or a changed victim preference changes when a project process can fail.

Keep this choice separate from memory-failure handling.
The first release already stops the whole service unit after a memory kill.
It does not automatically retry the service.
An implementation needs its own approved contract, plan, tests, and pull request.
