# Files screens

The Files screens show the files of a workspace branch. All files is a
tree of the files, up to the limit of its report. Changes lists the files
that the branch changes against the base branch, up to its limit, under
the totals of the whole change. A file opens as a
page with rendered Markdown or text with line numbers and syntax colours.
An image file, which is a PNG, JPEG, GIF, or WebP file, opens as a
picture, which zooms and expands. An HTML file opens its page in a frame
from the files preview of the workspace. A changed file opens its unified
diff, with the same syntax colours. A code block of rendered Markdown
takes the same colours from its fence label. A skill tab shows the text
of one skill with the parts of a file page, as [The screens](screens.md)
says. The requirements are in
[Files and changes](../../docs/protocol/workspace-tools.md#files-and-changes),
[HTML file preview](../../docs/protocol/html-file-preview.md), and
[Chat code blocks](../../docs/protocol/chat-code-blocks.md#colours).
The visual spec is the `app/files` page of the
[mockup catalogue](../../docs/mockups/README.md), `app/files/html` for the
tab of an HTML file, `app/chat/unavailable-files` for a tree that the
cloud computer could not read, and `app/files/limited` and
`app/files/changes/limited` for lists whose reports leave out entries.

`code/CodeField.tsx` shares the line numbers and the syntax colours of a
file tab with other screens. `CodeField` is a field for code, and
`CodeBlock` shows code to read. The Cloud computer tab uses them for the
install script and the startup script.

`code/` also gives the syntax colours of a file tab to the code blocks of
chat answers and of the Markdown preview. `languageOfLabel` of
`code/fence-languages.ts` gives the language of a fence label, by the name
of the language or by the extension of its files. `CodeText` of `code/`
draws the coloured lines of a block, with a line feed between two lines.
So the same code looks the same in an answer, in the preview, and in a
file tab.

The screens render data from the Worker only. The workspace screen of the
app shell mounts them, as
[the Files part](../shell/workspace/README.md#the-files-part) says. The
development pages and the tests run them against the fake API of
[the browser fakes](../test-support/README.md).

The files store keeps the Changes list as a `BrowserChangesResponse`.
Its `unpushedCommits` and `uncommittedFileCount` come from HTTP replies
and events, including updates that change only a count. `parseChanges`
refuses a reply whose count is present but is not a whole number. An older
runner can omit either count. The store keeps it absent, so callers can
distinguish an unknown count from zero. The store keeps the omitted totals
of a limited report the same way, as [Omitted totals](store.md#omitted-totals)
says.

## Integration

The tab keeps one `WorkspaceFiles` store for each workspace that it showed,
beside its kept chat. The workspace screen connects it once, for the whole
screen, through `useWorkspaceStore` of [the web app](../app/README.md), so
the pull request bar knows the local work on every tab. The Files part and
the other parts that show files only read it. The chat of the shell reads
it for the list of `@` and the file chips, also on a phone before a visit
to Files. A stable `create` finds the kept store, or makes it. It starts
nothing. A stable `connect` starts the store and returns its stop. A second
connect of the same store, such as the second run of an effect, shares its
one connection, which stops after the last connect stops:

```ts
const connections = new WeakMap<WorkspaceFiles, number>()

function startFiles(files: WorkspaceFiles): () => void {
  const count = connections.get(files) ?? 0
  connections.set(files, count + 1)
  if (count === 0) files.start()
  let stopped = false
  return () => {
    if (stopped) return
    stopped = true
    const left = (connections.get(files) ?? 1) - 1
    connections.set(files, left)
    if (left === 0) files.stop()
  }
}

const create = useCallback(
  ({ orgId, workspaceId }: WorkspaceIdentity) =>
    shownWorkspaces(app, viewer).files(orgId, workspaceId),
  [app, viewer],
)
const { store: files } = useWorkspaceStore(
  { orgId, workspaceId },
  { create, connect: startFiles },
)
```

The store reads the file routes with the `fetch` of the org's `ApiClient`.
The Mac app reads from its own Worker. A refusal of a suspended org marks
the org. A new store starts both list reads. When both give cutoffs, the
stream starts after the smaller cutoff. A cutoff is the last workspace
event that a read includes. As soon as either read gives no cutoff, the
stream starts after event 0. See
[The state of a new tab](../../docs/protocol/workspace-events.md#the-state-of-a-new-tab).

A return to a kept store shows its lists at once. The socket starts after
the last complete point of that store's stream. A dropped connection also
resumes from its own progress. See
[Data lifecycle](../app/README.md#data-lifecycle).

[Store rules](store.md) gives the rules of the stream of the store, the
open pages, the failed repairs of the lists, and a tree that the cloud
computer could not read.

A press on a folder chip in the chat calls `revealFolder(path)`. It opens
the folder and each folder that holds it, and All files scrolls the row of
the folder into view, as
[File mentions](../../docs/protocol/file-mentions.md) says.

The workspace view on the Worker holds the open tabs, the active tab, the
mark of the temporary tab, and the list. The kept chat loads it and saves it, and the shell changes it
through the chat, so the view has one writer. The shell passes the view to
the screens, with a `FilesNavigation`:

- `href(target, lines)` gives the address of a list, a file tab, or a diff
  tab. A file tab with `lines` names them in the query, as `?line=42-50`.
- `navigate(target, lines)` handles a plain click. The shell saves the
  change in the view, then moves the address. A file or a diff with no tab
  opens in the temporary tab, as
  [Temporary tabs](../../docs/protocol/temporary-tabs.md) says. The view
  keeps the tab without the lines. A click with a modifier key opens the
  address in a new browser tab.
- `keep(tab)` handles a double-click on a file row or on a tab. The shell
  makes the tab of that file or diff a kept tab when it is the temporary
  tab, and moves no address. Keep open in the tab menu calls it too.

The shell reads the lines of the address with `useAddressLines`, which
also counts each visit of an address with lines, and gives them to
`FilePage`. So a second press on the same chip shows the lines again.
`CodeView` then scrolls the first line to the middle of its view and
marks each line of the range, as
[Files and changes](../../docs/protocol/workspace-tools.md#files-and-changes)
says. A file chip of an answer with a line target opens such an address.

[The screens](screens.md) gives each screen and its props: the lists, the
file page, the diff page, the tabs, the layout, Copy and Download, and
the links of the Markdown preview.

### Kept scroll offsets

Each file, diff, and skill tab of the centre keeps its scroll offset, down
and sideways, while another tab or workspace shows, as
[The tab row](../../docs/protocol/agents-and-sessions.md#the-tab-row) says.
`WorkspaceFiles.scrollPlaces` holds the offsets, by tab and view, for as
long as the app keeps the store. The desktop tab page gives the shown tab
through the `KeptScroll` context of `ui/kept-scroll.ts`. `CodeView`,
`DiffView`, and the Markdown preview take their scroll box from
`useKeptScroll`, with the view `code`, `diff`, or `preview`. A view outside
the context, such as a file page on a phone, keeps nothing. Content that
grows after the mount gets the offset again at each change of size, until
the box reaches it or the reader scrolls. When a tab leaves the saved view,
such as at a close, it forgets its offsets, so it opens at the top again.
A view can give `useKeptScroll` an aim, a place that the address names,
such as the lines of a file chip. The aim wins over the kept offset, and
only a new key of the aim scrolls again, so a change of the file keeps the
place of the reader. The hook is the one owner of the scroll of its box.
The offsets live in a `TabPlaces` store of the web app, in
`src/app/tab-places.ts`, and the chat files of the workspace screen give it
each list of the file, diff, and skill tabs through `useFollowTabs`.
`ui/kept-scroll.dom.test.tsx`
tests the hook, and `TabScroll.test.tsx` of the
[workspace files](../shell/workspace/files/) tests the tabs of the
workspace screen.

### Select all in a file

`CodeView` and `DiffView` draw their rows in `CodeBox` of
`code/CodeBox.tsx`, a focusable region, so a press in the text gives it
the focus. Its key handler turns Cmd+A or Ctrl+A into a selection of the
box only. The browser would otherwise select the whole app. The line
numbers cannot be selected, so a copy leaves them out.

`CodeView` gives `CodeBox` the `copySource` of its text, from
`code/code-selection.ts`: its lines, joined with line feeds, and the
offset of the start of each line. Each row carries `data-copy-line`, the
index of its line, and its text cell carries `data-copy-text`. A copy
maps the two ends of each range of the selection to offsets in that
text, and gives `copiedText`, the text between them. Only the rows of
the two ends are read, so a copy costs the same in a long file. A browser
can split one drag into several ranges, as Firefox does at each line
number, so the copy joins every range. It keeps the empty lines, which
the browser leaves out, and select all gives the whole text that the view
shows. A caret, or a range that reaches out of the box, leaves the copy
to the browser. The diff gives no source, so its copy stays the copy of
the browser. `code/CodeBox.dom.test.tsx` tests select all, and
`code/CodeCopy.dom.test.tsx` tests the copy, with the helpers of
`code/code-box-test-kit.tsx`.

## Labels of paths

[Labels of paths](labels.md) gives the label that each screen shows in
place of a real path, because a path can hold a secret value. It also
gives the check that leaves out the items of the row menu, and Copy path
of the tab menu, for such a path.

## Safety

File content, Markdown, paths, and diffs are untrusted. The screens show
them as React text only, apart from the picture of an image file. The
page of an HTML file shows only in the frame that the shell gives, from
the preview domain, so no script of the file runs on the app's site. The
Markdown renderer builds React elements from the parts that the shared
parser gives, so no HTML of a file reaches the page.
[Files and changes](../../docs/protocol/workspace-tools.md#files-and-changes)
gives the rule for HTML in a Markdown file, and for a line-break tag. A
Markdown image shows its alt text, and no picture loads. Only absolute
`http`, `https`, and `mailto` addresses become links. An image at an
`http` or `https` address shows its alt text as a link. A bare address in
the text stays text. Quotes and lists nest at most 16 levels deep, and
deeper content shows as text. The parse, with the colours of its code
blocks, runs in the worker, off the thread of the page, so a long or
crafted file cannot stop the page.

Each link of the preview has the look of the shared `TextLink`, and its
title gives its whole address. The link opener of the app shell opens
it, as
[Files and changes](../../docs/protocol/workspace-tools.md#files-and-changes)
says:

- A link to a page of the app opens that page in the same window. A click
  with a modifier key keeps the action of the browser.
- Every other link opens a new tab with `noopener noreferrer`, so the
  other site gets no address of the app.
- Unlike chat text, the preview keeps each link that its parse accepts. A
  `mailto` address, an address with a user name or a password, and an
  address of the app that names no page open a new tab.
- A link that the preview does not open shows its label as text. The
  parser makes no link of a script or a data address, such as
  `javascript:`, so such a link shows as typed.

A local address of a file, such as `http://localhost:3000`, opens a new
tab too. It does not open the preview of its port, as a local address of
chat text does.

[The Markdown preview](markdown-preview.md#safety-limits) gives the
limits of emphasis, of long runs of text, and of tables.

The picture of an image file is an `img` element with a `data:` address
of the bytes of the read, so the bytes show only as a picture. The
[content security policy](../../docs/protocol/access-and-security.md#content-security-policy)
of the web app and of the Mac app lets an image load from a `data:`
address, but not from a `blob:` address.

A file or a diff over the read limit shows the size and the limit that
the backend sends, and the terminal as the way to open it. The download
route reads a file with the same limit, so a file page offers Download
only after a read that fits. A binary diff links to its file tab in place
of Download, unless the diff deletes the file.

## Development

The development page runs the screens against `FakeApiServer`, with the
mockup samples. `dev/main.tsx` makes the store of the page in a stable
`create`, and `DevApp` connects it through `useWorkspaceStore`, as the app
does. From the repository root:

```sh
npm exec vite -- --config src/files/dev/vite.config.ts
```

Then open `http://127.0.0.1:5173/src/files/dev.html`.
[The development page](development.md) gives the state that its address
holds, its samples, and its controls.

Run the tests with `npm run test -- src/files`. The `*.mounted.test.tsx`
files mount the screens in happy-dom, with `mount-test-kit.ts`, as the
GitHub banner tests do. The kit also starts a store, presses a control,
and answers the Markdown worker with `previewDocument`, the parse of the
worker.
`page/picture-test-kit.tsx` opens a file page with a given read. Its
`fakeDecoder` draws or refuses each picture by hand, in place of the image
decoder of the browser. These tests do not run that decoder.
`page/html-test-kit.tsx` opens the page of an HTML file with a preview that
stands in for the shell. The other screen tests keep their static markup
checks in Node.

## Key code

[Files key code](key-code.md) names the files, the types, and the
functions of the Files screens that a reader opens first.

See [the shared contracts](../shared/README.md) for the file routes, the
events, and the workspace view.
