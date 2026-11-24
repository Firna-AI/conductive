# The stop time

This page belongs to the [workspace lifecycle README](README.md). It gives
the machine token of each workspace create and resume, its revocation at
each stop, and the stop time of idle sandboxes.

Each workspace create and resume delivers a new machine token through the
[machine client](../machines/README.md). A create pins it inside the existing
encrypted allocation payload. Replays keep that payload and digest.
Resume issues it immediately before the provider call. Org env values
cannot override the machine token or origin. Each stop request attempts
token revocation before it calls the provider. A failed revoke writes a
fixed warning and lets the stop continue. Confirmed physical stops attempt
revocation again, also after disk retention ends or the computer stops itself.
The lifecycle settlement uses the confirmed-stop and active-retention checks.
State publication alone never revokes. Tokens remain valid during retention
and after a failed software restart leaves the computer running for Try again.
Archive maintenance retains its retry state until observed-stop revocation succeeds.
Failed creates revoke before they retire their computer for cleanup.
Each build and refresh has a machine token of its own, as
[The build machine](build-machine.md) says.

The operator saves the stop time of idle sandboxes on the Settings tab, as
[Stop and resume](../../docs/protocol/stop-and-resume.md#the-stop) says.
[`idle-stop.ts`](idle-stop.ts) reads it from the `idle_stop_settings` row.

- Each workspace object reads it through the `idleMs` hook and keeps it for
  60 seconds. A failed read keeps the last value, or 30 minutes before the
  first read.
- The alarm and its schedule use it for the idle stop. `idleMs` is a
  required hook, so no lifecycle can drop the setting.
- When the alarm fires before the stop time ends, at least 15 minutes after
  the last activity, with the runner connected and no restore watch due, it
  extends the provider auto-stop. So a longer stop time reaches a running
  sandbox before its old provider auto-stop ends.
- Each workspace create, resume, and auto-stop call sets the provider
  auto-stop to the stop time plus 60 seconds, from
  `workspaceAutoStopSeconds`. When the read fails, it uses the longest
  choice, so that the provider never stops a sandbox early.
- Image builds and the disk retention restarts keep 1,800 seconds.
