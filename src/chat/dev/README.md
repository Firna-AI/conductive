# Development page

The development page of the chat runs it in a browser on the fake API. See
[the chat](../README.md) for the whole chat.

## Run it

Run the page from the repository root:

```sh
npx vite --config src/chat/dev/vite.config.js --port 5181 --strictPort
```

Then open `http://127.0.0.1:5181/src/chat/dev/`. This Vite configuration
serves the page with React on the fake API alone, without the Worker and its
sign-in gate.

The composer lists the files of the Files development page after `@`, and
a press on a file chip notes what the app opens.

`npm run dev` also shows the chat, in the workspace screen of the whole
app, over the fake API of the app. That fake has limits for the chat, as
[Run it](../../app/README.md#run-it) says. Use this page for live events and
writes.

## Options

The address chooses the state. The first value of each option is the default:

| Option | Values |
| --- | --- |
| `scenario` | `history`, `running`, `steer`, `interrupted`, `failed`, `queued`, `first-turn`, `skills` (a Claude session whose agent uses skills: the work fold of a finished turn names them, and a running turn has a folded run that names one and the running skill line of another), `loss` (left-out output and files, lost events, and a lost turn end) |
| `workspace` | `existing`, `new` (Untitled until its title comes, and it starts) |
| `state` | `ready`, `working`, `input` (needs input), `unread`, `starting`, `stopped`, `error`, `archived` |
| `role` | `admin`, `member` |
| `login` | `on`, `off` |
| `starter` | `on`, `off` (the login of each starter is not available), `private` (each starter keeps the login for their own messages), `none` (older records that name no starter), `linked` (the reader's message opened a linked session, whose turn waits) |
| `replay` | `stored`, `live` (the recorded chat arrives event by event) |
| `viewport` | `desktop`, `mobile` |
| `scheme` | `dark`, `light` |
| `clock` | `running`, `frozen` |
| `mac` | `none`, `waiting`, `longer`, `several`, `many` (four requests, the first a long script), `running`, `denied`, `done`, `exit-code`, `cut`, `timed-out`, `failed`, `unavailable`, `literal` (a two-line command and a U+00A0 command, also saved) |
| `app` | `browser`, `mac` (the Mac app on the Mac that got the requests) |
| `change` | `done`, `done-not-saved`, `failed` (what the page's Mac does with a change of its settings) |
| `page` | `chat`, `this-mac` (the This Mac section of the account) |
| `files` | `listed`, `unread` (each end of a turn of the chat says that the cloud computer could not read its changed files) |
| `answer` | `text`, `tables` (each scripted turn answers with three tables: the resources of the machine, bundle sizes with a short row, and a wide table of test runs), `headings` (each scripted turn writes its plan under a heading, and answers with a review under headings at levels 2 to 4) |

## What the page does

The desktop page keeps the mockup's columns, so the chat column is 718 px wide
in a 1440 px window. The buttons of the page make the sandbox ready, stop it,
fail its start, write the title of a workspace with no name, drop the
connection, resend the last event, send two parts out of order, and connect
the Mac again under a new pairing, whose next read the page then makes. Writes of the page change the fake's state:
new sessions, rename, close, reopen, messages, steer, Stop, Try again, model
changes, uploads, Resume, and the view. As in the Worker, Try again sends the
message that the session record names again, as a new message. It refuses
each other message with 409. Each accepted message sets that record's
`retryMessageId` to null. Send and Try again in a session whose starter's
login is not available, or private, open a linked session, as the Worker
does. The page
sends as the member of the `role` option, who also starts each new
session. A model change opens its session under the ID that
the chat chose. Stop and the close of a running tab
record the member of the `role` option as the one who pressed Stop. Stop
the sandbox ends a running turn with no Stop request. With `app=mac`, the
page's Mac acts on each answer: Deny ends the request, and the other choices
run the command and keep the choice. The bar of the 15 minutes shows above
the header while they run. The Mac refuses a change of an older pairing, as
the Worker does.

The transcript route gives concise and full Markdown from the fake's stored
and live events, also for a tab that never showed and for an archived
workspace. `dev-transcript.ts` uses the same shared `SessionMarkdown` as
the Worker. It reads the real fixture records and command results rather
than a canned transcript. `dev-stream.ts` exposes the current event snapshot.

Each turn of the page's scripted agent writes its answer in parts, about
0.4 seconds apart, and sends the whole answer with the last part. With
`answer=tables`, each part is one line of the answer, and one row comes in
two parts. So each header row shows as text until its separator row comes,
and the table then grows one row at a time. With `answer=headings`, each
part is one line too. The plan of each turn then starts with a heading,
so its message line in the folded work shows the heading.

The names follow the backend. A new workspace and each new session have no
name, and show "Untitled". The page fills a name only while it is empty,
and never in an archived workspace, so a name that the reader gave stays.

With `workspace=new`, the workspace and its first session start with no
name. The create of the workspace accepted its first message before the
page loaded. About a second after the page loads, the page writes the
title "Saved carts", whether or not the sandbox is ready. After a first
message with no text, the next message with text that the page accepts
gives the title, about a second later. The workspace and its first session
take the title.

Each other session takes the first line of its first message with text as
its title, from `sessionTitleFrom` in `src/shared/session-title.ts`, which
the Worker uses too.

## Key code

The [Key code of the chat](../README.md#key-code) names the files of this
folder.
