# Check the idle in-place update on live sandboxes

- **Severity:** Medium. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-16, from branch `calummoore/workspaces-auto-update-issue-ha9k`.
- **Location:** `crates/cnd-runner/src/runtime.rs`, `crates/cnd-cli/src/runner_update/`, `image/conductive-update-check.timer`.
- **Reason:** The check needs the change deployed, and then one more deploy that publishes a newer release.

**Terms**

- **Release:** one version of the sandbox software, the program `conductive` and its parts, published by each deploy from `main`.
- **Swap in place:** the runner closes its connection, ends its work as at a shutdown, runs `sudo -n <its executable> update apply`, and execs `/opt/conductive/current/system/runner-start.sh` in the same process, so systemd stops no process of `conductive-runner.service`.

**Background**

On 2026-11-16 Cal chose that a running sandbox installs a complete newer
download in place as soon as its workspace has been idle for 2 minutes (no
turn in any session, no queued command, no report request, and the running
release confirmed). The check timer now runs every 10 minutes instead of
every hour. No guard checks a new release that never connects (Cal's
choice of the same day). `docs/protocol/sandbox-software.md`, section
"Installs at idle", holds the rules. Unit tests cover the decision logic
with fakes, and a local exec smoke test kept the process ID and a child
process. No test ran the whole path under systemd on a live sandbox.

**Task**

After the deploy of this change, and after one later deploy:

1. In a workspace that runs the first release, start a process outside a
   turn that an agent would start, such as `nohup python3 -m http.server
   8123 &` through an agent turn, and let the turn end.
2. Wait about 13 minutes with no turn: up to 10 minutes for the check, the
   download, 2 idle minutes, and the 60-second poll.
3. Check `readlink /opt/conductive/current`, `conductive --version`,
   `systemctl show conductive-runner.service -p MainPID` (it must not
   change), and that the `http.server` process still runs.
4. Send a message, and check that the turn runs on the new release.
5. Check `journalctl -u conductive-runner.service` for no restart of the
   service.

**Impact if no action**

A defect of the live path, such as a missing environment value after the
exec or a sudo refusal, would go unseen. Workspaces would then keep their
old release until their next start, as before this change.

**Needs**

The deployed change, one later deploy, and a running workspace.

**Done when**

An idle running workspace moves to the later release within about 13
minutes, its runner service keeps its main process ID, and the process
that the agent started keeps running.
