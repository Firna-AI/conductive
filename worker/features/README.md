# Workspace features

This area composes the tools of each workspace object. The outer Worker
forwards the app routes and preview hostname requests to that object.
The [Worker README](../README.md) gives the object and alarm boundaries.

`WorkspaceFeatures` creates one preview handler for the app and the trusted
agent preview calls. Its `fileServerAvailable` callback reads the current
runner connection of `WorkspaceChat`. A matching connection must hold
`fileServer: true` before the files preview can open. Saved runner
connections keep that field across a wake, as the
[chat README](../chat/README.md) says.

Preview opens schedule the next expiry. Revocation publication reads every
revoked row, including a files preview with port 0. The common chat stream
stores each `preview.revoked` publication once. Stop and archive revoke
files previews together with port previews. The
[preview backend](../previews/README.md) owns the routes, store, and proxy.

## Services

`WorkspaceFeatures` dispatches these fixed workspace paths to the
[services handler](../services/handler.ts). The shared
[path helpers](../../src/shared/services.ts) build them.

| Method and workspace suffix | Body | Reply | Access |
| --- | --- | --- | --- |
| `GET /services` | None | `ServiceCatalogue` | Workspace read |
| `POST /services/control` | `ServiceControlRequest` | `ServiceControlResult` | Header Restart access and a running computer |
| `POST /services/logs` | `ServiceLogRequest` | `ServiceLogResponse` | Workspace read |

The bodies and replies use the generated service types directly. Successful
requests return 200. Reads also work for a member who cannot control the
computer. The handler checks membership again after a waiting result.
The [services README](../services/README.md) names the storage, runner, and
filter entry points. These routes record no activity.

## Key code

- [paths.ts](paths.ts) matches each feature route and extracts its workspace.
- [router.ts](router.ts) forwards app requests and preview hostnames. Its hostname lookup includes files previews.
- [workspace.ts](workspace.ts) composes the tools and exposes the trusted agent preview operations.
- [../services/handler.ts](../services/handler.ts) serves the service routes with workspace read and software-control access checks.
- [preview-data.ts](preview-data.ts) reads revoked preview IDs for publication, with no port filter.
- [workspace-alarm.ts](workspace-alarm.ts) dispatches due workspace and security work.
- [Merge queue turn reports](../merge-queue/fix-report.ts) deliver saved
  chat results from the regular alarm and keep failed deliveries for retry.
- [alarms.ts](alarms.ts) saves each alarm owner's deadline.

## Checks

Run `npm run test -- worker/features` from the repository root.
`files-preview.test.ts` checks the connected runner capability and its
native wake. `preview-revocation.test.ts` checks expiry and archive
publication for port previews and files previews.

## Related docs

- [HTML file preview](../../docs/protocol/html-file-preview.md#the-files-preview)
- [Port previews](../../docs/protocol/terminal-previews-and-desktop.md#port-previews)
- [Agent preview calls](../tools/sections-and-previews.md#previews)
