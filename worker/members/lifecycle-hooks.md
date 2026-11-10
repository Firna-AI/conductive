# Lifecycle hooks

This guide belongs to the [members area](README.md). It gives the
`MembersHooks` callbacks that the lifecycle owner must supply, as
[Lifecycle ownership](README.md#lifecycle-ownership) says.

Supply the required `MembersHooks` callbacks.
Production also supplies `deleteOrgState` to remove the image coordinator payload, including an org with no workspaces:

- `readWorkspace` returns the lifecycle backend's current `Workspace` record.
  It must authorize the viewer. All current org members can read all workspaces.
- `workspaceOwnerChanged` runs after each workspace that gets a new owner, by a reassignment or by a member who leaves or is removed.
  `workspaceOwnerChangedHook` in [`ownership-maintenance.ts`](../lifecycle/ownership-maintenance.ts) supplies it.
  It calls `reconcileLifecycleAccess` of the workspace object, which checks the workspace at once, in every state.
  The check stops a workspace that must still stop, such as a running workspace with a revoked token, and rearms the lifecycle alarm of a stopped workspace whose new owner is not suspended.
  [The stop of one workspace](../operator/README.md#the-stop-of-one-workspace) says how.
- `suspendOrg` stops org access before resource enumeration.
  It must reject new starts and writes for the deleted org.
  It must drain pending workspace starts and image builds.
  It must retain their sandbox IDs and snapshot names in D1, each with its provider account.
  It must close existing browser and runner access.
  It must disable normal idle, refresh, and disk keepalive timers.
  It must handle builds even when the workspace list is empty.
  It must finish before it returns. Concurrent and repeated writes must honor their generation.
  Members then owns the deleted-org maintenance schedule through the next hook.
- `maintainDeletedOrg` gets the real deletion dates and each retained workspace
  disk's real stop date and next keepalive date.
  Its input carries the call ownership and renewal capability.
  It plans the normal decision-43 deadline through `retention.schedule`.
  It keeps an existing deadline unchanged.
  A newly stopped disk must receive a deadline.
  In `retention` mode, it performs only due restarts through `retention.restart`.
  It then schedules the new stop's next keepalive.
  In `restore` mode, it only plans dates. It must start no sandbox.
  Build sandboxes stay outside this hook. Retained archived disks enter until their window ends.
  The lifecycle keeps its restart policy here, including its margin before day 14.
  It must await every capability call before it returns.
  A hook failure keeps the org pending for retry.
- `restoreOrgMaintenance` receives the Restore request ID, requesting admin,
  original deletion deadline, and current disk schedules.
  It also receives the call ownership and the complete workspace ID list.
  It returns disk and org-refresh timers to the active lifecycle.
  It must arm these timers before it returns.
  The timers must check active org state and current disk, settings, and org image records before running.
  It must keep normal access closed and start no sandbox during the handoff.
  Replace older timer plans for the same org.
  Concurrent calls must reject older generations, even when request IDs match.
  An unopened workspace must get maintenance after activation.
- `deleteWorkspaceState` removes all workspace Durable Object state and any
  other external workspace data under its call generation.
  Its receiver must reject stale concurrent removals and writes.
