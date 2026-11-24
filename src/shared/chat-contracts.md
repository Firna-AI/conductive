# Chat contracts

This page belongs to the [shared contracts README](README.md). It gives the
output filter of agent answers, the limits of chat excerpts and events,
the chat events, the browser event stream, and the session contracts.

## The output filter

`output-sanitizer.ts` holds possible secret suffixes across answer events.
It keeps each answer in one of two saved formats.
`output-sanitizer-legacy.ts` holds the earlier format, with raw held text and the secret values that still apply to it.
`output-symbolic.ts` holds the symbolic format, which lists no value.
The `OutputMatching` of the caller turns the symbolic format on for new answers.
While it is off, a new answer uses the earlier format, and a saved symbolic answer stays symbolic.
A completion or a turn end releases the held text of its answer.
The filter then keeps an answer context for each released end that can still complete a secret.
After a completion, it keeps the context of the earlier text and of the completion text.
A refused completion leaves the earlier text on the screen.
Later text of the same answer masks the part that completes a secret from a context.

A symbolic answer erases each whole copy of a candidate value in its held text into a run.
The saved text has `[redacted]` in place of each run, so an older reader sees a marker there.
A value crosses a run only through an entry with its own identity, offset, and start.
An entry also lets a complete shorter value match as a fallback when the longer value does not follow.
A whole literal `[redacted]` keeps its precedence as one marker, as in the earlier format.
An answer context keeps only an identity and the count of its matched characters.
`secret-held.ts` and `secret-held-scan.ts` hold the runs, the entries, and their scanner.
`secret-held-contexts.ts` derives continuation references from the logical source that the scanner released.
The scanner returns them with its shown text, so a mask does not remove later matching.
The caller gives candidates only for the values that are active now, so an ended value matches nothing.
[Answer text secrets](../../docs/protocol/answer-text-secrets.md) states the requirements and the rollout.

The filter does not cap the number of answer contexts.
Its snapshot holds each answer in its own format.
A snapshot without answer contexts also stays valid.
The Worker keeps the held text in the encrypted state of its runner stream.
It keeps the answer contexts of each answer in an encrypted state of that answer, which each runner stream uses.
It saves both before it confirms the corresponding raw event.

`secret-text.ts` holds the exact-copy scanner of the earlier format and of
other runner text. Symbolic completion text uses the logical-source scanner.
The Worker's
tool-detail filter uses it for the target of a tool. The text of a private
tool-detail source has its own [scanner](../../worker/chat/tool-detail-scan.ts).

## Chat events and their limits

`event-limits.ts` applies the same chat excerpt caps after either filter.
Its UTF-8 byte count works in the Worker and Node.
The workspace's [port report owner](../../worker/chat/port-reports.ts)
shortens port labels only after its final filter.
`output-fields.ts` leaves out each skill whose name the filter changes.
The workspace's [skill report owner](../../worker/chat/skill-reports.ts)
cuts skill descriptions only after that filter.

`chat-events.ts` caps serialized tool detail at 64 KiB.
Its omission count measures normalized source UTF-8 bytes before JSON escaping.
Turn summaries keep at most 200 files and 256 KiB of serialized file-list data.
They count omitted files. The complete Changes response has no summary cap.
A `turn.completed` event can carry `endReason`, of the type `TurnEndReason`.
The runner, the Worker, and the browser use that one type.
Its one value is `background_work_limit`.
The end of a fast turn can carry `speed`, of the type `TurnSpeed`, which
`readTurnSpeed` reads: fast, or standard with a cause code.
`runner.event-refused` belongs only to workspace chat events.
It identifies the lost runner event without copying its data.
Its `repairFailed: true` flag marks a refused replacement of a lost workspace update.
Only the workspace sets that flag.
[Lost workspace updates](../../docs/protocol/agent-runner.md#lost-workspace-updates)
states the rules of the request and of a failed repair.
`workspace.continued` is the note of Continue in one session. It belongs to
`ChatEvent`, so it reaches the browser stream, but not to `AgentChatEvent`
or to the runner events. Only the Worker writes it. It names its
`sessionId`, the `member` who pressed Continue, the new `branch`, and its
`baseBranch`. The optional `displayBranch` and `displayBaseBranch` are
masked labels of these real names. A new note is stored with them, from
the secret values that the Worker reads just before it writes the note.
An older note has none. At each read that a browser gets,
`filterContinued` in `output-fields.ts` masks the stored label, or else the
real name, with the values of that read. It leaves out a label that equals
its real name, as [Labels](../../worker/lifecycle/continue.md#labels) in
the Continue guide says.

`session.watch-notice` is the wake of a watch in one calling session, of
the generated type `SessionWatchNotice`. It belongs to `ChatEvent` in the
same way, and only the Worker writes it. Its `messageId` names the hidden
message that carries the wake to the agent. The chat finds the turn of
the line through that message, as
[Transcript rules](../chat/transcript.md) says.

## The browser stream

`events.ts` defines the browser stream. Its event numbers span all sessions
and runner connections of one workspace. A reconnect uses the last stored number.
The history response gives the point after which live events continue.
`WorkspaceSeed` in [workspace-state-read.ts](workspace-state-read.ts)
gives the current reports and failed repairs for a workspace GET. Its
cutoff is `OrderedWorkspaceResponse.eventNumber` in
[workspaces.ts](workspaces.ts).
The optional `error` of `workspace.updated` carries only the saved public
code and message. A null error clears the previous error. An older event
without this field keeps the previous error.

## Sessions

`sessions.ts` defines the browser session paths and their requests and replies.
`Session` and `TranscriptDetail` come from `generated/`.
`Session.retryMessageId` names the one message that `retryMessagePath` accepts.
It is the retry message of the newest turn when that turn failed, and null otherwise.
A message or a retry that opens a linked session sets it to null on the source.
Each other message of the session gets HTTP 409 with the code `retry_not_available`.
[Messages](../../docs/protocol/messages-and-attachments.md#messages) states the rule.
`Session.startedBy` names the member who started the session.
It is null only for an older record whose starter is not known.
`Session.login` names a personal owner or an org, through generated `SessionLogin`.
It is optional for old records and empty sessions.
The Worker fixes it at the first accepted message.
`Session.defaultLogin` names the starter's current default owner before that message.
It is absent when no login serves the starter and clears when `login` is fixed.
The check uses the starter as the sender, so every reader gets the same owner.
An older session with messages keeps the starter's personal login.
`Session.sourceSessionId` names the session where a message opened this linked session, and null otherwise.
`Session.loginAvailable` is the result of the last server check of the session login.
It stays true when a personal owner does not share that login.
`Session.loginShared` gives that personal share setting and is always true for an org login.
Each member reads the same values. These fields carry no credential.
The additive `defaultLogins` of account and org-login replies uses generated `DefaultAgentLogin`.
Each entry names an org, agent, resolved owner, and optional selected endpoint model list.
Its `orgModelList` gives model availability for fixed org sessions, including with a personal default.
The Worker supplies the order so screens do not compute it.
[Messages](../../docs/protocol/messages-and-attachments.md#messages) states how the composer uses both values.
`SendMessageResponse.session` in `messages.ts` is the record of the session that took the message.
It can differ from the session of the request.
[Org logins](../../docs/protocol/org-logins.md) states the fixed and default login rules.
