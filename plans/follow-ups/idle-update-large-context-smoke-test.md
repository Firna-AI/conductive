# Check the idle update with a large context folder

- **Severity:** Medium. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-21, from branch `calummoore/no-response-issue-l1pn`.
- **Location:** `crates/cnd-runner/src/reports/files.rs`, `crates/cnd-runner/src/watcher/service.rs`, `crates/cnd-runner/src/repository/snapshot.rs`, `crates/cnd-runner/src/repository/identity_cache.rs`.
- **Reason:** The check needs the deployed runner release, and then one later deploy that publishes a newer release for the idle update.

**Terms**

- **Idle update:** the runner closes its connection, ends its work as at a shutdown, installs a newer downloaded release, and runs it in the same process, after its workspace was idle for 2 minutes. `docs/protocol/sandbox-software.md`, section "Installs at idle", holds the rules.
- **File scan:** the runner's capture of the file tree and the changes list. It hashes each file of the repository folder, also the ignored files under `.context/`.

**Background**

On 20 November 2026 the runner of a workspace closed its connection for an idle update and never connected again. Its `.context/` folder held 6.3 GB in 87,856 files, so one file scan took 25 to 30 seconds at about 2.4 cores. The repository watcher queued one full scan after each burst of file changes, with no limit, and the shutdown waited for every queued scan. A member message then waited with no reply.

The fix merges watcher refreshes into one waiting scan, cancels the running scan and the waiting scan at a shutdown, and reuses the hash of a file whose device, inode, size, and times did not change, outside a 2-second window. Unit and integration tests cover each part with fakes. No test ran the whole path on a live cloud computer.

**Task**

After the deploy of this change, and after one later deploy:

1. In a test workspace, fill `.context/` with many files, for example 50,000 small files and a few files of several hundred MB.
2. Run a turn that writes files steadily for a minute, then let the turn end.
3. Wait up to 13 minutes with no turn: up to 10 minutes for the download, 2 idle minutes, and the poll.
4. Check `readlink /opt/conductive/current` and that the runner service keeps its main process ID (`systemctl show conductive-runner.service -p MainPID`).
5. Send a message, and check that it gets a reply within a few seconds.
6. Run a second scan by changing one file, and check in `top` that the runner does not hash the whole folder again.

**Impact if no action**

A defect of the live path, such as a scan that still holds the shutdown, would go unseen until a member message gets no reply again.

**Needs**

The deployed change, one later deploy, and a test workspace.

**Done when**

The idle runner moves to the later release and connects again within a few minutes, with the large `.context/` folder in place, and a message after it gets a reply.
