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
| `scenario` | `mockup`, the mockup data, or `live`, which replays the updates |
| `repair`   | `all-files`, `changes`, or both, as `all-files,changes`: the failed repairs of the stored history |
| `tree`     | `saved`, or `none`: the cloud computer could not read the files, and All files keeps the saved tree, or no tree was saved |
| `controls` | `off` hides the development controls                         |

For example, `?list=changes&tab=diff:src/app/checkout/AddressForm.tsx`
draws the diff of the mockups. `public/hero.png` shows a picture of 1 × 1
pixel in its file tab, with a binary diff at `?tab=diff:public/hero.png`.
`public/catalog.json` is over the sample read limit, and
`src/app/checkout/page.tsx` fails to read. `?tab=file:preview:README.md`
parses its Markdown in the module worker, as the app does. The page has
no workspace screen, so each link of the preview opens a new tab, also a
link of the app. The fixtures
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
