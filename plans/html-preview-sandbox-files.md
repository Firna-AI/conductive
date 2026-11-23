# HTML preview of sandbox files and fonts

Status: Active. On branch `calummoore/fonts-loading-issue-kjto`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

Agents often check an HTML page in the browser of the cloud computer, from
a `file://` address. There, a page can load a file by a `file://` address
or by an absolute path, and it can name a font that only the cloud
computer has. In the HTML tab, the page runs in the member's own browser on
the preview domain. An `https` page never loads a `file://` address, and the
member's computer does not have the fonts of the cloud computer. So the
page shows with default fonts and without some files. On 23 November 2026,
Cal reported this for `.context/launch-video/out/e-newsreel.html` in the
`ciproxy` repository. That page loads Geist from a `file://` address in the
repository folder, and it names "Nimbus Sans Narrow" and C059, which are
system fonts of the cloud computer under
`/usr/share/fonts/opentype/urw-base35/`.

This change makes the file server of the runner show such pages as the
agent saw them. It changes only the runner. The Worker, the app, the Mac
app, and the runner messages do not change. A runner without this change
serves pages as before.

The change does not cover these cases:

- A file outside the repository folder that is not a system font.
- A font in the home folder, such as `~/.local/share/fonts`.
- A `file://` address that a script builds while the page runs.
- A generic family, such as `sans-serif`, or a fontconfig alias, such as
  Helvetica, which the cloud computer shows as Nimbus Sans.
- An SVG document or an SVG picture, which gets no system fonts.

Contract owners:

- [File server](../docs/protocol/file-server.md).
- [Files of an HTML page](../docs/protocol/html-page-files.md).
- The [runner README](../crates/cnd-runner/README.md).
- The public guides [Files and changes](../src/marketing/docs/files-and-changes.md)
  and [Security](../src/marketing/docs/security.md).

## Decisions

### Sandbox files decision 1: how agent pages show with their files and fonts

Date: 23 November 2026. Chosen by Cal: **D**.

- **Root question:** How does each HTML file that an agent writes show in
  the member's HTML tab with the fonts, pictures, and styles that the agent
  intended, with no fix of each file by hand?
- **Options:**
  - **A.** A rule in the repository's `CLAUDE.md` or in the org skills.
    Only that repository or org gets it, and an agent can skip it.
  - **B.** A rule in the agent instructions: relative addresses, and a copy
    of each font beside the page. Every org gets it, but an agent can skip
    it, and older pages stay broken.
  - **C.** The file server changes the `file://` addresses and absolute
    paths inside the repository folder of the pages that it sends. It does
    not fix the system fonts.
  - **D.** C, and the files preview also serves the system fonts under
    `/usr/share/fonts` and `/usr/local/share/fonts`, never of the home
    folder, with a stylesheet that each HTML page loads.
  - **E.** A `conductive` command that makes a page portable, which B tells
    agents to run.
  - **F.** A second view of the HTML tab with a picture that the cloud
    computer renders.
- **Reason:** D needs no step from the agent, and it also fixes the pages
  that exist now. The agent recommended B for its small effort. Cal chose
  D, because the problem will happen again.
- **Accepted risk:** a script of a page can read each served system font
  and send it to another site. Package fonts are public. A licensed font
  that an org installs under those folders is readable too. So is the
  stylesheet, which lists each served font. On some images, the user of
  the cloud computer owns `/usr/local/share`, so a process of the user can
  add a file there. This is the same kind of risk, because such a process
  can also write into the repository folder.
- The brainstorm is in `.context/fonts/brainstorm.md`.

- The options check of the design is in
  `.context/html-preview-sandbox-files/options-check.md`. It found no new
  user decision. Its fixes are in the design below.

## Design

### Addresses

- An HTML, CSS, or SVG reply of the file server changes each local
  `file:` address to a path from the top of the site. The browser then
  asks the files preview for the absolute path of the file.
  - The match is `file:` in any case, then `//`, an optional `localhost` in
    any case, and one or more `/`. It becomes one `/`. So
    `file:////home/x` becomes `/home/x`, not `//home/x`, which a browser
    sends to the host `home`.
  - `file:/` before a character that is not `/` also becomes `/`, as Java
    writes such addresses.
  - The match needs a start of a word: the byte before `file:` is not a
    letter, a digit, `+`, `-`, or `.`.
  - A `file://` address with another host stays as it is.
