# Chat development page

This page shows [the chat](../README.md) on a fake API with state. Run the
page from the repository root:

```sh
npx vite --config src/chat/dev/vite.config.js --port 5181 --strictPort
```

Then open `http://127.0.0.1:5181/src/chat/dev/`. This Vite configuration
serves the page with React on the fake API alone, without the Worker and its
sign-in gate.

`npm run dev` also shows the chat, in the workspace screen of the whole
app, over the fake API of the app. That fake has limits for the chat, as
[Run it](../../app/README.md#run-it) says. Use this page for live events and
writes.

The address chooses the state. The first value of each option is the default:

| Option | Values |
| --- | --- |
| `scenario` | `history`, `running`, `steer`, `interrupted`, `failed`, `queued`, `first-turn`, `loss` (left-out output and files, lost events, and a lost turn end) |
| `workspace` | `existing`, `new` (Lisbon, which starts) |
| `state` | `ready`, `working`, `input` (needs input), `unread`, `starting`, `stopped`, `error`, `archived` |
| `role` | `admin`, `member` |
| `key`, `login` | `on`, `off` |
| `replay` | `stored`, `live` (the recorded chat arrives event by event) |
| `viewport` | `desktop`, `mobile` |
| `scheme` | `dark`, `light` |
| `clock` | `running`, `frozen` |
| `mac` | `none`, `waiting`, `longer`, `several`, `many` (four requests, the first a long script), `running`, `denied`, `done`, `exit-code`, `cut`, `timed-out`, `failed`, `unavailable`, `literal` (a two-line command and a U+00A0 command, also saved) |
| `app` | `browser`, `mac` (the Mac app on the Mac that got the requests) |
| `change` | `done`, `done-not-saved`, `failed` (what the page's Mac does with a change of its settings) |
| `page` | `chat`, `this-mac` (the This Mac section of the account) |

The desktop page keeps the mockup's columns, so the chat column is 718 px wide
in a 1440 px window. The buttons of the page make the sandbox ready, stop it,
fail its start, write the title, drop the connection, resend the last event,
send two parts out of order, and connect the Mac again under a new pairing,
whose next read the page then makes. Writes of the page change the fake's state:
new sessions, rename, close, reopen, messages, steer, Stop, Try again, model
changes, uploads, Resume, and the view. A model change opens its session
under the ID that the chat chose. Stop and the close of a running tab
record the member of the `role` option as the one who pressed Stop. Stop
the sandbox ends a running turn with no Stop request. With `app=mac`, the
page's Mac acts on each answer: Deny ends the request, and the other choices
run the command and keep the choice. The bar of the 15 minutes shows above
the header while they run. The Mac refuses a change of an older pairing, as
the Worker does.
