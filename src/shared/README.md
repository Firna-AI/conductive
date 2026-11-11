# Shared contracts

These modules define the browser API, the runner protocol, and the pure
transcript fold that the browser and the Worker share.
They use JSON values and plain TypeScript types.
They import no Cloudflare types, provider SDKs, or test fixtures.
Dates use Unix milliseconds. IDs and model names are opaque strings.
`Workspace.name` and `Session.title` are null until a name is set.
`Workspace.number` is the immutable number in its org.
`Workspace.link` is its absolute web link, with org and workspace IDs.
`AgentWorkspaceSummary` gives the same number and link.
`nameLabel` in `name-label.ts` gives the display label "Untitled" for null.

Each area owns its paths and payloads. Import from that area directly.
`OrgSettings.envVars` in `org-settings.ts` returns only names and secret marks.
Its `set` change carries a value and an optional mark. An omitted mark
keeps the stored mark inside each compare-and-swap attempt. A missing or
deleted name starts secret. An explicit mark changes it with the value.
Its `classify` change carries only a name and a mark, so it keeps the value.
`api.ts` keeps the existing sign-in and org paths and common records.
Its `ApiErrorBody` carries the error code and message.
The optional `error.details` identifies an unknown routine author login.
It carries `login`, `triggerIndex`, and `list`.
`triggerIndex` is zero-based in the routine's complete trigger list.
`list` uses the author-filter request key, `is` or `isNot`.
Errors without details keep the code and message only.
`EmptyRequest` means an empty JSON object, including DELETE requests.
`repositoryPath` names one repository of an org. PUT adds it and DELETE
removes it. Each request sends `EmptyRequest` and returns the current list.

`runner.ts` defines the versioned handshake, commands, numbered events,
confirmations, and resend rules. Its comments state the delivery contract.
`RunnerProtocolVersion` is 1 or 2. The Worker accepts both versions.
The `welcome` repeats the version of the runner's `hello`.
`RUNNER_PROTOCOL_VERSION` is 2. The packaged runner sends it, and
each full image build records it.
The credential of a turn belongs to the session starter, whoever sent the
message:

- `RunnerTurnV1` and `RunnerMessageDuringTurnV1` carry the real agent
  login in `login`, with its agent, kind, and secret.
- `RunnerTurnV2` carries a turn token in `credential`, with the agent and
  the login kind. It has no `login`.
- `RunnerMessageDuringTurnV2` carries no credential and no login.

