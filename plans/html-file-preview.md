# HTML file preview

Status: Active. On branch `calummoore/preview-html-file-c42r`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

A file tab shows an HTML file of the workspace as text with syntax
colours. To see the page, a member downloads the file, or starts a static
server in the terminal and opens its port in Preview. On 18 November 2026,
Cal asked how to preview an HTML file from the file list.

This change shows an HTML file rendered in its file tab, with the Preview
and Source switch of a Markdown tab. The agent runner serves the files of
the workspace repository over HTTP on a local port of the cloud computer.
The page loads through the path of the port previews: the preview relay,
the preview proxy of the Worker, and the preview domain `conductive.page`.
So its scripts run on the preview domain, never on the app's site. The
change does not cover an agent tool that opens a file preview, files
outside the workspace's own repository, or a start path for the port
preview of a local address in chat text.

Contract owners:

- [Tools of a workspace](../docs/protocol/workspace-tools.md#files-and-changes),
  and a new linked page for the HTML preview.
- [Port previews](../docs/protocol/port-previews.md) and
  [Terminal, previews, and desktop](../docs/protocol/terminal-previews-and-desktop.md#port-previews).
- [Agent runner](../docs/protocol/agent-runner.md), for the `hello`.
- [Sandbox software](../docs/architecture/sandbox-software.md) in the
  architecture docs.
- The [Files README](../src/files/README.md), the
  [previews README](../src/previews/README.md), the
  [preview backend README](../worker/previews/README.md), the
  [runner README](../runner/README.md), and the
  [cnd-runner README](../crates/cnd-runner/README.md).
- The [mockup catalogue](../docs/mockups/catalogue-attachments-and-files.md).

## Terms

- **HTML file:** a file whose name ends with `.html` or `.htm`, in any
  case.
- **File server:** the part of the agent runner that answers HTTP requests
  for the files of the workspace's repository folder, on `127.0.0.1:7683`.
- **Files preview:** the preview of the file server. A workspace has at
  most one active files preview. It has a random hostname on the preview
  domain, as a port preview has.
- **Dot file:** a file whose own name starts with a dot, such as `.env`
  or `.npmrc`. A file in a folder whose name starts with a dot, such as
  `.context/report.html`, is not a dot file.
- **Files mark:** the header `X-Conductive-Files: 1`, which the Worker
  adds to each request of a files preview.
- **Launch address:** the address on the app's hostname that loads a
  preview. Each load gets a new grant, and the authorizer then sends the
  browser to the preview hostname.
- **Preview relay:** the app's own service in the cloud computer. It
  forwards each preview request to a local port.

## Decisions

An HTML preview decision number names a decision of this change. The
protocol docs cite it so, as
[Decision numbers](../docs/architecture.md#decision-numbers) says. The
options check of 18 November 2026 brought back option D and added option
E of decision 1. It changed decision 2 and added decision 3. Its report
is in `.context/html-file-preview/options-check-report.md`. Cal answered
decisions 2 and 3 on 18 November 2026.

### 1. HTML files show only as source

- **Answer:** A, on 18 November 2026, by Cal.
- **Severity:** Medium. **Effort:** Large.
- **Source:** Design. The brainstorm of 18 November 2026 in this
  workspace.
- **Category:** Product bug. It is a feature gap.
- **Location:** `src/files/page/FilePage.tsx`, `crates/cnd-runner/`,
  `worker/previews/`.
- **Background:** A press on an HTML file opens its source. Port previews
  already show the pages of servers in the cloud computer on the preview
  domain, and their scripts run there. Every option keeps one assumption:
  untrusted HTML runs only on the preview domain, never on the app's site,
  as [Port previews](../docs/protocol/terminal-previews-and-desktop.md#port-previews)
  requires for port previews.
- **Problem:** The app has no way to show an HTML file rendered.
- **Impact if no action:** Members download each HTML file, or start a
  server by hand and open its port.
- **Root question:** How should a member see an HTML file of the
  workspace rendered, with its styles, images, and scripts?
- **Options:**
  - **C.** A "Serve and preview" action on HTML files starts a static
    server, such as `python3 -m http.server`, in a terminal in the folder
    of the file. Then it opens the preview of that port at the path of the
    file. The image must hold Python or Node. The server keeps running,
    and its port can clash with another server. Effort: Medium.
  - **A.** The sandbox software gets a small static file server for the
    repository folder. The relay reaches it as any port. HTML file tabs
    get a Preview and Source switch, as Markdown tabs have. Preview shows
    the file in a frame from the preview domain. Older cloud computers need
    a software update first. Effort: Large.
  - **D.** Added by the options check, after the brainstorm left it out.
    The preview proxy of the Worker answers each request of a files
    preview itself. It reads each file through the file read that file
    tabs use. It needs no software update and no new port. Cost: each
    file has the 5 MiB read limit, travels the runner connection as JSON,
    and is read again at each reload. Effort: Large.
  - **E.** Added by the options check. A preview hostname serves only a
    fixed start page and a service worker. The service worker asks the
    app page for each file, and the app page reads it through the file
    API. It needs no software update and no change of the grant flow.
    Cost: the app page answers messages from untrusted code, Open in a new
    tab needs an app page around the frame, and each file has the 5 MiB
    read limit. Effort: Large.
- **Left out:**
  - B, a sandboxed `srcdoc` frame in the file tab. The frame gets the
    security policy of the app page, so no script of the file can run.
    Cal's question of 18 November 2026 set that the preview runs scripts,
    as a port preview does.
  - A copy of the files of the page in the app's storage. A and D are
    better on every point: they show the live file, and the app keeps no
    copy of workspace files, which can hold secrets.
  - The HTML on the app's own site, or a weaker script policy of the app.
    A script in the file could then act as the member on every API route.
  - No change. Members then download each file to see it.
- **Wider fix:** A. It gives each static file of the workspace one safe
  path to the preview domain.
- **Previous examples:** Port previews run untrusted pages on the preview
  domain (decisions 6, 83, and 102). The picture view of image files shows
  one file type in its file tab (decision 265 B).
- **Recommendation:** A. The page runs as a port preview does, and the
  member starts no server. A large page loads at the speed of a local
  server, with no read limit for each file. D works without a software
  update, but each file of a page then travels through the runner
  connection. A adds a new port, a `Host` rule for it, and the file rule
  of decision 2. The brainstorm said that A adds no new safety rule, and
  that was wrong.
- **Note:** The text of option A said that the Worker does not change.
  The design needs two Worker changes that keep the chosen approach. The
  frame must open the page at the path of the file, which decision 3
  asks about. The Worker also keeps the files preview out of the lists of
  port previews.

### 2. Which files a files preview can load

- **Answer:** D, on 18 November 2026, by Cal.
- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Security.
- **Location:** The file server in `crates/cnd-runner/`, and the new HTML
  preview page of the protocol docs.
- **Background:**
  - A page loads other files by their relative addresses, such as
    `style.css` or `images/chart.png`. The file server answers each such
    request.
  - A script of the page can also read each file that the file server
    serves, and send it to another site. One files preview, so one origin,
    serves every HTML file of the workspace. So the file server cannot
    tell which page asks for a file.
  - A file tab can already read each regular file of the repository
    folder by its path, outside `.git`, also a file that Git ignores. A
    file tab gives the file to the member. A page gives it to its scripts.
  - A static server that a member starts in the folder serves similar
    files. Express's static server and `sirv` leave dot files out by
    default, and Vite refuses `.env` files.
  - Under each option, an address that starts with `/` names a file from
    the top of the repository. So a built site that loads `/assets/app.js`
    from `dist/index.html` breaks under A, B, and D.
- **Problem:** No requirement says which files the file server serves.
- **Impact if no action:** The file server cannot be built.
- **Root question:** How does a page in a files preview get the files
  that it needs, while an untrusted page cannot send the workspace's
  secrets away? The options check wrote this question, because the first
  one asked only for one set of files.
- **Options:**
  - **A.** Each file that a file tab can read: every regular file of the
    workspace's repository folder, outside `.git`, through links that stay
    inside the folder. A page that loads ignored build output, such as
    `dist/app.js`, works. Risk: a script of an untrusted page can read an
    ignored file, such as `.env`, and send it to another site. Effort:
    Small.
  - **B.** Only the files that All files lists: the files that Git does
    not ignore, and the context folder. Ignored files, such as `.env`,
    stay out. Cost: a page that loads ignored build output breaks, an
    ignored page such as `coverage/index.html` cannot show, and the runner
    checks each path against its file list. Effort: Medium.
  - **D.** Added by the options check. A, but no dot file. A file in a
    dot folder still loads. Cost: a page that loads a dot file breaks, and
    a secret under another name, such as `key.pem`, stays readable.
    Effort: Small.
  - **E.** Added by the options check. Each previewed folder gets its own
    files preview and hostname. The root of the hostname is that folder,
    and the file server refuses each path outside it. Root addresses of
    built sites then work, and pages of different folders share no
    storage. Cost: each files preview stores its folder, a workspace gets
    several files previews, and a page that loads `../assets/` breaks. A
    page at the top of the repository still reaches every file. Effort:
    Medium.
  - **F.** Added by the options check. A, and the Worker hides each exact
    copy of the value of a secret env var in each reply of a files
    preview, as it does in runner events. Cost: it protects only those
    values, the proxy filters each streamed reply, and a page whose script
    holds such a value breaks. Effort: Medium.
  - **G.** Added by the options check. A setting of each repository
    chooses between A and B, and the answer of this decision sets the
    default. Cost: a new setting with its mockup, storage, protocol text,
    and a way to send it to the runner. Effort: Large.
- **Left out:**
  - C, the folder of the HTML file and the folders below it, with one
    files preview. One origin cannot enforce it, because the file server
    sees only the path, and each preview reply sends no referrer. E is its
    working form.
  - The files of other repositories and of the home folder. All files
    never shows them, and the home folder holds the files of the app's own
    software.
  - The HTML file alone, or only the files that it names. It fails the
    goal, because styles, pictures, and the files that scripts load at
    run time then do not load.
  - A content security policy that blocks requests to other sites. It
    fails the goal for pages that load a library from another site, and a
    navigation can still carry the data away.
  - A frame with no origin of its own. It fails the goal, because module
    scripts, fonts, and fetch calls then send no preview cookie.
  - A press before the page runs its scripts, or a notice of the files
    that a page read. Each fails the safety goal, because the page reads
    the files after the press, and a notice comes after the file left.
- **Wider fix:** None, because this is one new boundary, not a class of
  defect.
- **Previous examples:** A port preview serves each file that its server
  serves (decision 218). The file read of the runner refuses `.git` and
  each link that leaves the folder.
- **Recommendation:** D. The options check changed it from A. D serves
  almost every page that A serves, and it keeps `.env` and `.npmrc` away
  from each page, as common static servers do. So it stays as open as a
  port preview of such a server, as Cal asked on 18 November 2026. B best
  protects ignored files. E best limits each page to its own folder.
- **Action:** ask the user, because the options trade the safety of
  ignored files against pages that load them, and no option is clearly
  best for every repository.

### 3. The frame must open the page of the file

- **Answer:** A, on 18 November 2026, by Cal.
- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design. The options check of 18 November 2026.
- **Category:** Security.
- **Location:** `worker/previews/launch.ts`, `worker/previews/launch-document.ts`,
  `worker/previews/browser-launch.ts`, and the authorizer rules of
  `docs/protocol/terminal-previews-and-desktop.md`.
- **Terms:**
  - **Authorizer:** a fixed hostname on the preview domain. It takes a
    one-use grant, sets the preview cookie, and sends the browser to the
    preview hostname.
- **Background:**
  - Each load of a preview starts at its launch address. A frame and a
    new tab need their own load, because the browser keeps their cookies
    apart.
  - Today the authorizer always sends the browser to the root of the
    preview hostname. The protocol doc states this rule.
  - A page of a files preview must open at the path of its file, so that
    its relative addresses work. The follow-up item
    `plans/follow-ups/local-address-path-in-preview.md` records that a
    start path changes the grant flow, and that this needs the user.
- **Problem:** Cal's answer to decision 1 covered a text that said the
  Worker does not change. So no recorded decision covers a change of the
  grant flow.
- **Impact if no action:** The frame shows the root of the repository,
  not the file.
- **Root question:** How does a frame or a new tab open a files preview at
  the page of one file?
- **Options:**
  - **A.** The launch address takes an optional path of a file. The
    launch page posts it with the grant, and the authorizer sends the
    browser to that path on the hostname of the redeemed preview. The
    browser launch of the Mac app carries it in the fragment. The Worker
    builds the address from that hostname and the percent-encoded
    segments of the path, so a path such as `\/evil.example/x` cannot
    leave the preview. Effort: Medium.
  - **B.** Each HTML file gets its own files preview, with its path stored
    in the preview row. The authorizer sends the browser to the stored
    path, so the browser gives no path to the grant flow. Cost: a
    migration, a new origin for each file, so pages share no storage, and
    a new preview for each file. Effort: Large.
  - **C.** The app loads the launch address as today, and then moves the
    frame to the file on the preview hostname. The cookie of the frame
    stays in the app's partition. Cost: two loads for each show, a flash
    of the root, a reply that gives the hostname, and Open in a new tab
    still needs A or B. Effort: Medium.
- **Left out:** A start page at the root of the file server that reads
  the path from the fragment. The root of the file server is the root of
  the repository, where its own `index.html` lives.
- **Wider fix:** A. The same path can later open the page of a local
  address in chat text, which the follow-up item asks about.
- **Previous examples:** The follow-up item
  `plans/follow-ups/local-address-path-in-preview.md` gives the same
  change as its option B, for local addresses.
- **Recommendation:** A. It needs one load and one origin, with no
  migration. The address always keeps the hostname of the redeemed
  preview, so a path cannot send the browser to another site.
- **Action:** ask the user, because A changes the authorizer rule of the
  grant flow, and no recorded user decision covers that change.

## Design calls

These calls are mine, made on 18 November 2026 under the decision test.

The cloud computer:

- The agent runner hosts the file server. Reason: the runner already
  knows the repository folder, and it reads files with the safe file read
  of the file tabs. The preview relay reads no workspace variable, and it
  stays unchanged. It forwards to the file server as to any port.
- The file server listens only on `127.0.0.1:7683`. A fixed port keeps
  the preview proxy and the relay as they are. The ports list leaves port
  7683 out, as it leaves out the other ports of the app's own services.
  When another program holds the port, the runner warns and announces no
  file server.
- The file server answers only `GET` and `HEAD`. A request with an
  `Upgrade` header gets 400, because the file server upgrades no
  connection. It answers only a request whose `Host` is `localhost:7683`
  or `127.0.0.1:7683`. Reason: a
  check of `Host` stops DNS rebinding from a browser in the cloud
  computer, as dev servers do. The relay sends `Host: localhost:7683`.
- The file server answers only a request with the files mark. Every other
  request gets 403. The Worker forwards no files mark from a browser. So a
  port preview of port 7683 shows an error, as a port preview of port 7682
  does. Reason: a member or an agent can open a port preview of any port.
- The path of a request names a file by its path from the top of the
  repository, with each segment percent-decoded. So an address that
  starts with `/` names a file from the top of the repository. The file
  server ignores the query. A segment that decodes to a `/` or a NUL gets
  404. A path that a file read refuses gets 404.
- A path that names a dot file gets 404, under option D of decision 2. So
  does a link whose target is a dot file. Reason: a link named
  `config.txt` that leads to `.env` must not give the page the content of
  `.env`.
- A folder path that ends with `/` serves the `index.html` of the folder.
  A folder path without the `/` redirects to the same path with it, so
  relative addresses work. A folder without `index.html` gets 404. No
  reply lists a folder.
- The content type comes from the file extension, with a fixed table of
  web file types: HTML, CSS, JavaScript, JSON, SVG, PNG, JPEG, GIF, WebP,
  AVIF, ICO, WOFF, WOFF2, TTF, OTF, WASM, MP4, WebM, MP3, WAV, plain text,
  Markdown, XML, PDF, and source maps. `.js` and `.mjs` are JavaScript.
  Each text type carries `charset=utf-8`. Every other file is
  `application/octet-stream`. Reason: the Worker sends `nosniff`, so a
  browser runs a script or a style only with its correct type.
- Each reply carries `Cache-Control: no-cache` and `Last-Modified`. So a
  reload shows the newest file, and an unchanged file costs a 304.
- The file server streams each file, with no size limit. The read limit
  of 5 MiB stays for Source. A request for one byte range gets that
  range, so Safari can play a video. A request for several ranges gets
  the whole file. A range that the file cannot satisfy gets 416. Any
  other method gets 405.
- The file server writes no request path to a log, because a path can
  hold a secret value.
- The runner announces its file server with `fileServer: true` in its
  `hello`, only while the file server listens. An older runner sends no
  field. Reason: the `hello` already announces the login kinds of the
  runner. The runner protocol version stays 2.
- The port 7683 is a constant of the shared contracts, in Rust and in
  TypeScript, as the relay port 7682 is.

The Worker:

- A files preview is a preview row of the workspace with port 0. Reason:
  the row needs no migration, and no port preview can have port 0. During
  a rollback, the previous Worker lists it as port 0.
- The new app route `POST .../previews/files` opens the files preview of
  the workspace, or returns the active one, as a `PreviewResponse`. It
  needs a running cloud computer and a connected runner that announced its
  file server. Otherwise it answers 409 `file_server_unavailable`, and the
  app asks for a Restart of the software. It checks the announcement of
  the file server before the relay. So an older cloud computer gets
  `file_server_unavailable`, not `preview_relay_unavailable`.
- The proxy sends each request of a files preview to port 7683 through
  the relay, with the files mark. It uses the checks, the cookies, and the
  headers of a port preview. It refuses a WebSocket upgrade of a files
  preview with the 404 of an unknown preview, before any call to the
  cloud computer.
- The lists of the Preview tool and of the agent preview calls leave the
  files preview out. An agent cannot close it. It ends when the cloud
  computer stops and after 24 hours, as a port preview does. The next
  show of an HTML tab then opens a new one.
- The launch address takes an optional `path` query. The launch page
  posts the path with the grant. In both modes, the authorizer sends the
  browser to that path on the hostname of the redeemed preview. The
  browser launch of the Mac app carries the path in the fragment, beside
  the grant. This applies option A of decision 3.
- The Worker checks the path with `isFilePath` of
  `src/shared/file-path.ts` before the redemption. A refused path gets the
  same 404 as an invalid grant, and its grant stays unused.
- The Worker builds the address from `https://`, the hostname of the
  redeemed preview, and each segment of the path, percent-encoded. It
  never reads the path as an address. Reason: a path such as
  `\/evil.example/x` then stays on the preview hostname.
- A launch without a path opens the root of its preview, as today. Only
  the HTML tab sends a path now. The follow-up item
  [local-address-path-in-preview.md](follow-ups/local-address-path-in-preview.md)
  stays open, because chat link decision 2 C keeps the path of a local
  address out.

The app:

- An HTML file tab starts in Preview, as a Markdown tab does. Source shows
  the text with syntax colours. A file chip with lines opens Source, as
  today. This replaces my call "source first" of 18 November 2026.
  Reason: Cal asked to preview HTML files from the file list, and each
  place that opens a file tab already opens it in Preview.
- Preview shows the page in a frame with the sandbox flags of a Preview
  tab. The header keeps Copy and Download. It adds Reload and Open, as
  the bar of a Preview tab has them. Open opens the launch address of the
  file in a new tab. The Mac app opens it in the default browser.
- The frame loads again when an event changes the file, so an edit of an
  agent shows. A change of another file, such as a style file, needs
  Reload.
- The app keeps the files preview of each workspace while it lives. It
  drops it at a `preview.revoked` event with its ID or at its expiry. The
  next show of an HTML tab then opens a new one. After review finding 103
  of 18 November 2026, the app also forgets it when the workspace screen
  closes, and at a failed open, after finding 104. So the first show after
  a return, and Try again, open it again.
- While the cloud computer stops or starts, the tab keeps the page that it
  already shows, as a file tab keeps its file. Otherwise the tab shows the
  state of the cloud computer, as a file tab does.
- A runner without a file server gives a notice in place of the page. The
  notice asks for Restart in the workspace header, as Preview asks today.
  It has no button of its own.

The mockups of Milestone 1 raised two questions on 18 November 2026. I
settled them under the decision test, because existing tab rules settle
them:

- From the press until the page loads, the tab shows the "Opening
  preview" look of the launch page: first while the app opens the files
  preview, then while the frame loads. So the member sees one wait. A
  failed open, other than `file_server_unavailable`, shows the failure of
  a Preview tab: "The preview couldn't open", the message of the server,
  and Try again. Reload shows while a page opens or shows. Open shows
  only once the files preview exists, as on the bar of a Preview tab,
  because it needs the launch address.
  Reason: a Preview tab already shows these states, and the launch page
  already shows this look.
- When the workspace leaves Starting, such as after a Restart, a tab that
  shows the notice opens the files preview again. Each new show of the
  tab also opens it again. So a release that the runner installs while
  the workspace is idle shows the page at the next show of the tab.
  Reason: a Restart shows Starting until the runner is ready, as
  [Restart the software](../docs/protocol/restart-the-software.md) says,
  and a file tab already reads again when the state of the cloud computer
  leaves its place. A new event for the file server was not chosen,
  because the open route already answers the current state.

The documentation milestone raised eight questions on 18 November 2026. I
settled them under the decision test, because existing rules settle them
or one option is clearly best:

- The frame of an HTML tab stays loaded while another tab shows, as the
  page of a Preview tab does. Reason: the app cannot read or set the
  scroll place of a page from another site.
- When the workspace leaves Starting, such as after a Restart or a resume,
  each HTML tab in Preview opens the files preview again, also a tab that
  kept its page. Reload is a show, as for a Preview tab. Reason: a stop
  ends the files preview, and the kept page then belongs to an ended one.
- The content type table matches each extension in any case, as the term
  HTML file does.
- One notice serves each runner that announced no file server, also a
  runner that is away for a moment or whose port another program holds.
  Reason: both cases are rare, and the next show opens the preview again.
- A launch address whose path is not valid gets HTTP 400 `invalid_input`
  and no grant, as a file read refuses such a path.
- A `fileServer` value of another type counts as no file server. The
  Worker logs a warning and does not refuse the hello. Reason: graceful
  handling, and a feature flag must not stop the agents.
- No close ends the files preview: the close route of the app and the
  close call of an agent change nothing for it. Reason: no screen offers a
  close, and on desktop no control ends a preview (decision 292).
- The file server answers 403 to a foreign `Host`, as the preview relay
  does, and 404 to a segment that is not valid percent-encoding or not
  UTF-8.

The UI milestone raised these calls on 18 November 2026. I settled them
under the same test:

- An HTML file whose own name starts with a dot, such as `.draft.html`,
  has no Preview, and its tab shows Source, as for a label that hides a
  secret value. Reason: the files preview serves no dot file under option
  D of decision 2, so the page can never load, and a bare 404 in the frame
  helps no one.
- The text of the mockup `app/files/html/opening` now says that Reload
  shows for the whole wait and Open once the files preview exists. Reason:
  the earlier call on Open says so, and the drawing already shows the
  later part of the wait.
- The kind of an HTML file stays code, with the icon of code, because the
  icon map of the mockups is typed by the three kinds.
- A label that no record names yet counts as hiding a secret value, as
  for every tab. So such a file shows its page after its read gives the
  label.
- In Preview, only a read that finds no file replaces the page. Each other
  failed read keeps the page, with Copy off, because the page does not
  use the read.
- The tab opens the files preview once for each show. A files preview that
  ends while the page shows keeps the page, without Open, until the next
  show. Reason: the protocol page names the next show, and a new open on
  the clock of the app could loop.
- When the workspace leaves Starting, the tab opens the files preview
  again, also when the app still has one.
- The app drops its files preview at its revocation, at its expiry by the
  clock of the app, and while the cloud computer is stopped, failed, or
  archived. Risk: a browser clock that runs ahead ends it early, and the
  tab then waits for its next show.
- Reload shows on a page that the tab keeps while the cloud computer does
  not run, and it counts as a show. Open does not show then.

The documentation milestone moved the grant rules of
`docs/protocol/terminal-previews-and-desktop.md` to the new page
`docs/protocol/preview-grants.md`, the rules of the file server to
`docs/protocol/file-server.md`, and the workspace part of the protocol
docs index to `docs/architecture/protocol-docs-workspaces.md`. Reason:
each doc stays under the length target of about 250 lines.
- A file whose label hides a secret value offers no Preview, and its tab
  shows Source. Reason: the address of the page holds the real path, and
  Open shows that address.
- On a phone, the file page shows the frame too, with Reload and Open in
  its header.
- The Files code gets the frame from the shell through a prop, as it gets
  the row menu. So `src/files` imports nothing from the Preview tool.

## Compatibility

- An older runner sends no file server field. The app then shows the
  notice that asks for Restart. Restart installs the newest release.
- The `hello` field is optional, so the runner protocol version stays 2.
- An older Mac app keeps showing HTML files as source. It never sees the
  files preview, because the lists leave it out.
- The change adds no migration. The previous Worker keeps working on the
  stored rows.
- A launch without a path works as today.

## Follow-up items

- [boat-file-read-allows-git-paths.md](follow-ups/boat-file-read-allows-git-paths.md):
  the options check found that the fallback file read accepts paths in
  `.git`. It is outside the scope of this change.
- [relay-notice-asks-for-new-workspace.md](follow-ups/relay-notice-asks-for-new-workspace.md):
  the mockups found that the relay message asks for a new workspace,
  while the public guide asks for Restart. It is outside the scope of
  this change.
- [preview-failure-says-try-again-twice.md](follow-ups/preview-failure-says-try-again-twice.md):
  the mockups found that a failed preview shows "Try again" in its
  message and on its button. It is outside the scope of this change.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The new `app/files/html` page draws an HTML file tab, on desktop and on a
phone.

- [x] Add `app/files/html` beside `app/files/markdown` and
      `app/files/image`. It shows `.context/report.html`, opened from All
      files, in Preview, with the view switch, Reload, Open, Copy, and
      Download.
- [x] Add the variant Source, with the text and its syntax colours.
- [x] Add the variant Opening, with the "Opening preview" page of
      `app/tools/preview-opening` in the frame.
- [x] Add the variant Older software, with the notice that asks for
      Restart in the workspace header.
- [x] Add the variant Failed, with "The preview couldn't open", the
      message of the server, and Try again.
- [x] Describe the page in
      `docs/mockups/catalogue-attachments-and-files.md`.
- [x] Run `npm run mockups:check`. Smoke-test the page on desktop and on a
      phone with `npm run mockups:serve`.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show.

The mockup check and the screenshots of 18 November 2026 are in
`.context/html-file-preview/logs/` and `.context/html-file-preview/mockups/`.

## Milestone 2: Documentation and protocol

Depends on: 1

The protocol docs state the requirements of the HTML preview, the files
preview, and the launch path, with decisions 1 and 2.

- [x] Add `docs/protocol/html-file-preview.md` with the requirements of
      the HTML tab, the file server, and the files preview, with option D
      of decision 2 and option A of decision 3. Say that an address that starts with
      `/` names a file from the top of the repository. Link the page from
      [Files and changes](../docs/protocol/workspace-tools.md#files-and-changes).
      Reason: `workspace-tools.md` has 243 lines, near the target of 250.
- [x] Change the authorizer rule of
      `docs/protocol/terminal-previews-and-desktop.md` to option A of
      decision 3: it sends the browser to the path that the launch names,
      on the hostname of the redeemed preview.
- [x] State in `docs/protocol/port-previews.md` that the files preview is
      no port preview: it has no Preview tab, and the tool does not list
      it.
- [x] State the new `hello` field in `docs/protocol/agent-runner.md`.
- [x] Add the file server to `docs/architecture/sandbox-software.md`.
- [x] Read the Terms page and the Privacy page in full. Update each
      sentence that restates a changed fact.
- [x] Read each public guide in `src/marketing/docs/` in full. Update
      `files-and-changes.md` for the HTML preview, and each other sentence
      that restates a changed fact, such as in `security.md`.
- [x] Check each relative link of each changed Markdown file.

## Milestone 3: The file server of the runner

Depends on: 2

The runner serves the files of the repository folder on
`127.0.0.1:7683`, and announces it in its `hello`.

- [x] Move the safe file open of `crates/cnd-runner/src/repository/io.rs`
      into a function that the file read and the file server share.
- [x] Add the file server as a module of `crates/cnd-runner`, with the
      rules of the design calls, the files mark, one byte range, and no
      dot file, under option D of decision 2.
- [x] Start it with the runner. When the bind fails, warn and run on
      without it.
- [x] Leave port 7683 out of the ports report in
      `crates/cnd-runner/src/ports/sockets.rs`.
- [x] Add the optional field to the `hello` in
      `crates/cnd-runner-interface/src/runner_handshake.rs`, and send it.
      Run `cargo run -p cnd-runner-interface --example export_bindings`.
- [x] Add tests over real local HTTP: each rule of the design calls, a
      link that leaves the folder, `.git`, `Host`, the files mark, one
      byte range, a dot file, a link to a dot file, a file in a dot
      folder, and a folder with and without `index.html`.
- [x] Update the `cnd-runner` README and the runner README.
- [x] Run the Rust checks of `AGENTS.md`.

## Milestone 4: A launch at a path

Depends on: 2

The launch address takes an optional path, and the authorizer sends the
browser to it, under option A of decision 3.

- [x] Read an optional `path` in the launch GET of `worker/previews/`.
      Check it with `isFilePath` of `src/shared/file-path.ts`.
- [x] Post the path from the launch page. Read it in both modes of the
      authorizer, before the redemption. Send the browser to the path, or
      return its address.
- [x] Carry the path in the fragment of the browser launch, and in the
      authorizer page.
- [x] Add the address builder of a launch with a path to
      `src/shared/previews.ts`. It encodes each segment and reads no path
      as an address.
- [x] Add tests: a path in each mode, a refused path that leaves the
      grant unused, a path with `\`, `%2F`, or `//`, and a launch without
      a path.
- [x] Update the preview backend README.
- [x] Update `plans/follow-ups/local-address-path-in-preview.md`: the
      launch address now takes a path, so its option B only needs to pass
      the path of a local address.

## Milestone 5: The files preview in the Worker

Depends on: 3, 4

The Worker opens the files preview, proxies it to port 7683, and keeps it
out of the lists of port previews.

- [x] Add the shared constants and the path helper of the files preview
      to `src/shared/previews.ts`, before this milestone and Milestone 6
      start.
- [x] Keep the file server field of the `hello` with the runner
      connection in the workspace object.
- [x] Add the app route that opens or returns the files preview, with its
      409 replies. Add its path and its reply type to
      `src/shared/previews.ts`.
- [x] Send each request of a files preview to port 7683, with the files
      mark. Make sure that the request allowlist never forwards a files
      mark from a browser.
- [x] Leave the files preview out of the app list and of the agent preview
      calls.
- [x] Check each other place that shows a preview by its port, such as
      the operator views.
- [x] Add tests: the open, the reuse of an active files preview, the 409
      replies, the proxy port, and the lists.
- [x] Update the preview backend README.

## Milestone 6: The HTML preview in the file tab

Tags: ui

Depends on: 1, 4

The file tab of an HTML file shows the page, as the mockups draw it. The
protocol docs fix the route, its reply, and its error code, and the
shared helpers are in `src/shared/previews.ts` before Milestones 5 and 6
start. So this milestone runs beside Milestone 5, with the fake API of
the tests. My call of 18 November 2026, to save time.

- [x] Let `fileKind` know an HTML file. Show the view switch for it in
      `FilePage`.
- [x] Add the frame prop of `FilePage`, and draw the frame in Preview.
- [x] In the shell, open the files preview through the previews API, and
      give the frame the launch address with the path of the file.
- [x] Add Reload and Open. Open uses a new tab in the web app and the
      browser launch in the Mac app.
- [x] Load the frame again when the version of the file grows.
- [x] Show the notice of an older runner, and the states of the cloud
      computer.
- [x] Show Source only for a file whose label hides a secret value.
- [x] Add an HTML file to the development page of `src/files/dev/`.
- [x] Add mounted tests for the switch, the frame address, the reload
      after a change, and the notice. Run each new asynchronous test 10
      times.
- [x] Update the Files README and the previews README.
- [x] Smoke-test the tab in the development app.

The screenshots of the smoke test of 18 November 2026 are in
`.context/html-file-preview/ui/`.

## Milestone 7: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run the targeted tests and the complete gate named in `AGENTS.md`.
      Run the Rust checks.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives the decisions and the
      design calls of this plan with their dates, a permalink to this
      plan, and the follow-up items that the change adds.

## Post-merge follow-up (non-blocking)

- [ ] In a real cloud computer after the deploy, open an HTML file of
      `.context/` with a style file, a script, and a picture. Check
      Reload and Open in Chrome and Safari, the frame and the browser
      launch of the Mac app, and the notice of an older cloud computer
      before its Restart. Check that port 7683 is free in a new cloud
      computer.
