# Files screens

The Files screens show the files of a workspace branch. All files is a
tree of every file. Changes lists the files that the branch changes
against the base branch, under the totals of the change. A file opens as a
page with rendered Markdown or text with line numbers and syntax colours.
A changed file opens its unified diff. The requirements are in
[Files and changes](../../docs/protocol/workspaces-and-sandboxes.md#files-and-changes).
The visual spec is the `app/files` page of the
[mockup catalogue](../../docs/mockups/README.md), and
`app/chat/unavailable-files` for a tree that the cloud computer could not
read.

The screens render data from the Worker only. The workspace screen of the
app shell mounts them, as
[the Files part](../shell/workspace/README.md#the-files-part) says. The
development pages and the tests run them against the fake API of
[the browser fakes](../test-support/README.md).

## Integration

The tab keeps one `WorkspaceFiles` store for each workspace whose Files
part showed, beside its kept chat. The Files part connects it through
`useWorkspaceStore` of [the web app](../app/README.md). A stable `create`
finds the kept store, or makes it. It starts nothing. A stable `connect`
starts the store and returns its stop:

```ts
function startFiles(files: WorkspaceFiles): () => void {
  files.start()
  return () => files.stop()
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

The store reads each message of the subscription from `unknown`: the stored
history first, in one or more pages, then the live events. The pages of
one replay share one cutoff, and a page can leave out event numbers. The
store reads the tree and the changes routes, then applies the file events
in event order, and live events wait for the final page. It skips an event
that it already has. After a gap in the numbers of the live events, it
subscribes again from its last event number. After a gap in the tree
revisions, it reads the tree route again.

The stored history and the live events change the open pages in the same
way. An event names the paths whose file or diff it may change, and the
open page of such a path reads again.

An add-or-replace (`upsert`) with unchanged entry fields reports a content
change, so the open file and diff read again.

Some events cannot name their paths:

- a new full tree
- a tree update that waits for a tree, or that the tree already holds
- a change list without an earlier one

After such an event, each open page reads its file or diff again. The
store collects the changes of one message: a history page, or one live
event. Then it applies them once.

The workspace can refuse an update of a file list. After such a first
loss, it asks the runner for a fresh full report of that list, and the
screens show nothing. When the workspace refuses that report too, the
repair failed.
[Lost workspace updates](../../docs/protocol/chat-and-events.md#lost-workspace-updates)
gives the rules. `FilesSnapshot.failedRepairs` holds the failed repairs of
the two lists:

- The key is `files.snapshot` for All files, or `changes.updated` for
  Changes. The value is the time of the first failed repair since the last
  full report of that list, in Unix milliseconds.
- Only a marker with `repairFailed: true` and no session adds a failed
  repair. A first loss adds nothing. The chat owns the markers of a session.
- Only a later full report of the same list in the stream clears it. A
  tree delta and a report of the other list clear nothing.
  [Files and changes](../../docs/protocol/workspaces-and-sandboxes.md#files-and-changes)
  says which reports replace a list.
- A reply of a route clears nothing, also the read of the tree after a gap
  in the revisions. Only the order of the stream shows that a report is
  newer than the failure.
- A further failure of a failed list keeps the time of the first one.
- The store reads the failures from the same stream as the file events, in
  event order, and keeps them in memory. A new subscription after a gap
  keeps them. A new store reads the stored history of the workspace from
  its first event, so a new tab shows them too.

The workspace screen shows the failed repairs of the name and the start
steps below its header, as [the workspace screen](../shell/workspace/README.md)
says.

The cloud computer can fail to read the files of the branch. The workspace
then marks the tree, until the runner sends a full tree again.
`FilesSnapshot.treeUnavailable` holds the mark:

- A `files.unavailable` event of the stream sets it. The tree stays as it
  is, because only the newest tree is unknown.
- A reply of the tree route with `unavailable: true` sets it too. Its tree
  is the saved tree, or an empty tree at revision 0 when none was saved.
- Only a full tree of the stream clears it. A tree update and a reply of
  the route clear nothing, because a reply can be older than the mark.
- The parsers keep only the value true, and they refuse nothing new.

With a saved tree, All files shows it, and the notice "The latest list of
all files is unavailable" shows under the lists, with no age. With no tree
to show, All files says "The list of all files is unavailable" in place of
an empty list. That state shows also while the first read of the tree
waits, or after it failed.

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
  `Date.now`.
- `FilePage` shows one file tab. Markdown starts rendered, and its view
  switch navigates to the same tab with the other mode.
- `DiffPage` shows the diff of one changed file.
- `FileTabItem` is the closable tab of a file or a diff, as a list item
  for the tab row of the centre column on desktop. `onClose` asks the shell
  to close the tab. It takes the tab styles of the mockups' `WorkspaceTabs`,
  as the session tabs do. `item` takes more props of its list item, and
  `close` props of the wrapper of its Close button, such as the handlers,
  the classes, and the ref of the drag of the row. They are plain element
  props, so the Files code imports nothing from the chat.
  `LiftedFileTab` is the copy of the tab that a drag lifts above the page:
  its icon and its whole file name, with no link and no Close.

A module worker parses the Markdown of a preview: its blocks, its inline
content, and its link references. Vite bundles the worker, so the shell
injects nothing for it. The worker loads from the origin of the app, so a
Content-Security-Policy of the app must allow `worker-src 'self'`. Until
the first parse arrives, the preview shows that the file opens. A new
version of the file keeps the last rendered version on screen until its
own parse arrives.

When no worker can start or parse, the preview shows that the file didn't
open, with Try again, as a failed read does. Try again parses the text in
a new worker. A static render, as in a test, cannot wait for a worker. It
passes `parseMarkdown` as `markdownParser` of `FileContent`, or as
`parser` of `MarkdownView`, and the parse runs on the calling thread.

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

## Safety

File content, Markdown, paths, and diffs are untrusted. The screens show
them as React text only. The Markdown renderer builds React elements from
its own parse: HTML in a file shows as text, images show their alt text,
and only absolute `http`, `https`, and `mailto` links become links. A link
opens in a new tab with `noopener noreferrer`. Quotes and lists nest at
most 16 levels deep, and deeper content shows as text. The parse runs in
the worker, off the thread of the page, so a long or crafted file cannot
stop the page.

Emphasis and strong emphasis pair their `*` and `_` markers by the
CommonMark rules. A marker in the text of a link, an image, or a
strikethrough pairs only inside that text. Code spans and link addresses
do not supply markers. The parser keeps escaped `*` and `_` characters as
text. Emphasis, strong emphasis, strikethrough, and links nest at most 12
levels deep. Deeper emphasis markers show as text. Deeper links, images,
and strikethrough show their source as text.

A run of more than 256 characters without a space renders as adjacent
text nodes that end between whole graphemes. The text and its lines stay
the same, and the browser lays the run out in linear time. Text with
spaces stays one text node. The part length is a rendering detail, not a
read limit.

A table row with fewer cells than its header gets empty cells. All tables
of one file, also in quotes and lists, add at most 65,536 empty cells.
The row that would pass that count ends its table. From that row on, the
rest of the file shows as text, as typed: with its line breaks, and with
no Markdown. Each file starts with the whole count, so its cells stay in
proportion to its size.

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

Then open `http://127.0.0.1:5173/src/files/dev.html`. The address holds the
state of the page:

| Parameter  | Values                                                        |
| ---------- | ------------------------------------------------------------- |
| `layout`   | `desktop`, or `phone`                                         |
| `theme`    | `dark`, or `light`                                            |
| `list`     | `all`, `changes`, or `checks`                                 |
| `tab`      | `file:preview:<path>`, `file:source:<path>`, or `diff:<path>` |
| `scenario` | `mockup`, the mockup data, or `live`, which replays the updates |
| `repair`   | `all-files`, `changes`, or both, as `all-files,changes`: the failed repairs of the stored history |
| `tree`     | `saved`, or `none`: the cloud computer could not read the files, and All files keeps the saved tree, or no tree was saved |
| `controls` | `off` hides the development controls                         |

For example, `?list=changes&tab=diff:src/app/checkout/AddressForm.tsx`
draws the diff of the mockups. `public/hero.png` is binary, with a binary
diff at `?tab=diff:public/hero.png`. `public/catalog.json` is over the
sample read limit, and
`src/app/checkout/page.tsx` fails to read. `?tab=file:preview:README.md`
parses its Markdown in the module worker, as the app does. The fixtures
serve each file on its content and download routes with one sample limit,
as the Worker does. Download saves the reply of the fake API, through
`dev/dev-targets.ts`. The controls play
the recorded updates, edit the open file, and switch the layout, the
theme, and the data. The product build does not include the page.

`?list=changes&repair=all-files,changes` draws the notice of each list
under the lists. The clock of the page stands still at `FAKE_TIME`, so
each stored age stays as drawn. For All files and for Changes, the
controls also have these buttons:

- "Lose an update" sends the marker of a first loss, and nothing shows.
- "Lose its fresh report" sends the marker of a failed repair, and the
  notice shows.
- "Send a full report" sends a full report of the list, which clears its
  notice only.
- "Send a tree update", for All files only, sends a tree delta, which
  leaves the notice.
- "Fail a read of the files", for All files only, sends the mark of a
  failed read. "Send a full report" clears it.

`?tree=saved` and `?tree=none` store the mark in the history, and the tree
route marks its tree, as the Worker does. Use them with the mockup data.

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
- `markdown/markdown-worker.ts` and `markdown/worker-parse.ts`: the module
  worker that runs the parse, and its start from the view, which ends it.
- `markdown/MarkdownView.tsx`: the safe renderer of a parsed document.
  `parser` replaces the worker for a static render.
- `code/`: the syntax colours and the code view.
- `diff/`: the unified diff parser and view.
- `dev/`: the development page, its Vite config, its fixtures, its Copy
  and Download targets, `RepairControls`, the controls of the failed
  repairs and of a failed read, and `dev-unread.ts`, the stored state of
  `?tree=`.

See [the shared contracts](../shared/README.md) for the file routes, the
events, and the workspace view.
