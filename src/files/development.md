# Files development page

This guide belongs to [the Files screens](README.md). It gives the state
that the address of the development page holds, its samples, and its
controls. [Development](README.md#development) gives the command that
runs the page.

The address holds the state of the page:

| Parameter  | Values                                                        |
| ---------- | ------------------------------------------------------------- |
| `layout`   | `desktop`, or `phone`                                         |
| `theme`    | `dark`, or `light`                                            |
| `list`     | `all`, `changes`, or `checks`                                 |
| `tab`      | `file:preview:<path>`, `file:source:<path>`, or `diff:<path>` |
| `scenario` | `mockup`, the mockup data, or `live`, which includes the recorded updates |
| `repair`   | `all-files`, `changes`, or both, as `all-files,changes`, with failed repairs from the list reads |
| `tree`     | `saved`, or `none`: the cloud computer could not read the files, and All files keeps the saved tree, or no tree was saved |
| `lists`    | `limited`: the lists of a large branch, whose reports leave out entries |
| `preview`  | What the Preview of an HTML file shows: `page`, the default, or `opening`, `failed`, or `older-software` |
| `controls` | `off` hides the development controls                         |

For example, `?list=changes&tab=diff:src/app/checkout/AddressForm.tsx`
draws the diff of the mockups. `public/hero.png` shows a picture of 1 × 1
pixel in its file tab, with a binary diff at `?tab=diff:public/hero.png`.
`public/catalog.json` is over the sample read limit, and
`src/app/checkout/page.tsx` fails to read. `?tab=file:preview:README.md`
parses its Markdown in the module worker, as the app does. The README
follows the README of the mockups at `app/files/markdown`, with its web
picture and its task list. The page has
no workspace screen, so each link of the preview opens a new tab, also a
link of the app. The fixtures
serve each file on its content and download routes with one sample limit,
as the Worker does. Download saves the reply of the fake API, through
`dev/dev-targets.ts`. The controls play
the recorded updates, edit the open file, and switch the layout, the
theme, and the data. The product build does not include the page.

The fake list routes give the cutoff of the current workspace history.
The mockup routes start with the sample lists. The live routes give the
lists after the recorded updates. Both include the failed repairs at the
cutoff. The stream starts after the list reads, as it does in the app.

`?tab=file:preview:.context/report.html` shows the page of an HTML report
with a style file, as `app/files/html` of the mockups draws it.
`?tab=file:source:.context/report.html` shows its source. The fake API
serves no preview domain, so the page stands in for the files preview of
the shell with `dev/dev-html-preview.tsx`: the frame loads the stub page
`dev/pages/report.html`, which loads `report.css` beside it, from the
development server. The file routes serve the same texts, so Source shows
what the frame shows. The controls under "HTML preview" show each state of
the Preview: the page, the wait of its open, a failed open with Try
again, and the notice of older software. Reload loads the stub again, and
Try again shows the page. The product build does not include `dev/pages/`.

The page keeps its open tabs in memory, with no saved view. So each tab
that a press opens stays open, and the page draws no temporary tab. The
app opens a press in the temporary tab, as
[Temporary tabs](../../docs/protocol/temporary-tabs.md) says. Run
`npm run dev` to see it.

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

`?tree=saved` and `?tree=none` store the mark in the history. The tree
read gives the marked saved tree or the marked empty tree together with
its cutoff. Use these settings with the mockup data.

`?lists=limited` serves the lists of `app/files/limited` and
`app/files/changes/limited` of the mockups, as a new runner reports a
branch that passes the limits of its reports. All files lists 50,000
entries and leaves out 18,412, such as `tsconfig.json`, whose file tab
still reads the file. Changes lists 1,000 files and leaves out 1,243. The
report lists its files in path order, as a new runner sends them.
`test-support/limited-file-lists.ts` builds both lists. Use it
with the mockup data. With `?tree=saved` or `?repair=changes`, a limited
list shows its notice beside the notice of that state.
