# Files screens

The Files screens show the files of a workspace branch. All files is a
tree of every file. Changes lists the files that the branch changes
against the base branch, under the totals of the change. A file opens as a
page with rendered Markdown or text with line numbers and syntax colours.
A changed file opens its unified diff. The requirements are in
[Files and changes](../../docs/protocol/workspaces-and-sandboxes.md#files-and-changes).
The visual spec is the `app/files` page of the
[mockup catalogue](../../docs/mockups/README.md).

The screens render data from the Worker only. They build against the fake
API of [the browser fakes](../test-support/README.md) until the shell wires
them, in Milestone 15i of the plan.

## Integration

The shell creates one `WorkspaceFiles` store for each open workspace. It
injects the fetch of the app and the subscription of its workspace event
socket:

```ts
const files = new WorkspaceFiles({
  client: createFilesClient({ fetch, orgId, workspaceId }),
  subscribe: (afterEventNumber, listener) =>
    socket.subscribe(afterEventNumber, listener),
})
files.start() // when the workspace mounts
files.stop() // when it unmounts
```

The first message of the subscription holds the stored history, and the
store reads each message from `unknown`. The store reads the tree and the
changes routes, then applies the file events of the stream in event order.
It skips an event that it already has. After a gap in the event numbers,
it subscribes again from its last event number. After a gap in the tree
revisions, it reads the tree route again.

The shell owns the workspace view on the Worker: the open tabs, the
active tab, and the list. It passes them to the screens, with a
`FilesNavigation`:

- `href(target)` gives the address of a list, a file tab, or a diff tab.
- `navigate(target)` handles a plain click. The shell updates the view
  and its address. A click with a modifier key opens the address in a new
  browser tab.

The screens:

- `FilesPanel` shows the All files, Changes, and Checks tabs and lists,
  for the right column on desktop and the Files tab on a phone. The
  `checks` prop takes the Checks list of the GitHub banner screens. The
  `placeholder` prop replaces All files and Changes, for example with a
  sandbox state.
- `FilePage` shows one file tab. Markdown starts rendered, and its view
  switch navigates to the same tab with the other mode.
- `DiffPage` shows the diff of one changed file.
- `FileTabItem` is the closable tab of a file or a diff, as a list item
  for the tab row of the centre column on desktop. `onClose` asks the shell
  to close the tab.

Each screen takes `layout`: `desktop`, or `phone` with touch targets of at
least 44 px. On a phone, a file page and a diff page link back to All
files or Changes.

Copy and Download take `targets`. The default, `browserTargets`, copies
the original text with the clipboard of the browser. Its Download links to
the download route of the client, `downloadHref(path)`, so the browser
reads the route with the session cookie and streams the file to disk. The
development page and the tests inject `fetchedDownload`, which reads the
route through the injected fetch and saves the file from memory, because
the fake API serves no route that the browser can read. Pass the same
`targets` object on each render, because a new object starts new Copy and
Download states.

The shell supplies the design tokens as `--ui-*` CSS variables and the
`@firna/ui` theme provider, as `docs/mockups/src/theme.ts` builds them.

## Safety

File content, Markdown, paths, and diffs are untrusted. The screens show
them as React text only. The Markdown renderer builds React elements from
its own parse: HTML in a file shows as text, images show their alt text,
and only absolute `http`, `https`, and `mailto` links become links. A link
opens in a new tab with `noopener noreferrer`. Quotes and lists nest at
most 16 levels deep, and deeper content shows as text.

The screens set no limits of their own. A file over the read limit shows
the size and the limit that the backend sends, with Download.

## Development

The development page runs the screens against `FakeApiServer`, with the
mockup samples. From the repository root:

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
| `controls` | `off` hides the development controls                         |

For example, `?list=changes&tab=diff:src/app/checkout/AddressForm.tsx`
draws the diff of the mockups. `public/hero.png` is binary,
`public/catalog.json` is over the sample read limit, and
`src/app/checkout/page.tsx` fails to read. Download saves the reply of the
fake API, through `dev/dev-targets.ts`. The controls play the recorded
updates, edit the open file, and switch the layout, the theme, and the
data. The product build does not include the page.

Run the tests with `npm run test -- src/files`.

## Key code

- `model/files-store.ts`: `WorkspaceFiles`, the live tree and changes of a
  workspace, and `versionOf`, which grows when an event touches a path.
- `model/files-sync.ts`: the merge rules of the routes and the stream.
- `model/resource-loader.ts` and `model/follow-path.ts`: the read of one
  file or diff, which drops stale replies and reads again after an event.
- `api/files-client.ts`: `createFilesClient`, the file routes, with their
  errors as `FilesError`, and the download address of a path.
- `page/file-actions.ts`: Copy and Download, with `browserTargets`.
  `page/fetched-download.ts` is the download of the development page and
  the tests.
- `api/parse-tree.ts`, `api/parse-changes.ts`, and `api/parse-events.ts`:
  the parsers of the route bodies and the stream messages.
- `navigation.ts`: `FilesTarget`, `FilesNavigation`, and the tab types of
  the workspace view.
- `panel/FilesPanel.tsx`, `page/FilePage.tsx`, `page/DiffPage.tsx`, and
  `tabs/FileTabItem.tsx`: the screens.
- `markdown/`: the safe Markdown parser and renderer.
- `code/`: the syntax colours and the code view.
- `diff/`: the unified diff parser and view.
- `dev/`: the development page, its Vite config, its fixtures, and its
  Copy and Download targets.

See [the shared contracts](../shared/README.md) for the file routes, the
events, and the workspace view.
