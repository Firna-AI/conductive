# Files screens

The Files screens show the files of a workspace branch. All files is a
tree of every file. Changes lists the files that the branch changes
against the base branch, under the totals of the change. A file opens as a
page with rendered Markdown or text with line numbers and syntax colours.
A changed file opens its unified diff. The requirements are in
[Files and changes](../../docs/protocol/workspace-tools.md#files-and-changes).
The visual spec is the `app/files` page of the
[mockup catalogue](../../docs/mockups/README.md), and
`app/chat/unavailable-files` for a tree that the cloud computer could not
read.

The screens render data from the Worker only. The workspace screen of the
app shell mounts them, as
[the Files part](../shell/workspace/README.md#the-files-part) says. The
development pages and the tests run them against the fake API of
[the browser fakes](../test-support/README.md).

The files store keeps `ChangesResponse.unpushedCommits` and
`ChangesResponse.uncommittedFileCount` from HTTP replies and events,
including updates that change only a count. `parseChanges` refuses a reply
whose count is present but is not a whole number. An older runner can omit
either count. The store keeps it absent, so callers can distinguish an
unknown count from zero.

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

The kept store reads the file routes with the `fetch` of the org's
`ApiClient`, so the Mac app reads them from its own Worker, and a refusal
of a suspended org marks the org. Its stream is
the event source of the app, after the last event number of the store.
When the connection drops, the stream opens again as
[Data lifecycle](../app/README.md#data-lifecycle) says. So a return shows
the lists at once, and the socket asks only for the events after the last
complete point. Give `files` to the screens.

[Store rules](store.md) gives the rules of the stream of the store, the
open pages, the failed repairs of the lists, and a tree that the cloud
computer could not read.

A press on a folder chip in the chat calls `revealFolder(path)`. It opens
the folder and each folder that holds it, and All files scrolls the row of
the folder into view, as
[File mentions](../../docs/protocol/file-mentions.md) says.

The workspace view on the Worker holds the open tabs, the active tab, and
the list. The kept chat loads it and saves it, and the shell changes it
through the chat, so the view has one writer. The shell passes the view to
the screens, with a `FilesNavigation`:

- `href(target)` gives the address of a list, a file tab, or a diff tab.
- `navigate(target)` handles a plain click. The shell saves the change in
  the view, then moves the address. A click with a modifier key opens the
  address in a new browser tab.

The screens:

- `FilesPanel` shows the All files, Changes, and Checks tabs and lists,
  for the right column on desktop and the Files tab on a phone. The
  `checks` prop takes the Checks list of the GitHub banner screens. The
  `placeholder` prop replaces All files and Changes, for example with a
  sandbox state. Under the lists, the panel shows one notice for each
  failed repair, in the order of the tabs, with its age. A saved tree that
  the cloud computer could not read shows the notice of All files, with no
  age. The notices show under each of the three tabs, and they have no
  Dismiss. The `now` prop
  gives the clock of the ages. Pass a stable function. The default is
  `Date.now`. The `listKeys` prop gives the key of the command that opens
  each list, as a tooltip and a name for `aria-keyshortcuts` of its tab.
- `FilePage` shows one file tab. Markdown starts rendered, and its view
  switch navigates to the same tab with the other mode.
- `DiffPage` shows the diff of one changed file.
- The `placeholder` prop of `FilePage` and `DiffPage` replaces the content
  of the page, for example with a sandbox state. The page then reads
  nothing, and its header offers no Download. A diff keeps its changed
  lines from Changes. With `keepShown`, a page that already shows its file
  keeps it, with Copy, and the placeholder shows only in place of a page
  with nothing to show. When the placeholder goes, the page reads at once.
- `FileTabItem` is the closable tab of a file or a diff, as a list item
  for the tab row of the centre column on desktop. `onClose` asks the shell
  to close the tab. It takes the tab styles of the mockups' `WorkspaceTabs`,
  as the session tabs do. `item` takes more props of its list item, and
  `close` props of the wrapper of its Close button, such as the handlers,
  the classes, and the ref of the drag and of the tab menu of the row.
  `link` takes the ref of its link, which the row uses to give the tab the
  focus back after a move from the tab menu. `FilesLink` takes that `ref`.
  They are plain element props, so the Files code imports nothing from the
  chat.
  `LiftedFileTab` is the copy of the tab that a drag lifts above the page:
  its icon and its whole file name, with no link and no Close.
  `fileTabName(tab, label)` is the name of the tab, as a screen reader
  reads it: the file name of the label, or "File", with "changes" after
  the name of a diff. The tab row names the tab by it in its tab menu and
  its status.

[The Markdown preview](markdown-preview.md#the-worker) gives the worker
that parses the Markdown of a preview, and what the preview shows while
it waits for the worker or when the worker fails.

Each screen takes `layout`: `desktop`, or `phone` with touch targets of at
least 44 px. On a phone, a file page and a diff page link back to All
files or Changes.

Copy and Download take `targets`. The default, `browserTargets`, copies
the original text with the clipboard of the browser, with each byte order
mark of the file. The view and the line count leave out one leading mark.
Its Download reads the download route of the client, `downloadHref(path)`,
with the fetch of the browser and the session cookie. It saves the file
from memory only when the route sends it. When the route refuses the file,
the header shows that the download didn't start. The development page and
the tests inject `fetchedDownload` with the fetch of the fake API, because
the fake API serves no route that the browser can read. Pass the same
`targets` object on each render, because a new object starts new Copy and
Download states. The shell passes targets over the services of the app:
Copy uses their `copy`, and Download reads the route with the `fetch` of
the app's `ApiClient`, so the Mac app reads the file from its own Worker.

The shell supplies the design tokens as `--ui-*` CSS variables and the
`@firna/ui` theme provider, as `docs/mockups/src/theme.ts` builds them.

## Labels of paths

[Labels of paths](labels.md) gives the label that each screen shows in
place of a real path, because a path can hold a secret value.

## Safety

File content, Markdown, paths, and diffs are untrusted. The screens show
them as React text only. The Markdown renderer builds React elements from
its own parse: HTML in a file shows as text, images show their alt text,
and only absolute `http`, `https`, and `mailto` links become links. A link
opens in a new tab with `noopener noreferrer`. Quotes and lists nest at
most 16 levels deep, and deeper content shows as text. The parse runs in
the worker, off the thread of the page, so a long or crafted file cannot
stop the page.

[The Markdown preview](markdown-preview.md#safety-limits) gives the
limits of emphasis, of long runs of text, and of tables.

A file or a diff over the read limit shows the size and the limit that
the backend sends, and the terminal as the way to open it. The download
route reads a file with the same limit, so a file page offers Download
only after a read that fits. A binary diff links to its file tab in place
of Download.

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
and answers the Markdown worker with `parseMarkdown`. The other screen
tests keep their static markup checks in Node.

## Key code

- `model/files-store.ts`: `WorkspaceFiles`, the live tree and changes of a
  workspace with their failed repairs, and `versionOf`, which grows when an
  event may change the file or the diff of a path.
- `model/files-sync.ts`: the merge rules of the routes and the stream.
- `model/failed-repairs.ts`: `repairsAfter`, the failed repairs of the
  lists after one event of the stream.
- `model/files-invalidation.ts`: `FilesInvalidation`, the changed paths and
  the events without named paths of one message, applied to the versions
  once.
- `model/resource-loader.ts` and `model/follow-path.ts`: the read of one
  file or diff, which drops stale replies and reads again after an event.
- `api/files-client.ts`: `createFilesClient`, the file routes, with their
  errors as `FilesError`, and the download address of a path.
- `page/file-actions.ts`: Copy and Download, with `browserTargets`.
  `page/fetched-download.ts` is the download that reads the route and
  saves the file from memory, with the fetch of the browser or of the
  fake API.
- `api/parse-tree.ts`, `api/parse-changes.ts`, and `api/parse-events.ts`:
  the parsers of the route bodies and the stream messages. A stream
  envelope also keeps the failed repair of a file list.
- `navigation.ts`: `FilesTarget`, `FilesNavigation`, and the tab types of
  the workspace view.
- `model/file-labels.ts`: `pathLabel`, `listLabel`, and `pageLabel`, the
  label that a screen shows for a real path.
- `panel/FilesPanel.tsx`, `page/FilePage.tsx`, `page/DiffPage.tsx`, and
  `tabs/FileTabItem.tsx`: the screens.
- `panel/UnavailableLists.tsx`: the notices of the failed repairs under
  the lists, with the mockups' `LostUpdateRow` and their ages, and the
  notice of a saved tree that the cloud computer could not read.
- `markdown/markdown-document.ts`: `parseMarkdown`, the whole parse of a
  file: its blocks, then the inline content of each block.
- `markdown/markdown-inline.ts`: `parseInline`, the inline content of one
  block. `pairRuns` in `markdown/markdown-delimiters.ts` pairs its `*` and
  `_` markers by the CommonMark rules. `nestParts` in
  `markdown/markdown-nesting.ts` builds the nested content from the pairs.
- `markdown/markdown-blocks.ts`: `parseBlocks`, the blocks of a file. It
  reads each list with `readList` of `../markdown/list-items.ts`, the list
  reader that the chat shares, and the line tests of
  `../markdown/lines.ts`. [List parts](../chat/agent-text.md#list-parts)
  gives the rules of the shared list code.
  `src/markdown/headings.ts` holds its heading levels and the rules for
  hash headings and underline headings.
- `markdown/markdown-tables.ts`: `parseTable`, which reads one table of a
  file and fills its short rows, and `TableBudget`, the empty cells that
  the tables of one file may add. It reads each row with
  `../markdown/table-rows.ts`, which also holds the shared table types.
  [Table parts](../chat/agent-text.md#table-parts) gives the rules
  of the shared table code.
- `markdown/markdown-worker.ts` and `markdown/worker-parse.ts`: the module
  worker that runs the parse, and its start from the view, which ends it.
- `markdown/MarkdownView.tsx`: the safe renderer of a parsed document.
  `parser` replaces the worker for a static render. It draws each table
  through the shared `MarkdownTable` of the mockups, with the margin of
  its `.table` class. Its headings take their look from the shared
  `MarkdownHeadings.module.css` of the mockups, which chat answers use
  too, and its own CSS sets only their margins.
- `code/`: the syntax colours and the code view. `code/file-kind.ts` gives
  `fileKind`, the kind of a file by its name: Markdown, code, or another
  file. A file is code when the code view gives it syntax colours.
  `panel/file-icons.tsx` draws the icon of each kind through `EntryIcon` of
  the mockups, the one icon map of All files, the tabs, the list of `@`,
  and the file chips.
- `diff/`: the unified diff parser and view.
- `dev/`: the development page, its Vite config, its fixtures, its Copy
  and Download targets, `RepairControls`, the controls of the failed
  repairs and of a failed read, and `dev-unread.ts`, the stored state of
  `?tree=`.

See [the shared contracts](../shared/README.md) for the file routes, the
events, and the workspace view.
