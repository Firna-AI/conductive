# Workspace and session names

This guide belongs to the [chat backend](README.md).

## Workspace titles

`workspace-titles.ts` observes committed `message.accepted` events. It
starts one background title request for a workspace with a saved first
session and no name or stored title. The request holds no chat queue while it waits for
the model. Send and create do not wait for the answer.

`title-model.ts` reads `CONDUCTIVE_TITLE_MODEL` and calls the `AI` binding
through the replaceable `runTitleModel` dependency. It sends only the first
4,000 text characters, with no attachments. It asks for three to five
plain words with no underscores, limits the answer to 32 tokens, and
aborts after 15 seconds.
It reads either the model's `response` text or the first chat completion's
`message.content`. The deployment configuration supplies the title model.
`title-text.ts` cleans the first line with text. It removes title labels,
quotes, and Markdown marks. It then applies `modelTitleFrom` from
`src/shared/session-title.ts`. That rule changes each underscore to a
space, then applies `sessionTitleFrom`, the shared session title rule.
Only the title model uses `modelTitleFrom`.
[Messages](../../docs/protocol/messages-and-attachments.md#messages) states
the requirements of the title request and its answer.

A missing configuration logs one safe warning per workspace object and
keeps the name empty. A failed call or an empty title also warns and keeps
the name empty. A message without text asks nothing.

The next accepted text message can try again. Each retry reads the stored
first message through the message ID saved with the first session. If that
message has text, the retry uses it. Otherwise it uses the text of the
message that starts the retry. An existing title ends the requests.
The first-message record keeps old workspaces outside this path.

`workspace-title.ts` stores both Worker and runner titles through one
transaction. It fills only an empty name, on a workspace that is not
archived, in an org that is active. It checks this before it stores an
event. A refused title changes no name and emits no event.
The runner receipt still advances its cursor and confirms that event.
An accepted title emits `workspace.title` and updates the first session.
The common chat publisher sends both events to open tabs. The same module
writes the D1 name immediately, so the org list sees it too. The stored
summary and the existing lifecycle repair keep a committed title available
after a failed D1 write or an object restart. The detail read and the repair
write fill only an empty D1 name under the same workspace access rule.
A name set through the workspace route stays.

D1 keeps `workspaces.name` as non-null text. An empty string means no name.
`workspaceNameColumn` in `worker/data/workspace-name.ts` supplies the SQL
column expression that maps it to null in every workspace name query.
Workspace responses, events, and the agent tools use null.
`nameLabel` in `src/shared/name-label.ts` gives the display label "Untitled".

Local development disables remote bindings in `vite.config.ts`. Workers AI
runs only remotely, so local development keeps names empty and needs no
Cloudflare login. Tests inject a fake model call and use no Workers AI.

## Session names

`first-message.ts` reads the assigned first session ID from
`workspace_runtime.session_id`. It saves that ID and the first message ID
in chat storage at admission. `sessions.ts` starts every new session with
a null title. Existing sessions keep their stored names.

`session-titles.ts` applies the first stored `workspace.title` to that
session while its title is null. The shared session rule fills only an
empty title. A member's name stays, including an old default name.
A later workspace title leaves the session unchanged.

`messages.ts` uses the same session rule for each other session. It checks
workspace access before it sets the title. `sessionTitleFrom` in
`src/shared/session-title.ts` makes
a title from the first line with text and limits it to 60 Unicode code
points. It keeps underscores, because a member wrote that text.
An attachment-only message leaves the title for the next text
message. A member's name stays. Repeated message IDs change nothing.
The numbered `session.updated` event sends each changed title to open tabs.
