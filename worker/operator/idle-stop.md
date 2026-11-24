# Operator stop time

This page belongs to the [operator backend](README.md). The
[Settings tab](../../docs/protocol/operator-section.md#the-settings-tab)
holds the requirements.

`operatorIdleStopPath()` in
[`src/shared/operator-idle-stop.ts`](../../src/shared/operator-idle-stop.ts)
returns `/api/operator/idle-stop`.
GET and PUT use the normal app gate, then the shared operator identity check.
Another signed-in user gets 403 `operator_required`.

GET returns `OperatorIdleStopResponse`:

- `minutes` is the saved stop time, one of `IDLE_STOP_CHOICES`.
- `updatedAt` is the last actual change time in Unix milliseconds, or null.
- `operator` gives that operator's GitHub ID and login, or null.

A missing row, or a stored value that is not a choice, reads as 30 minutes
with a warning.

PUT takes `UpdateOperatorIdleStopRequest`, with `minutes`. A value that is
not 15, 30, 60, 90, or 120 gets 400 `invalid_input`. The reply has the
same shape as GET.

`idle_stop_settings` keeps the time and the current actor and time.
`idle_stop_events` keeps each actual change with its actor and time.
An equal time changes nothing, including the actor and time.
A change writes the event and the setting in one conditional D1 batch.
After a concurrent write, it reads again and applies the requested time
unless that time is already current.

The workspace objects read the saved time, as
[The stop time](../lifecycle/stop-time.md) says.

## Key code

- [idle-stop.ts](idle-stop.ts): the route, input parsing, and update retries.
- [idle-stop-data.ts](idle-stop-data.ts): the read and the conditional write.
- [Browser reader](../../src/app/api/read-operator-idle-stop.ts): response decoding.

## Development

Run `npm run test -- worker/operator/idle-stop.test.ts src/app/api/read-operator-idle-stop.test.ts src/shell/operator/SettingsTab.test.tsx`.
