# The object alarm scheduler

This page belongs to the [workspace lifecycle README](README.md), beside
[Workspace Durable Object](workspace-object.md). It gives the shared rules
of the one alarm of each workspace object and each image coordinator: the
owners and their due times, the security sources, the run lease, and the
steps at the end of each run.

`WorkspaceAlarms` in [`alarms.ts`](../features/alarms.ts) is the one
scheduler of the object alarm. Each owner of a timed task stores its own
due time there. The lifecycle owners are the lifecycle state, the start,
and the publication of a create result. The `changed` retry, the delete of
a failed create, the access stop, and the image coordinator are lifecycle
owners too. Archive owns `lifecycle:archive` separately. Its saved phases keep
allocation recovery, stop confirmation, retention, and deletion across reconstruction.
Its publication retries include confirmed deletion, even while the state stays archived.
The previews and GitHub store their due times there too. So do the
`browser`, `runner`, and `devices` security sources, on raw storage, as
[Alarms](../README.md#alarms) says.

- Each write that changes a due time sets the object alarm to the earliest
  stored due time. While a member fence pauses the regular work, a
  deferral can delay the alarm of the regular due times, as
  [Alarms](../README.md#alarms) says.
- A due time stays stored until its owner clears it. So a run that fails
  or ends early still leaves the next alarm, also after a restart of the
  object.
- The scheduler clears the due time of a security source after its run
  succeeds, unless that run stored a new one.
- `WorkspaceAlarmRunner` in [`workspace-alarm.ts`](../features/workspace-alarm.ts)
  runs the due security sources first. After the member fence checks, its
  regular task calls `runWorkspaceAlarms` in
  [`workspace-alarms.ts`](../workspace-alarms.ts), the outer run. The outer
  run runs the previews and GitHub. It also starts the lifecycle run,
  `runWorkspaceAlarm` in [`workspace-alarm.ts`](workspace-alarm.ts). The
  lifecycle run runs the lifecycle owners.
- Each run reads the due times that have come, and it runs their owners.
- The lifecycle run also has a run lease, the due time `lifecycle:run`.
  At its start, before it runs any owner, the run reads all stored due
  times. Then it stores its own lease 30 seconds after its start. So that
  read still shows the lease of an earlier run. The outer run and `take`,
  the read-only query of the due times, store no lease.
- Each lifecycle run deletes its lease at its end, as the steps below say.
  Lifecycle runs go through the chat queue one at a time. So a lease that
  the read finds comes from an earlier run that did not reach its end. A
  reset of the object or a lost process can cause this. The new run then
  treats every lifecycle owner as due, also before the time of the old
  lease.
- The recovery comes with the next lifecycle run. Another lifecycle due
  time can start that run before the lease time. Otherwise the old lease
  wakes the object at its time, because it counts as a due time from
  then. The outer run then starts the lifecycle run. So the recovery can
  come up to 30 seconds late.
- For example, the end of a start clears the due time of the start before
  the run sets the lifecycle due time. A reset between these two writes
  can leave no other lifecycle due time.
- At the end of each run, also when the run fails or ends early, the run
  does these steps in one storage transaction:
  1. The lifecycle run deletes its lease. So no due time moves to the time
     of the lease.
  2. The run finds each of its due times that had come when the run
     started and that did not change during the run. The lifecycle run
     looks only at due times of the lifecycle owners. The outer run looks
     only at due times of the previews and GitHub.
  3. It moves each due time that it found to the earliest stored due time
     in the future. When no stored due time is in the future, it moves the
     due time 30 seconds into the future.
  4. It sets the object alarm to the earliest stored due time again.
- A due time that a run cleared, replaced, or added stays as that run
  left it.
- The steps prevent an immediate new alarm for a task that a run skipped.
  For example, the lifecycle run skips some tasks while the access stop or
  a start is pending.
- The run lease helps only when a run does not reach the steps at its
  end. A run that fails with an error still does the steps and deletes
  its lease. So the lease gives no recovery after that error.