- A request whose path the repository refuses or does not have, and whose
  decoded path starts with the segments of the current repository folder,
  serves the file at the rest of the path. So
  `/home/user/code/ciproxy/.context/x.woff2` serves `.context/x.woff2`.
  - The compare uses whole segments. So `/home/user/code/ciproxy2/x` does
    not map.
  - The request reads the repository folder once, and the check and the
    open use that value. So a repository change during the request cannot
    serve a file of the new folder at an address of the old folder.
  - Every check of the file server applies to the rest of the path, also
    the dot-file rule.
  - This also fixes an absolute path without `file:`, such as
    `src="/home/user/code/ciproxy/logo.png"`, and a path that a script
    builds.
  - A file of the repository wins over each mapped path, so the mapping
    hides no file of the repository.
  - After a [repository change](../docs/protocol/repository-change.md), only
    the path of the new folder maps.

### System fonts

- A request whose path the repository refuses or does not have, and whose
  path starts with the segments `/usr/share/fonts/` or
  `/usr/local/share/fonts/`, serves that system font.
  - The file must be a regular file with the extension `.ttf`, `.otf`,
    `.woff`, or `.woff2`, in any case.
  - Its real path, after links, must be under one of the two folders, as
    written and compared by segments. So a font folder that is a link into
    the home folder serves nothing.
  - No segment of the path can start with a dot.
- `/__conductive/system-fonts.css` serves a stylesheet with `@font-face`
  rules for the `.ttf` and `.otf` fonts of the two folders. A repository
  file at that path wins.
  - Each face gets one rule for each of its distinct family names: the
    typographic family and the family of the font file, in each language.
    So a page that names "Lato Black" gets the face that the cloud computer
    gives that name.
  - A rule gives the family, the weight, the style, the width, and the
    address of the font. A variable font gives its weight and width ranges.
  - The stylesheet follows the rules of each reply: `text/css;
    charset=utf-8`, `Cache-Control: no-cache`, its own `ETag` as a digest of
    its text, 304 when that `ETag` matches, `HEAD` with the headers of
    `GET`, and `Accept-Ranges: none`.
- Each HTML reply loads that stylesheet first, with a `<link>` element that
  the file server adds to the start of the page. So a family that the page
  names, such as C059, loads from the cloud computer. The page's own
  `@font-face` rules come later, so they win.
- An HTML reply gets no `<link>` when the stylesheet has no rule.

### The place of the `<link>`

- The file server reads the start of the page as the HTML tokenizer does:
  - It skips a UTF-8 byte order mark, ASCII whitespace, and comments, with
    each comment end that the tokenizer accepts, such as `<!-->` and
    `--!>`.
  - It skips bogus comments: `<?...>`, such as an `<?xml ...?>` line, a
    `<!...>` that is not a doctype or a comment, and `</` before a
    character that is not a letter.
  - It matches the doctype keyword in any case, and the doctype ends at its
    first `>`.
- The `<link>` goes after the doctype. When the first other item is a tag
  or text, the `<link>` goes before it, after the byte order mark.
- The page gets no `<link>` and no change of text when it starts with a
  UTF-16 byte order mark. Reason: the browser then reads the page as
  UTF-16, and an ASCII `<link>` breaks it.
- The page gets no `<link>` when the scan reaches 8 KiB, or meets an item
  that it cannot classify.
- Accepted risks: the browser drops the attributes of the page's own
  `<head>` element, and the stylesheet becomes `document.styleSheets[0]`.

### Replies that change

- The changed replies are HTML, CSS, and SVG. Each other type streams as
  before, with its ranges.
- A changed reply, its `HEAD`, and its 304 carry no `Content-Length` and
  carry `Accept-Ranges: none`. A changed reply ignores `Range` and
  `If-Range`, and it gives the whole changed body with HTTP 200.
- Its `ETag` joins the `ETag` of the file and a digest of the version of
  the change. For HTML, the digest also covers whether the stylesheet has
  a rule. So `HEAD` and 304 need no read of the file, and CSS and SVG
  replies never read the system fonts. My call, 23 November 2026, from
  review finding 3: an earlier version of this design gave CSS and SVG
  the same input, so each such request walked the font folders.
