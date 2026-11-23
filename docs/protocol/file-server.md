# File server

This doc holds the requirements and the decisions in force for the file
server of the agent runner, which serves the page of an HTML file and the
files that it loads. It belongs to [HTML file preview](html-file-preview.md),
which covers the tab of an HTML file, the files preview, and
[the files that a page can load](html-page-files.md).
The other terms are those of [HTML file preview](html-file-preview.md#terms)
and of the [architecture doc](../architecture.md#terms). A decision number
names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. A sandbox
files decision number names a decision of the change that shows agent
pages with their files and fonts, as
[Files of an HTML page](html-page-files.md)
says.

## Terms

- **Changed reply:** a reply with an HTML, CSS, or SVG file, by the table
  of content types. Its body can differ from the file, as
  [Local file addresses](#local-file-addresses) and
  [The font stylesheet link](file-server-fonts.md#the-font-stylesheet-link) say.
- **Font stylesheet:** the stylesheet at `/__conductive/system-fonts.css`,
  with the rules of the system fonts, as
  [The font stylesheet](file-server-fonts.md#the-font-stylesheet) says.
- **Preview origin:** the origin of the files preview, such as
  `https://<label>.conductive.page`, as
  [The preview origin](#the-preview-origin) says.

## Requirements

- The file server serves the current repository folder of the workspace.
  After a [repository change](repository-change.md), each later request
  reads the files of the new folder.
- The file server also serves the system fonts and the font stylesheet
  (sandbox files decision 1 D).
- The file server listens only on `127.0.0.1:7683`. It takes no
  connection from another address.
- The sandbox keeps port 7683 for the file server.
  [Listening ports](listening-ports.md) leaves it out of the ports report,
  as it leaves out each other port of the app's own services. When another
  program holds the port, the runner warns and announces no file server.
- The file server answers only `GET` and `HEAD`, and each other method
  gets 405. A request with an `Upgrade` header gets 400, because the file
  server upgrades no connection.
- The file server answers HTTP 403 to each request whose `Host` is neither
  `localhost:7683` nor `127.0.0.1:7683`, as the preview relay does for a
  foreign `Host`. Reason: a check of `Host` stops
  DNS rebinding from a browser in the cloud computer, as dev servers do.
- The file server answers only a request with the files mark. Each other
  request gets 403. Reason: a member or an agent can open a port preview
  of any port, also of port 7683.
- The path of a request names a file by its path from the top of the
  repository, with each segment percent-decoded. The file server ignores
  the query. A segment that is not valid percent-encoding, or that decodes
  to a `/`, a NUL, or text that is not UTF-8, gets 404.
- The repository refuses each path that the file read of a file tab
  refuses. Examples are a path in `.git` and a link that leaves the folder.
  The repository also refuses a dot file, and a link whose target is a dot
  file.
- A path that the repository refuses or does not have gets 404. The
  exceptions are the paths that
  [The repository folder path](#the-repository-folder-path),
  [System fonts](file-server-fonts.md#system-fonts), and
  [The font stylesheet](file-server-fonts.md#the-font-stylesheet) serve.
- A folder path that ends with `/` serves the `index.html` of the folder.
  A folder path without the `/` redirects to the same path with it, so
  that relative addresses work. A folder without `index.html` gets 404. No
  reply lists a folder.
- The content type of a file comes from its extension, in any case, from a
  fixed table of web file types: HTML, CSS, JavaScript, JSON, SVG, PNG, JPEG, GIF, WebP,
  AVIF, ICO, WOFF, WOFF2, TTF, OTF, WASM, MP4, WebM, MP3, WAV, plain text,
  Markdown, XML, PDF, and source maps. `.js` and `.mjs` are JavaScript.
- Each text type carries `charset=utf-8`. Every other file is
  `application/octet-stream`. Reason: with `nosniff`, a browser runs a
  script or a style only with its correct type.
- Each reply carries `Cache-Control: no-cache`. So a reload shows the
  newest file at a low cost. `no-store` was rejected, because each reload
  then loads each file of the page in full.
- Each reply for a file carries `Last-Modified` and an `ETag`.
- Each reply for a file, except a changed reply, carries the `ETag` of the
  file. So each such reply for one version of a file carries the same
  `ETag`, also a range, a `HEAD` reply, and a 304. A changed reply carries
  its own `ETag`, as [Changed replies](#changed-replies) says.
- The `ETag` of a file changes with each change of the file, also within
  one second. It also changes when a new file takes the place of the file,
  or when a tool sets its modification time back.
- A request with `If-None-Match` gets 304 when that header matches the
  current `ETag` of its reply, as
  [RFC 9110](https://www.rfc-editor.org/rfc/rfc9110#section-13.1.2)
  defines the match. When a request has `If-None-Match`, the file server
  ignores `If-Modified-Since`.
- A request with `If-Modified-Since` and no `If-None-Match` gets 304 when
  the full modification time of the file is not after that date. Else the
  date has no effect. Reason: a date has only whole seconds, so a change
  later in the same second must still reach the browser. This rule does
  not hold for a changed reply or for the font stylesheet.
- The file server streams each file, with no size limit.
- A request for one byte range gets that range. A request for several
  ranges gets the whole file. A range that the file cannot satisfy gets
  HTTP 416. Reason: Safari plays a video only with byte ranges. These
  range rules do not hold for a changed reply or for the font stylesheet.
- A range request with `If-Range` gets its range only when that header is
  a date equal to the current `Last-Modified` of the file. Else it gets
  the whole file with HTTP 200, also in place of a 416. An entity tag in
  `If-Range` never matches, also when it is the current `ETag` of the
  file. Reason: a browser that asks for a missing part of a stored file
  must never join bytes of two versions of the file.
- The file server writes no request path to a log, because a path can hold
  a secret value.
- The runner announces its file server in its `hello`, as
  [The agent runner](agent-runner.md#the-agent-runner) says. An older
  runner gets the file server with an update of its software, as
  [Updates](sandbox-software.md#updates) says.

## Local file addresses

- In the body of each changed reply, the file server changes each local
  `file:` address to a full address on the preview origin: the preview
  origin, then the absolute path of the file. So the browser asks the files
  preview for that path, also on a page whose `<base>` names another site
  (sandbox files decision 2 B).
- Without a preview origin, the file server changes no `file:` address.
  Reason: a path alone can reach another site, through a `<base>` of the
  page or through text that the browser decodes into a second separator.
  The browser then blocks each `file:` address, as it did before this
  change.
- A separator is `/` or `\`, because a browser reads `\` as `/` in a
  `file:` address.
- A match is `file:` in any case, then two equal separators, an optional
  `localhost` in any case, and one or more separators. The match and each
  separator after it become one `/`. Reason: `file:////home/x` must become
  `/home/x`, because a browser sends `//home/x` to the host `home`.
- `file:` and one separator before a character that is not the same
  separator also becomes one `/`, with each separator after it. Reason:
  Java writes file addresses in this form, such as `file:/home/x`.
- So the path of a changed address never starts with two separators.
- A match needs the start of a word: the byte before `file:` is not an
  ASCII letter, an ASCII digit, `+`, `-`, or `.`.
- A `file://` address with another host, such as `file://server/x`, does
  not change.
- A match changes only when the path after its separators starts, by
  whole segments, with a served folder: the repository folder of the
  request, `/usr/share/fonts`, or `/usr/local/share/fonts`. A separator
  run between the segments also counts, so a JSON-escaped address such as
  `file:\/\/\/home\/user\/repo\/x` changes too. Each other `file:` text
  keeps its bytes.
- Reason: only a file in a served folder can load. Text such as the
  JavaScript `{file:/[.]pdf$/}` or `/^file:/i` names no served folder, so
  the file server keeps it, and the script still runs.
- The `ETag` of a changed reply also covers the repository folder, because
  the folder decides which addresses change.
- The change covers the whole body: attributes, `srcset`, styles, inline
  scripts, comments, and text. Reason: one text rule covers each place of
  an address, with no parser of HTML or CSS.
- Risk: a page that shows a `file:` address as text, such as an example in
  a code block, shows the changed address.
- Each other reply keeps the bytes of its file, also a `.js`, `.mjs`, or
  `.json` file. Reason: a script can test or build such an address, and a
  change can break its logic. An inline script of an HTML page changes with
  the page.

## The repository folder path

- A request whose path the repository refuses or does not have can name a
  file of the repository folder by its absolute path.
- When its decoded path starts with the segments of the current repository
  folder, it maps to the file at the rest of the path. So, for the folder
  `/home/user/code/app`, the path `/home/user/code/app/.context/x.woff2`
  serves `.context/x.woff2`.
- The compare uses whole segments. So `/home/user/code/app2/x` does not
  map.
- Each rule of a repository path applies to the rest, also the rule of dot
  files and the rules of folders.
- A file of the repository wins over each mapped path. So the mapping
  hides no file of the repository.
- The compare and the read of one request use the same repository folder.
  So a repository change during a request cannot serve a file of the new
  folder at an address of the old folder.
- After a [repository change](repository-change.md), only the path of the
  new folder maps. The real path of a repository folder that is a link
  does not map.
- Reason: one rule covers a `file:` address after its change, a plain
  absolute path, and a path that a script builds. A change of each address
  in the body to a repository path was not chosen, because it misses the
  paths that a script builds.

## System fonts

[File server fonts](file-server-fonts.md#system-fonts) gives these rules.

## The font stylesheet

[File server fonts](file-server-fonts.md#the-font-stylesheet) gives these rules.

## The font stylesheet link

[File server fonts](file-server-fonts.md#the-font-stylesheet-link) gives these rules.

## The preview origin

- The Worker sends the preview origin in the header
  `X-Conductive-Files-Origin` with each request of a files preview. It
  never sends this header with a request of a port preview, and it never
  forwards a value that a browser sends.
- The file server accepts the header only when the request has one value
  of the form `https://` and a non-empty lower-case host of ASCII letters,
  digits, `-`, and `.`. The value has no port, path, query, fragment, user,
  or trailing `/`.
- Otherwise the file server uses no preview origin. The file server writes
  no value of the header to a log.
- Reason: the browser resolves a path against the `<base>` of the page.
  A full address on the preview origin keeps each changed address on the
  files preview. Only the Worker knows that origin, because the runner sees
  only its loopback `Host`.
- These options of sandbox files decision 2 were not chosen:
  - No change of the `file:` addresses of a page with a `<base>` on
    another site. Such a page then loses its local files.
  - A stop of the change after a `<base` tag. A page with a `<base>` on its
    own site then also loses the change.
  - The change in the Worker. The Worker then streams and changes each
    body, at a much larger cost.
- An older Worker sends no header, and the file server then changes no
  `file:` address. An older file server ignores the header.

## Changed replies

- A changed reply, its `HEAD` reply, and its 304 carry the same `ETag` and
  no `Content-Length`. They carry `Accept-Ranges: none`.
- A changed reply ignores `Range` and `If-Range`. It gives the whole
  changed body with HTTP 200. A reply for a file of another type keeps its
  byte ranges.
- The `ETag` of a changed reply joins the `ETag` of the file and a digest.
  The digest covers the version of the rules that change the body, and the
  preview origin or its absence. For an
  HTML reply, it also covers whether the font stylesheet has a rule,
  because only an HTML body can get the `<link>`.
- So that `ETag` changes when the file changes, and when a runner release
  changes these rules. The `ETag` of an HTML reply also changes when the
  font stylesheet gets its first rule or loses its last one.
- A CSS or SVG reply, also its `HEAD` reply and its 304, does not read the
  system fonts. Reason: their bodies never depend on the fonts, and a page
  can load many such files.
- A digest of whether the page gets the `<link>` was not chosen, because
  each `HEAD` request and each 304 would then read the file.
- A changed reply answers 304 only when `If-None-Match` matches that
  `ETag`. It ignores `If-Modified-Since`. Reason: the body can change while
  the date of the file stays the same.
- The `Last-Modified` of a changed reply is the date of the file.
