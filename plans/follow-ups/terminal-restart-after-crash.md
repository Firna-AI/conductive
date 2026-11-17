# Check that the terminal restarts after a crash

- **Severity:** Medium. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-17, from `calummoore/delete-outstanding-plans-status-f01f`, an open check of the deleted Boat-native remote workspaces plan (deployment and live smoke test).
- **Location:** `image/release/conductive-terminal.service`, `worker/terminal/scripts.ts`, `worker/terminal/README.md`.
- **Reason:** The check kills a process of a real sandbox and needs the deployed terminal.

- **Terms:**
  - **ttyd:** the program that serves the shell of the Terminal tool on a private port. The systemd unit `conductive-terminal.service` runs it as `user` with `Restart=on-failure` and `RestartSec=1`. The launcher starts ttyd with `exec`, so ttyd is the main process of the unit.
- **Background:** The terminal launcher reads the terminal password from a file and starts ttyd with it. When ttyd stops, systemd must restart it with the same password. The Worker keeps that password, so the Terminal tool must open again with no new start of the workspace.
- **Task:**
  1. In a test workspace, open the Terminal tool once.
  2. In another shell of the sandbox, for example through a chat agent, run `pkill -KILL -x ttyd` once. Use SIGKILL, which acts like a crash. A plain `pkill` sends SIGTERM, and systemd counts a stop by SIGTERM as a clean exit, so `Restart=on-failure` correctly starts nothing.
  3. Check with `systemctl status conductive-terminal.service` that systemd started ttyd again.
  4. Reload the page and open the Terminal tool again. Check that it opens with no new start of the workspace and with no password error.
- **Impact if no action:** If ttyd stops in a long-running workspace, the Terminal tool can stay broken until the next start.
- **Needs:** A real workspace on the deployed release.
- **Done when:** After the kill, systemd restarts ttyd, and the Terminal tool opens again without a new start.
