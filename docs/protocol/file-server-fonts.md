# File server fonts

This doc holds the requirements and the decisions in force for the system
fonts that the [file server](file-server.md) serves, the font stylesheet,
and its link in each HTML page. The terms are those of
[File server](file-server.md#terms) and of
[HTML file preview](html-file-preview.md#terms). A sandbox files decision
number names a decision of the change that shows agent pages with their
files and fonts, as [Files of an HTML page](html-page-files.md) says.

## System fonts

- A request whose path the repository refuses or does not have, and whose
  path starts with the segments `/usr/share/fonts/` or
  `/usr/local/share/fonts/`, gets that system font.
- The file must be a regular file with the extension `.ttf`, `.otf`,
  `.woff`, or `.woff2`, in any case.
- Its real path, after links, must start with the segments of one of the
  two folders. The compare uses the two folder paths as written, not their
  real paths. So a font folder that is a link into the home folder serves
  nothing.
- No segment of the path in the request can start with a dot. No segment
  of the real path can start with a dot either.
- The reply of a system font is not a changed reply. So it gets each rule
  of a reply for a file, such as the rules of its `ETag`, its dates, and its
  byte ranges.

## The font stylesheet

- `/__conductive/system-fonts.css` serves the font stylesheet. A
  repository file at that path wins. Reason: a repository with that path is
  unlikely, and its own file then loads.
- The font stylesheet has `@font-face` rules for each `.ttf` and `.otf`
  system font that the file server serves. A `.woff` or `.woff2` font loads
  by its path, but it gets no rule.
- Each face gets one rule for each of its distinct family names. These are
  the typographic family and the family of the font file, in each language.
  So a page that names "Lato Black" gets the face that the cloud computer
  gives that name.
- A rule gives the family, the weight, the style, the width, and the
  address of the font. A variable font gives its weight and width ranges.
- A broken font gets no rule, and the other rules stay. A font is broken
  when it lacks a table that browsers require: `maxp`, `head`, `OS/2`,
  `cmap`, `hhea`, `hmtx`, `name`, or `post`. It is also broken when it has
  no glyph data: `glyf` with `loca`, `CFF `, `CFF2`, `CBDT` with `CBLC`,
  or `EBDT` with `EBLC`.
- The runner reads only the small tables `head`, `hhea`, `maxp`, `name`,
  `OS/2`, and `fvar`. A font whose `head`, `hhea`, or `maxp` does not parse
  gets no rule. So does a font whose `hmtx` or `loca` is too short for the
  counts in those tables. A font whose `name`, `OS/2`, or `fvar` table
  passes a fixed size also gets no rule.
- The browser checks the contents of the large tables. Risk: a font with
  bad glyph data can still get a rule, and the browser then uses the next
  family.
- A family name that is empty, or longer than a fixed length, gets no rule.
- Each address percent-encodes each segment of the font path, so `#`, `?`,
  `%`, and spaces keep their meaning. Each address and each family name is
  a CSS string, as the
  [serialize a string](https://drafts.csswg.org/cssom/#serialize-a-string)
  steps of CSSOM write it.
- Each request of the font stylesheet reads the system fonts as they are
  then. So a font that a setup script installs shows at the next load of
  the page.
- The reply carries `text/css; charset=utf-8`, `Cache-Control: no-cache`,
  and `Accept-Ranges: none`. It ignores `Range`, and it gives the whole
  stylesheet with HTTP 200.
- Its `ETag` is a digest of its text. It answers 304 only when
  `If-None-Match` matches that `ETag`. A `HEAD` request gets the headers of
  `GET`.

## The font stylesheet link

- The file server adds a `<link>` element to the start of each HTML reply.
  Its address is the font stylesheet on the preview origin, or the path of
  the font stylesheet alone without a preview origin.
  It loads the font stylesheet before each style of the page. So a family
  that the page names, such as C059, loads from the cloud computer.
- The page's own `@font-face` rules come later. So a page face wins over a
  system face with the same family, weight, width, and style, for each
  character that the page face has.
- In each other case, the font matching of the browser picks the face, and
  it can pick a system face. Example: a page that defines only a regular
  face of a family shows the system bold face of that family for bold
  text. The cloud computer shows the regular page face made bold.
- The system faces stay in the families that the page defines. Adding them
  only to the families that the page does not define was not chosen.
  Reason: the member chose to keep the font matching of the browser, and
  the other way needs a script in each page that registers the fonts and
  follows styles that load later.
- The file server reads the start of the page as the HTML tokenizer does:
  - It skips a UTF-8 byte order mark, ASCII whitespace, and comments, with
    each comment end that the tokenizer accepts, such as `<!-->` and
    `--!>`.
  - It skips bogus comments, such as an `<?xml ...?>` line. A bogus comment
    is `<?...>`, a `<!...>` that is not a doctype or a comment, or `</`
    before a character that is not a letter.
  - It matches the doctype keyword in any case. The doctype ends at its
    first `>`.
- The `<link>` goes after the doctype. When a tag or text comes before any
  doctype, the `<link>` goes before it, after the byte order mark.
- Reason: a tag before the doctype puts the page in quirks mode. A `Link`
  header was not chosen, because only Firefox applies it.
- The page gets no `<link>` in these cases:
  - The font stylesheet has no rule.
  - The scan reaches 8 KiB, or it meets an item that it cannot classify.
  - The page starts with a UTF-16 byte order mark. Its text then does not
    change at all. Reason: the browser reads such a page as UTF-16, and an
    ASCII `<link>` breaks it.
- Risk: the browser drops the attributes of the page's own `<head>`
  element. The font stylesheet becomes `document.styleSheets[0]`.
