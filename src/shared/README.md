# Shared contracts

These modules define the browser API and the runner protocol.
They use JSON values and plain TypeScript types.
They import no Cloudflare types, provider SDKs, or test fixtures.
Dates use Unix milliseconds. IDs and model names are opaque strings.

Each area owns its paths and payloads. Import from that area directly.
`api.ts` keeps the existing sign-in and org paths and common records.
`EmptyRequest` means an empty JSON object, including DELETE requests.
`repositoryPath` names one repository of an org. PUT adds it and DELETE
removes it. Each request sends `EmptyRequest` and returns the current list.

`runner.ts` defines the versioned handshake, commands, numbered events,
confirmations, and resend rules. Its comments state the delivery contract.
`RUNNER_EVENT_MAX_BYTES` limits the complete serialized runner event envelope.
The 1 MiB limit leaves room for the workspace storage wrapper.
The workspace stores a refusal marker before it confirms a permanent refusal.
Storage and network failures remain unconfirmed.
After a refused file tree, changes list, start steps, or workspace name,
`RunnerReportRefresh` asks for one fresh full report of that `RunnerReportKind`.
It carries no login. A redelivery keeps its command ID.
`runner-transport.ts` defines the injectable socket boundary.
Runner commands carry the agent login of the session starter, whoever sent the message. Browser response types do not.
An uploaded attachment reaches the runner as a path, after the backend puts it there.

`files.ts` defines full trees, tree updates, and branch changes.
A full tree contains paths relative to the repository root.
A move names its old path and its new entry.
A directory move includes updates for its descendants.
`FileEvent` contains complete browser reports and unavailable-tree marks.
`RunnerFileEvent` sends full reports as numbered parts of one revision.
Each part has a 256 KiB event payload budget.
Tree deltas have the same byte budget and at most 512 changes.
Tree and changes revisions have independent sequences within each runner stream.
A new stream starts with full reports. A reconnect keeps its revisions and parts.
The workspace joins all parts before it publishes a full browser report.
Branch changes include committed, staged, unstaged, and untracked work.
`runner-files.ts` defines file read and diff commands and their matching results.
The backend sets the read limit. The sample limit in the fixtures is not product policy.
Read and diff results do not enter the stored chat event stream.

`chat-events.ts` caps serialized tool detail at 64 KiB.
Its omission count measures normalized source UTF-8 bytes before JSON escaping.
Turn summaries keep at most 200 files and 256 KiB of serialized file-list data.
They count omitted files. The complete Changes response has no summary cap.
`runner.event-refused` belongs only to workspace chat events.
It identifies the lost runner event without copying its data.
Its `repairFailed: true` flag marks a refused replacement of a lost workspace update.
Only the workspace sets that flag.
[Lost workspace updates](../../docs/protocol/chat-and-events.md#lost-workspace-updates)
states the rules of the request and of a failed repair.

`events.ts` defines the browser stream. Its event numbers span all sessions
and runner connections of one workspace. A reconnect uses the last stored number.
The history response gives the point after which live events continue.

`sessions.ts` defines the session paths, their requests and replies, and the `Session` record.
`Session.retryMessageId` names the one message that `retryMessagePath` accepts.
It is the retry message of the newest turn when that turn failed, and null otherwise.
A message or a retry that opens a linked session sets it to null on the source.
Each other message of the session gets HTTP 409 with the code `retry_not_available`.
[Messages](../../docs/protocol/chat-and-events.md#messages) states the rule.
`Session.startedBy` names the member who started the session.
It is null only for an older record whose starter is not known.
`Session.sourceSessionId` names the session where a message opened this linked session, and null otherwise.
`Session.loginAvailable` is the result of the last server check of the starter's login.
Each member reads the same value. None of these fields holds a login.
`SendMessageResponse.session` in `messages.ts` is the record of the session that took the message.
It can differ from the session of the request.
[Agents](../../docs/protocol/chat-and-events.md#agents) states the starter rule.

`device.ts` defines Mac command paths, socket messages, pairing, and local settings relays.
It has no imports and also serves the Mac app's NodeNext build.
`device-read.ts` validates its wire values and preserves command text, timeouts, and truncation.
Command records return `requestKey` for URLs and retain `requestId` for retries and device frames.
Settings results distinguish applied and saved changes, applied but unsaved changes, and failed changes.
The small settings failure frame identifies an oversized reply without closing the connection.
The combined Mac output cap is 65,536 UTF-8 bytes.

`MACHINE_PATHS` in `agent-tools.ts` and `DEVICE_COMMAND_PATH` in `device.ts` put their machine routes under `/v1/`.
The machine origin and the preview domain stay Worker settings.
`Preview.url` is the absolute launch address of a preview on the app origin.
It holds no secret. The browser loads it as it is, in the frame and in a new tab.
In the Mac app, a new tab opens in the default browser through `PreviewLaunchResponse` instead.
That JSON reply of `Preview.url` holds an authorizer `url` and the `expiresAt` of its grant.
The `url` carries the preview hostname and a 60-second grant only in its fragment.
[Port previews](../../docs/protocol/access-and-security.md#port-previews) states its access rules.
Each open of a port preview gets a new preview ID, and the API never gives out
a revoked ID again (decision 86). The Preview tool hides revoked previews by their ID.
The git credential payload is not defined yet.
[GitHub tokens](../../docs/protocol/access-and-security.md#github-tokens) states its rule.

## Key code

- [Org contracts](orgs.ts) carry custom initials and GitHub repository choices for org creation.
- [Member contracts](members.ts) name each invitation by its email. Each member keeps the `User` with their GitHub login. `PendingOrgInvite` adds the org ID and name, for the invitations that the signed-in user can accept.
- [Account contracts](account.ts) include the repository list available before an org exists.
- [Org settings](org-settings.ts) carry the base image software for the Cloud computer tab.
- [Base image](base-image.ts) records the software labels, their primary source, and the source check date.
- [Browser fakes](../test-support/README.md) use these response types.
- [Runner fakes](../../worker/test-support/README.md) use these message types.
- [Migrations](../../migrations/README.md) define the D1 tables and reserved ranges.