- A changed reply answers 304 only when `If-None-Match` matches that
  `ETag`. It ignores `If-Modified-Since`, because the body can change while
  the date of the file stays the same. `Last-Modified` stays the date of
  the file.
- Source and Download of the HTML tab still show the file as it is on
  disk, because they use the file read, not the file server.

### The stylesheet cache

- The cache keys each font file by its inode, size, modification time, and
  change time, with nanoseconds, as the file `ETag` does.
- Each request of the stylesheet lists the two folders again and reads
  only the changed files. So a font that a setup script installs shows at
  the next load. A walk of about 1,000 entries takes under 10 ms.
- The walk never follows a link to a folder. It skips dot segments and
  names that are not UTF-8. It checks each link to a file with the rule of
  the real path above.
- It reads only the table directory and the `name`, `OS/2`, and `fvar`
  tables of each font. A font whose table is larger than a fixed size gets
  no rule, as a broken font gets none.
- One build runs at a time. A parallel request waits for it.

### Escaping in the stylesheet

- Each segment of a font address is percent-encoded, so `#`, `?`, `%`, and
  spaces keep their meaning. The address is then a CSS string.
- Each CSS string follows the "serialize a string" steps of CSSOM.
- An empty family name, or a family name longer than a fixed length, gets
  no rule.

### Design calls

My calls, 23 November 2026, with the fixes of the options check:

- The change is a text change of the `file:` prefix, not an HTML or CSS
  parser. Reason: it covers attributes, `srcset`, styles, and inline
  scripts with no new dependency and no parser faults. Risk: text in the
  page that shows a `file:` address, such as an example in a code block,
  shows the changed address.
- The text change covers each local `file:` address, also outside the
  repository folder. Reason: one rule also covers
  `file:///usr/share/fonts/...`, and the mapping still decides what loads.
  Such an address now gets a 404, where before the browser blocked it.
- External `.js`, `.mjs`, and `.json` files do not change. Reason: a script
  can test or build such an address, and a change can break its logic. An
  inline script of an HTML page changes with the page, because the text
  change does not parse the page.
- The `file:` prefix goes, and the file server maps the absolute path, in
  place of a body change to a repository path. Reason: one rule then
  covers the repository folder, the system fonts, plain absolute paths,
  and paths that scripts build. The real path of a repository folder that
  is a link does not map.
- The `<link>` goes after the doctype, with the tokenizer scan above.
  `html5ever` was not chosen, because it adds a large tree of
  dependencies for the start of a page. A `Link` header was not chosen,
  because only Firefox applies it.
- The reserved path is `/__conductive/system-fonts.css`. Reason: a
  repository with that path is unlikely, and its file wins.
- The runner reads the names, weights, and styles from the font files with
  the `ttf-parser` crate, a new dependency with no dependencies of its own.
  `fc-list` was not chosen, because an image can lack fontconfig, and each
  build would start a process. `fontdb` was not chosen, because it reads
  whole files and follows links to folders. `.woff` and `.woff2` files load
  by their path but get no rule. Type 1 and collection files do not load.
- "Which files a page can load" moves to its own protocol doc,
  `docs/protocol/html-page-files.md`, and its heading in
  `html-file-preview.md` keeps a link. Reason: the new rules made the doc
  longer than the target of the `documentation` skill, and the old anchor
  keeps working.
- The stylesheet cache is in memory and has no copy on disk. Reason: its
  first build takes under 0.1 s here.

## Milestone 1: Documentation and protocol

Depends on: none

State the new requirements and Sandbox files decision 1 in the protocol
docs, the runner README, and the public guides.

- [x] Update `docs/protocol/file-server.md`: the `file:` change of HTML,
      CSS, and SVG replies, the mapped repository folder path, the system
      fonts and their stylesheet, the `<link>`, and the `ETag`, 304,
      length, and range rules of a changed reply. Fix the rule that every
      reply for one version of a file carries the same `ETag`.
- [x] Update `docs/protocol/html-file-preview.md`: a page can load a file
      by a `file:` address or an absolute path in the repository folder,
      and it can load the system fonts. Add Sandbox files decision 1, its
      accepted risks, and the cases that the change does not cover, under
      "Which files a page can load".
