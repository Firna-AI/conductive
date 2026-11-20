# Deleted-org disk retention

This page belongs to the [Members backend](README.md).

The maintenance capability accepts only workspace IDs from its callback.
It checks the current lease before every operation.
The disk lists of maintenance, retention, and Restore leave out each workspace whose owner the [operator suspended](../operator/README.md).
The capability also refuses to restart such a workspace, so retention starts no cloud computer of a suspended user.
Deleted-org maintenance includes only accounts whose configured kind is `boat`.
It applies that filter to the initial disk list and the final deadline check.
Restore still installs every workspace receiver. Other provider kinds receive no retention alarm.
A restart must be due at its stored keepalive date.
Each stop, keepalive date, and restart write matches its sandbox by the sandbox ID and the provider account together.
It resumes with `noEnv` and empty env vars, then stops the sandbox.
It supplies no workspace token, agent login, or org secret.
Keep runner, preview, user startup, and agent access suspended in retention mode.
Before the resume, Members journals a pending stop for crash recovery.
Only an acknowledged resume followed by a stop creates a new real stop date.
A failed or uncertain resume keeps the older conservative date.
The capability expires when its callback ends or its lease expires.
