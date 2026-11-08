# Workspace and session names

This guide belongs to the [chat backend](README.md).

## Workspace titles

`workspace-titles.ts` observes committed `message.accepted` events. It
starts one background title request for a workspace with a saved first
session and no title. The request holds no chat queue while it waits for
the model. Send and create do not wait for the answer.

`title-model.ts` reads `CONDUCTIVE_TITLE_MODEL` and calls the `AI` binding
through the replaceable `runTitleModel` dependency. It sends only the first
4,000 text characters, with no attachments. It asks for three to five
words, limits the answer to 32 tokens, and aborts after 15 seconds.
`title-text.ts` cleans the first line with text. It removes title labels,
quotes, and Markdown marks, then applies the shared session title rules.

A missing configuration logs one safe warning per workspace object and
keeps the city name. A failed call or an empty title also warns and keeps
the city name. A message without text asks nothing.

The next accepted text message can try again. Each retry reads the stored
first message through the message ID saved with the first session. If that
message has text, the retry uses it. Otherwise it uses the text of the
message that starts the retry. An existing title ends the requests.
The first-message record keeps old workspaces outside this path.

`workspace-title.ts` stores both Worker and runner titles through one
transaction. It emits `workspace.title` and updates the first session.
The common chat publisher sends both events to open tabs. The same module
writes the D1 name immediately, so the org list sees it too. The stored
summary and the existing lifecycle repair keep a committed title available
after a failed D1 write or an object restart.

Local development disables remote bindings in `vite.config.ts`. Workers AI
runs only remotely, so local development keeps city names and needs no
Cloudflare login. Tests inject a fake model call and use no Workers AI.

## Session names

`first-message.ts` reads the assigned first session ID from
`workspace_runtime.session_id` and the workspace name from D1. It saves
both with the first message ID in chat storage at admission. `sessions.ts`
gives that session the workspace name, which starts as a city name.

`session-titles.ts` applies the first stored `workspace.title` to that
session while its title still equals the saved workspace name. It records
the receipt in the same transaction. A member's name stays.
A later workspace title leaves the session unchanged.

Each other session starts as "New session". `messages.ts` uses
`sessionTitleFrom` in `src/shared/session-title.ts` when it accepts text
while the session still has that default title. The shared function makes
a title from the first line with text and limits it to 60 Unicode code
points. An attachment-only message leaves the title for the next text
message. A member's name stays. Repeated message IDs change nothing.
The numbered `session.updated` event sends each changed title to open tabs.

