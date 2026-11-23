# Lifecycle settings

This guide belongs to the [workspace lifecycle](README.md).

## Settings

The lifecycle code reads `LifecycleEnvironment` from
[`runtime.ts`](runtime.ts). [Deployment inputs](../../docs/deployment.md)
gives each binding, variable, and secret that it reads, such as
`WORKSPACES`, `MACHINES`, `MACHINE_ORIGIN`, `BOAT_API_KEY`, `BOAT_ORG_ID`,
`GITHUB_APP_PRIVATE_KEY`, and optional `CONDUCTIVE_RELEASE_SERVER`.

Each provider start captures the encrypted org env values and their secret
marks. The start-log masker and the workspace object output filter use
that capture. No private org-value list goes into the runner environment.
A running sandbox keeps its capture after later org setting changes.
The ordinary disk retention resume of a workspace that is not archived
also replaces the saved capture.
The maintenance resume of a retained archived disk gets only the machine
origin and a new machine token. It gets no org env value or workspace
token, so it keeps the saved capture. Deleted-org disk retention uses the
same machine-only env. Each stop attempts to revoke that token. A failed
revoke warns and lets the stop continue.
