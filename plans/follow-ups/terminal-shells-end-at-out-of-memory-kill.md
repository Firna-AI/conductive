# One out-of-memory kill ends every terminal shell

- **Severity:** Medium. **Likelihood:** Common. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-18, from branch `calummoore/lima-djh5`, item 3.
- **Location:** `image/release/conductive-terminal-sessions.service`, `docs/protocol/terminal.md`, `worker/terminal/README.md:80`.
- **Reason:** The decision for the runner covered only the runner's unit, so the same change for the terminals waits for a decision of its own.

**Terms:**
- **Out-of-memory kill:** the end of one process by the Linux kernel when the cloud computer has no free memory. The kernel picks the process that uses the most memory.
- **`OOMPolicy`:** the systemd setting that says what happens to a service when the kernel kills one of its processes for lack of memory. The default, `stop`, stops the whole service.

**Background:** The unit `conductive-terminal-sessions.service` runs the tmux server that holds the shells of the Terminal tool. Each command that a member runs in a terminal runs in this unit. The unit sets `KillMode=control-group` and `Restart=on-failure`, and no `OOMPolicy`, so the systemd default `stop` applies. A live cloud computer gives `OOMPolicy=stop` for this unit. On 18 November 2026, out-of-memory decision 1 set `OOMPolicy=continue` for the runner's unit, `conductive-runner.service`. Cal chose it after an out-of-memory kill of a mockup build stopped the whole runner of a workspace and ended its agent's turn.

**Problem:** When the kernel kills one command in a terminal for lack of memory, systemd stops the whole terminal service. That ends every terminal shell of the workspace and each command in it, such as a dev server, for every member. systemd then starts the service again, with new empty shells.

**Impact if no action:** A large build in one terminal can end all terminals of the workspace. `docs/protocol/terminal.md` says that a shell keeps running across a dropped connection and across a Restart, so members expect their shells to stay.

**Root question:** How can an out-of-memory kill in one terminal end only that command?

**Options:**
- **A.** Add `OOMPolicy=continue` to `conductive-terminal-sessions.service`, as out-of-memory decision 1 did for the runner. Only the large command then ends, and the other shells keep running. Add the requirement to `docs/protocol/terminal.md`. Also correct `worker/terminal/README.md:80`, which says that the running terminal services keep their old units until their next start. A changed `OOMPolicy` applies at the `systemctl daemon-reload` of the installer, as `runner/service/README.md` says for the runner. Effort: Small.
- **B.** Keep the default `stop` for the terminal service. Each out-of-memory kill in a terminal then ends every shell. Effort: Small.

**Left out:**
- A memory limit for the commands of the terminals, below the size of the cloud computer: the kernel already ends the process that uses the most memory, which is almost always the large command. Out-of-memory decision 1 did not choose this for the runner either.
- The shells in the runner's unit: a restart of the runner would then also end every shell.

**Wider fix:** A. It sets the right default for each unit that runs the commands of people or agents.

**Previous examples:** Out-of-memory decision 1, which set `OOMPolicy=continue` for `conductive-runner.service` on 18 November 2026.

**Recommendation:** A. It gives the terminals the same protection as the agents, with a one-line change. systemd 255 applies a changed `OOMPolicy` at the next `systemctl daemon-reload`, which the system installer runs at each update, so it needs no restart of the shells.

**Action:** ask the user, because out-of-memory decision 1 covers only the runner's unit, and no requirement says what an out-of-memory kill in a terminal ends.
