# The page of an HTML file

This guide belongs to [the Files screens](README.md). It gives the tab of
an HTML file, a name that ends with `.html` or `.htm` in any case, as
[HTML file preview](../../docs/protocol/html-file-preview.md) says.

The tab of an HTML file has the switch of a Markdown tab, and it starts in
Preview. A tab that opens at lines shows Source, as the address names it.
Source shows the text with line numbers and the syntax colours of HTML.
Preview shows the page, as `app/files/html` of the mockups draws it.

- The shell gives the page through the `htmlPreview` prop, as it gives
  the row menu and the placeholder. Its type, `HtmlPreview` of
  `page/html-preview.ts`, holds the `view` to draw, the `open` link, a
  `reload`, and a stable `show`. The page calls `show` from a layout
  effect while it shows the Preview of the file, and the result when it
  stops. So the shell opens the files preview only while the page shows
  it, and the Files code sends no preview request.
- The view is the wait, the page in its frame, a failed open, or the
  notice of older software. `page/HtmlPagePreview.tsx` draws each one with
  the shared parts and words: the look of the launch page with
  the logo tile and "Opening preview", the failure of a Preview tab with
  Try again, and the notice of `htmlPreviewCopy` with no button.
- The header keeps Download and Copy. While the page opens or shows, it
  adds Reload and the `open` link before Copy. A narrow page, such as a
  phone, moves them to a second line of the header, at its end.
- The page renders the `frame` of a `page` view only while it shows that
  view. So a frame starts only for a file whose page may show, never for
  Source, a dot file, or a label that hides a secret value or is not known
  yet.
- With `kept`, the `frame` of a `page` view draws nothing in place: it puts
  the page into the frames that the shell keeps under the page, loaded
  while another tab shows. The page still renders it, and keeps only its
  header, so the kept frame gets the room.
- The page has no read limit. The page still reads the file for Copy,
  Download, and Source. A read that finds no file shows its error in place
  of the page, and every other read keeps the page.
- A label that hides a secret value, or that no record gives yet, shows
  the source with no switch, and never the page: the address of the page
  holds the real path, as `tabHidesSecret` of `model/file-labels.ts` says.
- A dot file, an HTML file whose own name starts with a dot, shows the
  source with no switch, and never the page, because the files preview
  serves no dot file. `showsAsPage` of `code/file-kind.ts` gives the rule.
- Without `htmlPreview`, an HTML file shows its source with no switch.

[The tabs of HTML files](../shell/workspace/html-tabs.md) gives how the
shell opens and keeps the files preview. `page/HtmlPreview.mounted.test.tsx`
and `page/HtmlPageStates.mounted.test.tsx` check the page with a preview
that stands in for the shell.
