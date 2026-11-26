# Files key code

This guide belongs to [the Files screens](README.md). It names the files,
the types, and the functions of the Files screens that a reader opens
first. Each path is relative to `src/files/`, the folder of this guide.

- `model/files-store.ts`: `WorkspaceFiles`, the live tree and changes of a
  workspace with their failed repairs, and `versionOf`, which grows when an
  event may change the file or the diff of a path.
- `model/files-snapshot.ts`: `FilesSnapshot`, what the screens read from
  the store, with the label of each read in `readLabels`.
- `model/files-sync.ts`: the merge rules of the routes and the stream.
- `model/tree-model.ts`: `FileTree`, the tree with its omitted count, and
  `applyTreeDelta`, which applies one tree update.
- `../ui/components/files/changeTotals.ts`: `wholeChange`, the totals that
  the summary and the tab of Changes show, and `noChanges`, the rule of its
  empty state. The mockups share both.
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
- `model/file-labels.ts`: `pathLabel`, `pageLabel`, and `tabLabel`, the
  label that a screen shows for a real path, and `hidesSecret` and
  `tabHidesSecret`, the shared check of a label that hides a secret value.
- `panel/FilesPanel.tsx`, `page/FilePage.tsx`, `page/DiffPage.tsx`, and
  `tabs/FileTabItem.tsx`: the screens.
- `page/file-view.ts`: `fileView`, what a file page shows of one read:
  the picture of an image file that holds bytes, with a `data:` address
  of those bytes, or, for each other file, the text or the binary mark of
  `fileText` in `model/file-text.ts`.
- `page/picture-reads.ts`: `createPictureReads`, a picture reader for one
  open chat, and its `ChatPictures` and `PictureRead` types. It shares
  file reads, limits them to two at once, and keeps each path's result.
  Its unit tests cover queue order, cached results, failures, and aborts.
- `page/FileBody.tsx`: `FileContent`, the body of a file page. It draws
  a picture through the shared `ImageView`, named by the file name of
  the label of its path. `page/decode-picture.ts` gives `decodePicture`,
  which loads a picture apart from the page to learn its size, or finds
  that the browser cannot draw it.
- `panel/useRowMenu.tsx`: `useRowMenu`, the row menu of a list, and its
  drawing at a point or in a sheet. `panel/row-menu.ts` gives the types of
  the `rowMenu` prop and the groups of its entries.
- `panel/UnavailableLists.tsx`: the notices of the failed repairs under
  the lists, with the shared `LostUpdateRow` and their ages, and the
  notice of a saved tree that the cloud computer could not read.
- `markdown/markdown-document.ts`: `MarkdownDocument`, a parsed Markdown
  file: its blocks, their inline content, and the task box of each list
  item. The worker posts it to the page.
- `markdown/preview-blocks.ts`: `previewDocument`, the preview adapter of
  the shared parser of `../markdown/parser.ts`, which the chat uses too.
  It turns the tokens of a file into a `MarkdownDocument`, with the parts
  that it shares with the chat: the depth limit of lists and quotes,
  `maxDepth` of the parser, and the source lines of a deeper list or quote
  from `../markdown/token-read.ts`. It reads the task box at the start of a
  list item with `readTaskBox` of `../markdown/task-boxes.ts`, which the
  chat shares.
- `markdown/preview-inline.ts`: `previewInline`, the inline content of one
  block, with the link rule of the preview, the alt text of each image, as
  a link at an `http` or `https` address, and the line breaks of
  `../markdown/kept-breaks.ts`, which the chat shares. The parser limits
  marks, links, and images to 12 levels, with
  `../markdown/inline-depth.ts`.
- `markdown/preview-tables.ts`: `previewTable`, which reads one table of a
  file with `readTableTokens` of `../markdown/table-tokens.ts`, and
  `TableBudget`, the empty cells that the tables of one file may add.
  `../markdown/table-rows.ts` holds the shared table types.
- `markdown/markdown-worker.ts` and `markdown/worker-parse.ts`: the module
  worker that runs the parse, and its start from the view, which ends it.
- `markdown/MarkdownView.tsx`: the safe renderer of a parsed document.
  `parser` replaces the worker for a static render. It draws each table
  through the shared `MarkdownTable`, with the margin of
  its `.table` class. Its headings take their look from the shared
  `MarkdownHeadings.module.css`, and its quotes, rules,
  bold text, emphasis, strikethrough, and task boxes from the shared
  `MarkdownProse.module.css`. Chat answers use both modules too. Its own
  CSS sets only their margins. It draws each list item with `MarkdownItem`
  of `../markdown/MarkdownItem.tsx`, which chat answers share.
- `markdown/inline-render.tsx`: `inlineNodes`, the inline content of a
  block as React elements. It draws each link with the shared `TextLink`
  through the link opener of the app shell.
- `code/`: the syntax colours and the code view. `code/file-kind.ts` gives
  `fileKind`, the kind of a file by its name: Markdown, code, or another
  file. A file is code when the code view gives it syntax colours. It also
  gives `isMarkdown` and `isHtml`, the files whose tab has a Preview. An
  HTML file keeps the kind and the icon of code.
  `panel/file-icons.tsx` draws the icon of each kind through the shared
  `EntryIcon`, the one icon map of All files, the tabs, the list of `@`,
  and the file chips.
- `page/html-preview.ts` and `page/HtmlPagePreview.tsx`: the
  `htmlPreview` prop of `FilePage`, and the drawing of its views and of
  Reload and Open.
- `diff/`: the unified diff parser and view. `diff/highlight-diff.ts`
  colours each diff line from the whole old or new file of the diff
  reply, so a line inside a comment that opens above its hunk keeps its
  colour. A line that does not match its file line takes its colours from
  the diff text alone, side by side, and each hunk starts again in code.
- `dev/`: the development page, its Vite config, its fixtures, its Copy
  and Download targets, `RepairControls`, the controls of the failed
  repairs and of a failed read, and `dev-unread.ts`, the stored state of
  `?tree=`.
