# Worker key code

This page is part of the [Worker README](README.md#key-code).
Its links are relative to the Worker folder.

- [app.ts](app.ts) exports the Worker HTTP handler.
- [application.ts](application.ts) selects each host surface and dispatches the app and machine routes with their own access gates.
- [application-scheduled.ts](application-scheduled.ts): `scheduledWorker` dispatches the minute routine scan and the 15-minute maintenance through the cron reporting boundary.
- [http.ts](http.ts): `privateResponse` adds private response headers. It preserves an explicit referrer policy and defaults to `no-referrer`.
  `previewResponse` adds the same security headers to each reply of the preview host. It keeps the cache rules that the preview code set. A reply without rules gets `no-store`, except a bare 304.
- [software-image/README.md](software-image/README.md) owns software image builds, the deploy token gate, and Cron cleanup.
- [lifecycle/repair.ts](lifecycle/repair.ts) repairs overdue disk, archive, and image alarms from the Cron Trigger.
- [marketing/site.ts](marketing/site.ts) serves the built root-domain site.
- [marketing/consent.ts](marketing/consent.ts) serves the built agreement page before GitHub.
- [routes.ts](routes.ts) dispatches protected app routes.
- [http.ts](http.ts) serializes `HttpError` as the shared API error body, with optional structured details.
- [waitlist/route.ts](waitlist/route.ts) reads the signed-in user's waitlist state and uses invite or referral codes.
- [waitlist/grant.ts](waitlist/grant.ts) supplies the shared app access grant statements for D1 batches.
- [app-api/README.md](app-api/README.md) names the entry points of the account, shell, and workspace routes.
- [configuration.ts](configuration.ts): `runnerSoftware` reads the runner archive variables for builds and refreshes.
- [chat/router.ts](chat/router.ts) forwards the browser chat routes and the runner socket to the Durable Object of their workspace.
- [workspace.ts](workspace.ts) composes each workspace Durable Object. [workspace-lifecycle.ts](workspace-lifecycle.ts) exposes its lifecycle RPC methods and owns its [input activity](lifecycle/README.md#input-activity). Its constructor restores the native sockets, and it receives their message, close, and error events.
- [native-sockets.ts](native-sockets.ts): `WorkspaceSockets`, the trusted socket roles, the attachment check, the restore, and the dispatch of native socket events.
- [model-gateway/README.md](model-gateway/README.md): the machine model routes, credential replacement, header rules, stream cancellation, and turn-token checks.
  The `turn` commands of a version 2 runner carry these tokens. The packaged runner uses version 2.
- [warnings.ts](warnings.ts): `warnWorker`, the one console warning of the Worker. It writes one structured object with fixed text and selected safe fields. It copies no extra caller field, token, error message, request body, command output, or response body. `WarningRecord` names the logged object type. `CommandFailed` carries a failed command's state, exit code, and time-out.
- [warning-types.ts](warning-types.ts): `WorkerWarning`, the fixed warning kinds and their typed fields. Warning callbacks use this type too.
- [warning-values.ts](warning-values.ts): `WarningId.checked` accepts the canonical 43-character base64url IDs from `randomToken`. Other values become `unknown` in the log only. `warningCode` and `errorSummary` keep allowlisted codes and command states. A generic error has the fixed kind `error`, with no class name.
- [error-reporting/entry.ts](error-reporting/entry.ts): `workerFetchEntry`, `runWorkspaceAlarm`, and `runWorkerCron`, the reporting boundaries of a request, an alarm, and a cron run.
- [error-reporting/runtime.ts](error-reporting/runtime.ts): `createWorkerErrorRuntime`, the private reporter on the real SDK.
- [error-reporting/policy.ts](error-reporting/policy.ts): `captureWorkerWarning` and `captureUnexpectedWorkerFailure` decide which warnings and caught failures report.
- [error-reporting/workspace.ts](error-reporting/workspace.ts): `workspaceErrorReporting`, the fresh reporting scope of each Durable Object callback.
- [error-reporting/response-diagnostics.ts](error-reporting/response-diagnostics.ts) owns the bounded private cause that a Durable Object hands to the Worker with a 5xx response.
- [workspace-alarms.ts](workspace-alarms.ts): `runWorkspaceAlarms`, the dispatch of the regular owners of each alarm run: a running Continue, the lifecycle run, the previews, and GitHub. It runs the owners whose due time has come, then sets the alarm to the earliest stored due time.
- [features/alarms.ts](features/alarms.ts): `WorkspaceAlarms`, the one alarm scheduler of each workspace object. It keeps a durable due time for each owner: each lifecycle task, the previews, GitHub, Continue, and the `browser`, `runner`, and `devices` security sources. `scheduleWorkspaceAlarm` sets the one platform alarm. `suspendWorkspaceAlarms` is the alarm step of each member suspension stage. [The object alarm scheduler](lifecycle/alarm-scheduler.md) gives its rules.
- [features/workspace-alarm.ts](features/workspace-alarm.ts): `WorkspaceAlarmRunner`, the short native alarm handler, the security work before the fences, and the fenced regular work.
- [features/alarm-tasks.ts](features/alarm-tasks.ts): `WorkspaceAlarmTasks`, the tracked background work of an alarm.
- [members/workspace-receiver.ts](members/workspace-receiver.ts) fences suspension, Restore, and payload deletion.
- [operator/route.ts](operator/route.ts) serves the operator routes after the request gate.
- [routines/route.ts](routines/route.ts) serves routine records after the request gate.
- [routines/run-route.ts](routines/run-route.ts) serves Run now and paginated run history.
- [routines/run-starter.ts](routines/run-starter.ts) starts queued runs with the owner's logins.
- [routines/pull-request-dispatch.ts](routines/pull-request-dispatch.ts) applies author filters, trust, and loop guards before it stores pull request runs.
- [routines/schedule-scan.ts](routines/schedule-scan.ts) claims up to 50 due routines and retries up to 50 old queued runs each minute.
- [operator/approval-email.ts](operator/approval-email.ts) sends approval messages and retries pending deliveries from the scheduled entry.
- [mail-sender.ts](mail-sender.ts) shares Resend transport and local logging between the approval, invitation, and feedback emails.
  It writes the sender address, and the name and the media type of each attachment from a `CheckedImage`.
- [app-api/feedback.ts](app-api/feedback.ts): `feedbackRoute`, the feedback routes. [Feedback routes](app-api/feedback.md) gives their checks and their email.
- [security/gate.ts](security/gate.ts) checks access before it reads JSON request bodies.
- [http/request-body.ts](http/request-body.ts) applies the default and declared request body limits.
- [http/json-body.ts](http/json-body.ts) owns the shared JSON object parsing policy.
- [http/bounded-body.ts](http/bounded-body.ts) collects bounded body bytes and decodes and parses complete JSON bodies.
- [sandbox/transport.ts](sandbox/transport.ts) calls the fixed provider routes.
