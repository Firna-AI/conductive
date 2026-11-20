# File server

This doc holds the requirements and the decisions in force for the file
server of the agent runner, which serves the page of an HTML file and the
files that it loads. It belongs to [HTML file preview](html-file-preview.md),
which covers the tab of an HTML file, the files preview, and
[the files that a page can load](html-file-preview.md#which-files-a-page-can-load).
The terms are those of [HTML file preview](html-file-preview.md#terms) and
of the [architecture doc](../architecture.md#terms). A decision number
names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says.

## Requirements

- The file server serves the current repository folder of the workspace.
  After a [repository change](repository-change.md), each later request
  reads the files of the new folder.
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
- A path that the file read of a file tab refuses gets 404, such as a path
  in `.git` or a link that leaves the folder. So does a dot file, and a
  link whose target is a dot file.
- A folder path that ends with `/` serves the `index.html` of the folder.
  A folder path without the `/` redirects to the same path with it, so
  that relative addresses work. A folder without `index.html` gets 404. No
  reply lists a folder.
- The content type comes from the file extension, in any case, from a
  fixed table of web file types: HTML, CSS, JavaScript, JSON, SVG, PNG, JPEG, GIF, WebP,
  AVIF, ICO, WOFF, WOFF2, TTF, OTF, WASM, MP4, WebM, MP3, WAV, plain text,
  Markdown, XML, PDF, and source maps. `.js` and `.mjs` are JavaScript.
- Each text type carries `charset=utf-8`. Every other file is
  `application/octet-stream`. Reason: with `nosniff`, a browser runs a
  script or a style only with its correct type.
- Each reply carries `Cache-Control: no-cache` and `Last-Modified`. A
  request with `If-Modified-Since` for a file that did not change since
  then gets 304. So a reload shows the newest file at a low cost.
- The file server streams each file, with no size limit.
- A request for one byte range gets that range. A request for several
  ranges gets the whole file. A range that the file cannot satisfy gets
  HTTP 416. Reason: Safari plays a video only with byte ranges.
- A range request with `If-Range` gets its range only when that header is
  a date equal to the current `Last-Modified` of the file. Else it gets
  the whole file with HTTP 200, also in place of a 416. An entity tag in
  `If-Range` never matches, because the file server sends no ETag. Reason:
  a browser that asks for a missing part of a stored file must never join
  bytes of two versions of the file.
- The file server writes no request path to a log, because a path can hold
  a secret value.
- The runner announces its file server in its `hello`, as
  [The agent runner](agent-runner.md#the-agent-runner) says. An older
  runner gets the file server with an update of its software, as
  [Updates](sandbox-software.md#updates) says.
