# Check services after the production deploy

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-21, from the services change on `calummoore/run-dev-servers-as-services-55oo`.
- **Location:** `crates/cnd-services/`, `crates/cnd-tools/`, `crates/cnd-runner/`, `worker/services/`, and `src/previews/`.
- **Reason:** This check needs the merged services release in production.

- **Terms:**
  - **Service:** A named process in its own systemd unit, outside agent turns and the runner unit.
  - **Generation:** The identity of one run of a service.
- **Background:** Cal approved services outside turns on 20 November 2026. He approved the first-release profile on the same date. Services never count as activity. Computer Stop ends them and discards their runtime definitions and logs. Resume starts none.
- **Task:** In an isolated production test workspace, check the deployed CLI, MCP calls, Worker routes, and Preview controls together.
  - Record the app, Worker, and sandbox software versions.
  - Start a small HTTP marker through `conductive services start`. Start a no-port marker through MCP.
  - Check names, program and folder labels, state, time, ports, and originating session or Local command in Preview.
  - Open the HTTP preview. Keep both services reachable on desktop and after the phone's "+" action.
  - Read and reload each log. Check plain text, empty output, and omission when applicable.
  - Confirm Stop and direct Restart. Check an ended service too. Closing a preview must stop no process.
  - End every agent turn. Confirm that both services remain usable without a held turn.
  - In this isolated workspace only, check service survival through a guarded runner restart or a normal software update. Record unchanged service identities and continuous output. Never cut an active turn.
  - Observe the real idle stop without new input. Resume and check that no service, definition, runtime log, or listening port returns.
  - Check an older runner's ordinary Preview through the supported compatibility path. Do not roll back the production Worker for this check.
  - Stop or discard every probe. Restore any local test configuration and archive the test workspace.
- **Impact if no action:** Local and CI checks do not prove that the deployed app, Worker, and sandbox release work together.
- **Needs:** The services pull request merged and deployed, a sandbox software release that includes services, and a production test workspace. The tester needs workspace read and control access.
- **Done when:** The check records the versions, observations, failures, and cleanup. Each defect has its own follow-up or fix branch. No probe remains running.

[Services](../../docs/protocol/services.md),
[service calls](../../docs/protocol/service-calls.md),
[services in the app](../../docs/protocol/services-in-the-app.md), and
[service reports](../../docs/protocol/service-reports.md) own the contract.
The check changes no idle rule, turn limit, restoration policy, memory
policy, or production rollout setting.
