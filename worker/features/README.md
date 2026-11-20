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

## Key code

- [paths.ts](paths.ts) matches each feature route and extracts its workspace.
- [router.ts](router.ts) forwards app requests and preview hostnames. Its hostname lookup includes files previews.
- [workspace.ts](workspace.ts) composes the tools and exposes the trusted agent preview operations.
- [preview-data.ts](preview-data.ts) reads revoked preview IDs for publication, with no port filter.
- [workspace-alarm.ts](workspace-alarm.ts) dispatches due workspace and security work.
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
