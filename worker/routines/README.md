# Routine records

This area stores saved prompts and their triggers in D1.
The routes use the common app gate before they read or change an org's records.
They do not start runs or create workspaces.

Every org member can read routines.
The creator owns a new routine.
Only its owner can edit it or turn it on.
Its owner and the org admins can turn it off or delete it.
Each write also checks current access inside SQL.

`GET` and `POST` of `routinesPath` list and create routines.
`GET`, `PATCH`, and `DELETE` of `routinePath` read, update, and delete one routine.
An update can send only the fields that changed.
A disable-only update sends `{ "active": false }` and needs no GitHub read.
The list includes each routine's latest stored run, or null.
Run execution and workspace state projection are not wired here.

Schedules keep both their preset fields and a normalized cron expression.
The save computes the earliest next time of all schedules in the routine's time zone.
An inactive routine or one without schedules has no next time.
Author-filter requests hold logins.
Replies and stored triggers hold GitHub account IDs and canonical logins.
Each save resolves those logins again with the owner's GitHub user token.
An empty `is` list means every org member.
The `members` flag includes org members beside the named accounts of a nonempty `is` list.

## Development

Run `npm run test -- worker/routines` from the repository root with Node 24.
The route tests use the production Worker handler with local D1 and fake GitHub.
The schedule tests use fixed dates around changes of summer time.

### Key code

- [route.ts](route.ts) dispatches the record routes and enforces ownership.
- [prepare-routine.ts](prepare-routine.ts) validates a save and prepares its stored record.
- [routine-data.ts](routine-data.ts) reads routines and checks their repository and section.
- [routine-write-data.ts](routine-write-data.ts) guards mutations with current membership and ownership.
- [schedules.ts](schedules.ts) validates schedules and computes their next time through `croner`.
- [triggers.ts](triggers.ts) parses trigger inputs and expands presets to cron expressions.
- [author-filters.ts](author-filters.ts) resolves filter logins through GitHub.
- [stored-triggers.ts](stored-triggers.ts) reads stored account filters and prepares logins for a later save.
- [latest-run-data.ts](latest-run-data.ts) reads the newest stored run of each routine.

### Related docs

- [Routines protocol](../../docs/protocol/routines.md)
- [Shared contracts](../../src/shared/routines.ts)
- [App API](../app-api/README.md)
- [Migrations](../../migrations/README.md)
