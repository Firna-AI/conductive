# Web app tests

This guide belongs to the [web app guide](README.md), as its
[Tests](README.md#tests) section says. It gives the test environment of
Vitest, the shared test helpers, and what the tests of the device sign-in,
the drops, the uploads, and the secret requests check. Each path is
relative to `src/app/`, the folder of this guide.

The account routes of the development backend keep device sign-ins in a
private route closure. Start returns a fixed display code and a new handle.
The first poll waits. The next poll connects Codex with the normal share
default. Later polls read the current login without saving it again, until the sign-in expires after 15 minutes.
The fake uses the shared device response types. It sends no request to OpenAI.

Vitest runs in Node without a DOM. `test-kit.ts` gives services over the
fake API, with the raw parts of uploads through its fetch, requests or answers that
wait for the test (also two at one path), a manual timer with the wait of
each pending timer, which can run only the timers of one wait, a manual page
focus, visibility, input, and keys, and a recording event source.
`../shell/test-render.tsx` draws a screen with every provider through
server rendering, after the test loads its data. A test that needs focus
and keys opts into happy-dom with `// @vitest-environment happy-dom`, and
mounts the screen with `../shell/test-mount.tsx`, which also presses keys,
clicks, types, and lets the answers of the fake API settle.
`../shell/new-workspace/dialog-test-kit.tsx` mounts the whole app in a tab
for the tests of New workspace as a page or a dialog, and of its send key.
Its `markOf` gives the mark of a file of the draft by the name of the file.

`../shell/new-workspace/NewWorkspaceDrops.test.tsx` drops files on the
page and on the dialog card. A drop on the text of the page puts the files
at the point. While a create runs, the box shows no drop state or drop
caret, also for files that hovered as it began, and takes no drop. Files
over the card show its drop state, a dropped folder attaches as its zip,
and a folder that cannot be read gets its notice in the dialog.
`folder-zip.test.ts` zips a folder with nested, empty, and hidden entries,
moves the compressed bytes into a blob each time that they reach the flush
size, gives the name of a zip over the size limit and of a folder that
cannot be read, and stops with its drop. `../App.dom.test.tsx` mounts `App` and checks the guard
outside each box, the browser's own drag of text and links, and the copy
offer of a box. It also checks that the Feedback dialog still takes a
dropped screenshot.

`attachment-upload.test.ts` checks the upload in parts of both composers
over a fake Worker with small parts, from
`attachment-upload.test-support.ts`. It checks the parts in their order
with the progress of all parts, a part that goes again alone up to three
times, the waits of 1, 2, and 4 seconds before these retries, a stop during
a wait, a refusal that goes once, a resumed upload, a new upload when the
kept one is gone, the end of an upload by its complete call, a draft file
and an empty file, and a stop by the signal. `api/xhr-files.test.ts`
checks the `PUT` of each part. `new-workspace-waits.test.ts` checks that
New workspace waits on the timer of the app services, and that a Remove
during the wait stops the upload.

Run `npm run test -- src/app/dev/attachment-files.test.ts src/chat/dev/dev-attachment-files.test.ts`
for the API tests of the uploaded bytes and their copies in both
development fakes. `dev/attachment-test-kit.ts` gives them a stub
`window`, fake timers, a sample image, and a check of the exact bytes.

`dev/secret-request-routes.test.ts` answers the secret requests of the dev
fake. A waiting request gives the workspace the state `input` until an
Allow in time sends its run. A late Allow of a value sends the line of the
app, and the value stays for the workspace until Remove.
