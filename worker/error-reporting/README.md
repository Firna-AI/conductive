# Worker error reporting

This page is part of the [Worker README](../README.md#error-reporting).

The Worker and its Durable Objects send each unexpected failure to Better
Stack Errors. [Error reporting](../../docs/protocol/error-reporting.md) states
what a report holds, and
[Error reporting setup](../../docs/deployment/error-reporting.md) gives the
steps of the operator.

- The Worker secret `CONDUCTIVE_ERROR_TRACKING_DSN` turns reporting on. A
  missing DSN turns it off. An invalid DSN also turns it off, and the Worker
  writes one fixed warning, which never holds the DSN.
- `workerFetchEntry` is the HTTP entry with reporting. Its final capture
  runs after `requestBodyEntry`, so each final response with a status from
  500 to 599 reports once.
- `runWorkspaceAlarm` of `error-reporting/entry.ts` reports a failed alarm
  of a workspace Durable Object. It is not the lifecycle function of the
  same name in `lifecycle/workspace-alarm.ts`. `runWorkerCron` reports a
  failed cron run. Both then throw the original error again, so the alarm
  and the cron run still fail.
- `captureUnexpectedWorkerFailure` reports a failure that a catch would
  hide. `captureWorkerWarning` reports a warning of an unexpected failure,
  by the rule of
  [What the Worker reports](../../docs/protocol/error-reporting.md#what-the-worker-reports).
- A reported warning carries only an explicit reporting projection of its
  typed fields. Its IDs stay in Workers Logs.
- These capture points stay silent for a normal refusal, a busy cleanup
  lease, a failure of the user's own script, a repair budget, and a warning
  whose error the code throws again. Each final 5xx response still reports
  once.
- `workspaceErrorReporting` gives each callback of a Durable Object a fresh
  reporting scope. Its reports leave through `waitUntil`, so a report can
  still go out after a socket upgrade answers 101.
- A Durable Object can hand the cause of a 5xx response to the Worker in a
  bounded private response header. The header holds only the sanitized
  class, frames, and code, and the sender strips each untrusted hint.
- Each trusted receiver consumes that cause and removes the header. The
  final public entry removes it too. No raw error is serialized.
- The `beforeSend` filter rebuilds each event from the fields of the
  protocol, and the final transport rebuilds it again. The transport sends
  only the exact event object and ID that the filter approved. It drops
  attachments, fallback events, and every other kind of telemetry.
- The Worker uses `verifiedErrorStack` from `src/shared/error-stack.ts` in
  its strict V8 form. So a message with several lines never becomes a
  frame.
- A failure to report never changes a response, an alarm result, or a cron
  result.

The other modules of `error-reporting/` support these entry points.