- [x] Update the file server part of `crates/cnd-runner/README.md`.
- [x] Update `src/marketing/docs/files-and-changes.md` and
      `src/marketing/docs/security.md` for the files that a page can load.
      Read each public guide in full and update each sentence that restates
      a changed fact.
- [x] Read `src/marketing/terms.ts` and `src/marketing/privacy.ts` in
      full. Update each sentence that restates a changed fact. When the
      Terms text changes, set its effective date.
- [x] Check the line of the files preview in `docs/architecture.md`.

## Milestone 2: Map the repository folder path

Depends on: 1

- [x] Add one helper that strips a folder prefix by whole segments.
- [x] Read the repository folder once for each request. When the
      repository refuses or does not have the path, and the path starts
      with that folder, serve the rest of the path with every check.
- [x] Test: a mapped file, a repository file that wins, a `ciproxy2`
      prefix that does not map, a mapped dot file that gets 404, a mapped
      folder redirect, a path that the repository refuses, and the folder
      after a repository change.

## Milestone 3: Change `file:` addresses in replies

Depends on: 2

- [x] Add a streaming change of local `file:` addresses to `/` for HTML,
      CSS, and SVG replies, as the design says, also across chunk
      boundaries.
- [x] Give changed replies the `ETag`, 304, length, and range rules of the
      design, also for `HEAD`. Move the length, 206, and 416 tests of
      `policy_tests.rs` to a type that does not change.
- [x] Test: a prefix split across chunks, `file:////`, `file://LOCALHOST/`,
      `file:/x`, `xfile:///a`, another host, a reply with no `file:`, a
      JavaScript file that does not change, `If-None-Match`, a lone
      `If-Modified-Since`, `HEAD`, and `Range`.

## Milestone 4: Serve system fonts

Depends on: 2

- [x] Serve a font file under `/usr/share/fonts/` or
      `/usr/local/share/fonts/` as the design says. Inject the two folders,
      so that the tests use a temporary folder.
- [x] Test: a font, an extension in upper case, a link inside the folders,
      a link that leaves them, a font folder that is a link, a file with
      another extension, a dot segment, and a repository file that wins.

## Milestone 5: The system font stylesheet and the `<link>`

Depends on: 3, 4

- [x] Add `ttf-parser`. Build the stylesheet with its cache, its walk
      rules, and its escaping, as the design says.
- [x] Serve the stylesheet at `/__conductive/system-fonts.css` with the
      reply rules of the design.
- [x] Add the `<link>` to each HTML reply with the tokenizer scan of the
      design.
- [x] Test the stylesheet: a static font, a variable font, an italic font,
      a face with two family names, a family name with a quote and a
      control character, a `#` in a file name, a broken font, a table over
      the size limit, a link to a folder, the cache after a change, and no
      fonts.
- [x] Test the `<link>`: a doctype, a doctype in upper case, whitespace and
      a byte order mark before it, an `<?xml ...?>` line, `<!-->` and
      `--!>` comments, no doctype, a UTF-16 page, and more than 8 KiB of
      comments.

## Milestone 6: Verification, commit, review, and pull request

Depends on: every other milestone

- [x] Run `cargo fmt --all -- --check`,
      `cargo clippy --workspace --all-targets -- -D warnings`, and
      `cargo test --workspace`. Run the Rust release build.
- [x] Run `npm run check:static`, for the changed guides.
- [x] Smoke-test a local build of the file server with a copy of the
      incident page, behind a local proxy that sends
      `X-Content-Type-Options: nosniff`, as the Worker does. Load it in
      Chromium on the desktop, and save a screenshot under
      `.context/html-preview-sandbox-files/`.
  Evidence: `.context/html-preview-sandbox-files/smoke/` and
  `.context/html-preview-sandbox-files/rust-verification.md`.
- [x] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives the decisions and the
      design calls of this plan with their dates, a permalink to this plan,
      and the follow-up items that the change adds.

## Post-merge follow-up (non-blocking)

- [ ] After the runner release reaches a workspace, open
      `.context/launch-video/out/e-newsreel.html` of the `ciproxy`
      workspace in the HTML tab, and check Geist, GeistMono,
      Nimbus Sans Narrow, and C059.
