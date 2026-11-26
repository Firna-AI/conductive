# Check the automatic restart on a live workspace

- **Severity:** Medium. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-21, from branch `calummoore/no-response-issue-l1pn`.
- **Location:** `worker/lifecycle/automatic-restart.ts`, `worker/lifecycle/workspace-alarm.ts`, `docs/protocol/restart-the-software.md` (section "Automatic restart").
- **Reason:** The check needs the deployed Worker and a running cloud computer.

**Terms**

- **Automatic restart:** the Worker restarts the runner, the preview relay, and the terminal service of a running sandbox by itself when a message waits for the runner, the runner has been away for at least 3 minutes, and the oldest waiting message has waited for at least 1 minute. `docs/protocol/restart-the-software.md`, section "Automatic restart", holds the rules (Cal's decision of 20 November 2026).

**Background**

Before this change, a runner that stayed away from a running sandbox left each new message waiting with no end. The Workspace object only read the provider state every 5 seconds. The change records the disconnect time and adds the automatic restart to the object alarm. Worker tests cover the conditions, the submission record, the fresh `runner.ready` rule, recovery during the access checks, and the 3-minute limit, with fake providers. No test ran the path on a live cloud computer.

**Task**

After the deploy of this change:

1. In a test workspace, stop the runner on purpose with `sudo systemctl stop conductive-runner.service` from a terminal tab, or with a Boat command.
2. Send a message in a session.
3. Check that the header shows Starting about 3 minutes after the stop, and that the message gets a reply soon after.
4. Check the Worker logs for one `runner_connected` warning after the restart, and that no second automatic restart starts.
5. Repeat with a runner that cannot connect, for example a broken `CONDUCTIVE_RUNNER_URL` for the service. Check that the workspace shows "The software didn't restart. Try again." 3 minutes after the restart began, and that Try again resumes it.

**Impact if no action**

A defect of the live path, such as a provider command that the alarm cannot send, would go unseen until a member message gets no reply again.

**Needs**

The deployed change, a test workspace, and a sandbox command route, such as a terminal tab or the read-write Boat key.

**Done when**

A stopped runner gets one automatic restart, the waiting message gets its reply, and a runner that cannot connect ends in the restart error state.