`RunnerTurn`, `RunnerMessageDuringTurn`, `RunnerCommand`, and
`WorkspaceToRunner` cover both versions. Their `V1` and `V2` forms give the
shapes of one version. The runner imports the `V2` forms and uses
a turn token.
The [model gateway](../../worker/model-gateway/README.md#model-requests)
gives the form of a turn token.
`RUNNER_EVENT_MAX_BYTES` limits the complete serialized runner event envelope.
The 1 MiB limit leaves room for the workspace storage wrapper.
The workspace stores a refusal marker before it confirms a permanent refusal.
Storage and network failures remain unconfirmed.
After a refused file tree, changes list, start steps, workspace name, or port list,
`RunnerReportRefresh` asks for one fresh full report of that `RunnerReportKind`.
It carries no login and no turn token. A redelivery keeps its command ID.
`ports.ts` defines the common listening-port fields and both report phases.
`RunnerPortsUpdated` carries complete selected private labels.
`PortsUpdated` carries final filtered display labels, with a null list when
there is no current report. The display limits apply only after the workspace
filter. The module owns those limits and the shared count limit.
`terminal.ts` owns `TERMINAL_PORT`, shared by the runner exclusion
and the terminal backend.
[Listening ports](../../docs/protocol/agent-runner.md#listening-ports) states
that report, its limits, and its refresh kind.
`runner-transport.ts` defines the injectable socket boundary.
`RunnerConnection` and `RunnerConnector` take the type of the Worker's
messages.
Browser response types carry no login and no turn token.
Turn commands also carry the commit author of the member whose message started the turn.
Message commands carry no commit author.
An uploaded attachment reaches the runner as a path, after the backend puts it there.

`messages.ts` owns the attachment metadata and target identity.
`AttachmentUploadTarget` names a workspace or stable first-message ID.
`attachmentUploadPath` selects the workspace or org-scoped draft base path.
`ATTACHMENT_MAX_BYTES` is the decoded file limit.
`attachmentUploadUrl` appends the filename, media type, and first-message target as URL data.
The browser posts one raw file as `application/octet-stream` with its known byte length.

`feedback.ts` owns `FEEDBACK_PATH`, the request and reply types of the
feedback routes, and their byte limits. `FEEDBACK_BODY_MAX_BYTES` is the
JSON body limit of a send. `FEEDBACK_SCREENSHOTS_MAX_BYTES` is the limit of
the decoded screenshots of one message. `SendFeedbackRequest` carries each
screenshot as base64 `content` only, with no name and no media type.
`FeedbackResponse.replyEmail` is the reply address, or null.
`images.ts` holds the one image signature reader of the browser and the
Worker. `readImage(bytes)` returns a `CheckedImage` of one `ImageKind`:
PNG, JPEG, GIF, or WebP. It returns null for other bytes. A symbol that the
module does not export brands `CheckedImage`, so other code gets one only
from `readImage`. The [mail sender](../../worker/mail-sender.ts) takes
attachments only as checked images. It writes each file name and media
type from the kind. [Feedback](../../docs/protocol/feedback.md) states the
rules.

`files.ts` defines full trees, tree updates, and branch changes.
A full tree contains real paths relative to the repository root.
Real `path`, `previousPath`, and `baseBranch` fields stay unchanged for
keys, joins, reads, and diffs. Their optional `displayPath`,
`previousDisplayPath`, and `displayBaseBranch` fields carry masked labels
when those labels differ. `FileEntry.name` stays the basename label.
Content and diff replies carry the same optional labels for direct opens.
The field policy in `output-fields.ts` fills these labels on both runtimes.
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

`output-sanitizer.ts` holds possible secret suffixes across answer events.
A completion or a turn end releases the held text of its answer.
The filter then keeps an answer context: the shown answer end that can still start a secret.
After a completion, it keeps the context of the earlier text and of the completion text.
A refused completion leaves the earlier text on the screen.
Later text of the same answer masks the part that completes a secret from a context.

The filter does not cap the number of answer contexts.
Its snapshot holds the held text, the answer contexts, and the secret values that still apply to them.
A snapshot without answer contexts also stays valid.
The Worker keeps the held text in the encrypted state of its runner stream.
It keeps the answer contexts in one encrypted state of the workspace, which each runner stream uses.
It saves both before it confirms the corresponding raw event.

`event-limits.ts` applies the same chat excerpt caps after either filter.
Its UTF-8 byte count works in the Worker and Node.
The workspace's [port report owner](../../worker/chat/port-reports.ts)
shortens port labels only after its final filter.

`chat-events.ts` caps serialized tool detail at 64 KiB.
Its omission count measures normalized source UTF-8 bytes before JSON escaping.
Turn summaries keep at most 200 files and 256 KiB of serialized file-list data.
They count omitted files. The complete Changes response has no summary cap.
`runner.event-refused` belongs only to workspace chat events.
It identifies the lost runner event without copying its data.
Its `repairFailed: true` flag marks a refused replacement of a lost workspace update.
Only the workspace sets that flag.
[Lost workspace updates](../../docs/protocol/agent-runner.md#lost-workspace-updates)
states the rules of the request and of a failed repair.

`events.ts` defines the browser stream. Its event numbers span all sessions
and runner connections of one workspace. A reconnect uses the last stored number.
The history response gives the point after which live events continue.
The optional `error` of `workspace.updated` carries only the saved public
code and message. A null error clears the previous error. An older event
without this field keeps the previous error.

`sessions.ts` defines the session paths, their requests and replies, and the `Session` record.
`Session.retryMessageId` names the one message that `retryMessagePath` accepts.
It is the retry message of the newest turn when that turn failed, and null otherwise.
A message or a retry that opens a linked session sets it to null on the source.
Each other message of the session gets HTTP 409 with the code `retry_not_available`.
[Messages](../../docs/protocol/messages-and-attachments.md#messages) states the rule.
`Session.startedBy` names the member who started the session.
It is null only for an older record whose starter is not known.
`Session.sourceSessionId` names the session where a message opened this linked session, and null otherwise.
`Session.loginAvailable` is the result of the last server check of the starter's login.
It stays true when the starter does not share that login.
`Session.loginShared` says whether the starter lets other members use that login, from the same check.
Each member reads the same values. None of these fields holds a login.
[Messages](../../docs/protocol/messages-and-attachments.md#messages) states how the composer uses both values.
`SendMessageResponse.session` in `messages.ts` is the record of the session that took the message.
It can differ from the session of the request.
[Agents](../../docs/protocol/agents-and-sessions.md#agents) states the starter rule.

`terms.ts` names the current revision of the Terms, `TERMS_VERSION`.
`acceptedTermsSignInPath(inviteCode?)` gives the sign-in path that carries that revision and an optional join code.
[Terms consent](../../worker/security/README.md#terms-consent) gives the rules of sign-in.
`operator.ts` defines the operator overview, directories, and user and org
suspensions. Its user records include `OperatorUserAccess` from
`operator-waitlist.ts`. That module also defines waitlist, approval, code,
pause, and waitlist switch paths and replies. `operatorWaitlistSwitchPath`
names the switch. `OperatorWaitlistSwitch` gives `waitlistOn`,
`updatedAt`, the operator of the last change, and `waiting`, the count of
people who wait, as the Waitlist tab counts them. The operator sees email
states and verified email flags, never email addresses. GitHub creation
times let the app show account age. Access sources carry the operator,
code label, referral owner, or org and inviting admin. The `open_signup`
source carries the operator who last turned the waitlist off. Referral
records include recipients with their GitHub names, or null.
`OrgSummary.suspension` in `orgs.ts` exposes only the org suspension time to its members.
[Operator actions](../../worker/operator/README.md) gives the access and the reply codes.

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
[Port previews](../../docs/protocol/terminal-previews-and-desktop.md#port-previews) states its access rules.
Each open of a port preview gets a new preview ID, and the API never gives out
a revoked ID again (decision 86). The Preview tool hides revoked previews by their ID.
The git credential payload is not defined yet.
[GitHub tokens](../../docs/protocol/tokens-and-secrets.md#github-tokens) states its rule.

## Key code

- [Session Markdown](transcript/session-markdown.ts) folds session pages and
  builds concise or full transcripts. [Markdown items](transcript/markdown-items.ts)
  format the shared chat words, paths, and commands. [Markdown code](transcript/markdown-code.ts)
  keeps inline and block fences longer than their content's backticks.
- [Lost data](transcript/lost-data.ts) maps refusal event types to the same
  product names for the browser line and the copied transcript.
- [Agent words](agents.ts) supply the effort labels, model lookup, and model
  labels for the chat, the new-workspace picker, and the mockups.
- [Duration](transcript/duration.ts) formats elapsed chat and command times.
  [Tool words](transcript/tool-words.ts) supply tool verbs, fold counts,
  and the rule that starts a run open.
- [Turn words](transcript/turn-words.ts) supply running, stopped, and failed
  lines, with omitted-file and unavailable-file data.
- [Command words](transcript/command-words.ts) supply Mac names, command
  states, notes, and output text. Browser code supplies icons and colours.
- [Session events](transcript/session-events.ts) take stored Worker envelopes
  or parsed browser envelopes and select one session's events.
- [Session log](transcript/session-log.ts) folds those events and session
  records in event order. It keeps the transcript and each item's first time.
- [Transcript](transcript/transcript.ts) defines the items and folds each
  session event with its [turn helpers](transcript/turn-events.ts).
- [Item placement](transcript/item-placement.ts) keeps late items in their
  turn. [Command placement](transcript/command-placement.ts) puts each Mac
  command after the items that began before it.
- [Turn work](transcript/turn-work.ts) finds each ended turn's folded work.
  [Transcript entries](transcript/transcript-entries.ts) group the items and
  generic inserts, and mark each run that can still grow. The browser and
  concise copy share its default open state. Browser callers use React
  nodes as the insert content.

- [Port reports](ports.ts) carry sorted listening ports and their safe labels.
- [Terminal contracts](terminal.ts) own the port shared with the listener exclusion.
- [Commit author](commit-author.ts) builds a GitHub user's commit author and its four Git variables.
- [Org contracts](orgs.ts) carry custom initials and GitHub repository choices for org creation.
- [Member contracts](members.ts) name each invitation by its email. Each member keeps the `User` with their GitHub login. `PendingOrgInvite` adds the org ID and name, for the invitations that the signed-in user can accept.
- [Account contracts](account.ts) include the repository list available before an org exists. `AgentLoginStatus.noReuse` of a connected login is true when other members cannot use it. `UpdateAgentLoginRequest` changes only that value, without the secret.
- [Waitlist contracts](waitlist.ts) define the state read, code use, and join paths. Their state gives app access, the pause, the required `waitlistOn` flag of the waitlist switch, the approval email, and the personal referral code's totals. `SessionResponse` in [account.ts](account.ts) adds app access to the sign-in session reply.
- [Operator waitlist contracts](operator-waitlist.ts) define approval results, email states, code management, pause and switch changes, and user access details.
- [GitHub setup](github-setup.ts) names the address where GitHub returns after an install, and the `state` values of the install link.
- [Org settings](org-settings.ts) carry the base image software for the Cloud computer tab.
- [Feedback contracts](feedback.ts) define the feedback path, its request and reply, and its byte limits.
- [Image signatures](images.ts) give `readImage` and `CheckedImage`. [images.test.ts](images.test.ts) checks the four formats, both GIF signatures, and refused or short signatures.
- [Routines](routines.ts) define routine paths, editable fields, triggers, inactive reasons, and run states.
  Author-filter requests carry logins. Saved filters carry account IDs and canonical logins.
  Run now takes a page request ID and returns its run after workspace admission.
  Run history returns up to 50 runs and a `nextCursor` for `routinePaths.runs`.
  Each run carries its own `agent` and `owner`, independent of later routine edits or owner moves.
  An unknown historical agent or owner is null.
  Removed workspaces have a null run workspace ID, while first-turn failures keep their workspace link.
  A pull request trigger can carry `skipLogin`, the account login of an author or sender skip.
  Older runs and skips without an account omit it.
- [Workspace views](workspace-view.ts) add the routine ID and name of a run, or null, in backend replies.
  The routine's `pullRequest` holds the run's pull request number and URL, or null for scheduled and Run now runs.
  Replies also carry `baseBranch`, resolved by the Worker. View writes cannot change it.
- [Base image](base-image.ts) records the software labels, their primary source, and the source check date.
- [Browser fakes](../test-support/README.md) use these response types.
- [Runner fakes](../../worker/test-support/README.md) use these message types.
- [Migrations](../../migrations/README.md) define the D1 tables and reserved ranges.
