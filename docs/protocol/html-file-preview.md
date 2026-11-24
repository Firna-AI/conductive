# HTML file preview

This doc holds the requirements and the decisions in force for the
preview of HTML files. It covers the tab of an HTML file, the files
preview that shows its page, and the files that a page can load.
[File server](file-server.md) gives the rules of the file server of the
agent runner. It belongs to
[Files and changes](workspace-tools.md#files-and-changes).
[Port previews](terminal-previews-and-desktop.md#port-previews) states the
checks that the files preview shares with the port previews. The terms
are those of the [architecture doc](../architecture.md#terms). A decision
number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. An HTML
preview decision number names a decision of the change that shows HTML
files rendered. A sandbox files decision number names a decision of the
change that shows agent pages with their files and fonts. The
[mockup catalogue](../mockups/catalogue-attachments-and-files.md) draws
the tab at `app/files/html`, on desktop and on a phone.

## Terms

- **HTML file:** a file whose name ends with `.html` or `.htm`, in any
  case.
- **File server:** the part of the agent runner that answers HTTP requests
  for the files of the workspace's repository folder and for the system
  fonts, as [File server](file-server.md) says.
- **Files preview:** the preview that shows the files of the file server.
- **Dot file:** a file whose own name starts with a dot, such as `.env` or
  `.npmrc`. A file in a folder whose name starts with a dot, such as
  `.context/report.html`, is not a dot file.
- **Files mark:** the header `X-Conductive-Files: 1` on a request to the
  file server.
- **System font:** a font file of the cloud computer under
  `/usr/share/fonts` or `/usr/local/share/fonts`.

## The tab of an HTML file

- The tab of an HTML file has the switch of a Markdown tab, Preview and
  Source (HTML preview decision 1 A). It starts in Preview, as a Markdown
  tab does.
- Reason: a member then sees a page of the workspace, such as a report
  that an agent wrote, with its styles, pictures, and scripts. The member
  starts no server, and a large page loads at the speed of a local server.
- Source shows the text with line numbers and syntax colours, as code
  shows. A tab that opens at a line or a range of lines shows Source, as
  [Line targets](file-mentions-answers.md#line-targets) says for a Markdown file.
- Preview shows the page in a frame from the files preview of the
  workspace. So the scripts of the page run on the preview domain, never
  on the app's site.
- The frame gets the permissions of the frame of a Preview tab.
- The frame opens the page at the path of the file, with a launch at that
  path (HTML preview decision 3 A), as
  [Launch paths](preview-grants.md#launch-paths) says.
- So the page loads each other file by its relative address, such as
  `style.css` or `images/chart.png`. An address that starts with `/` names
  a file from the top of the repository.
- A page can also load a file of the repository folder by its absolute
  path or by a local `file:` address. It can also load the system fonts.
  [Files of an HTML page](html-page-files.md) gives the
  rules and the limits.
- These options of HTML preview decision 1 were not chosen:
  - A "Serve and preview" action that starts a static server in a
    terminal. The image then needs Python or Node, the server keeps
    running, and its port can clash with another server.
  - A files preview that the Worker answers from the file read of the file
    tabs. Each file then has the read limit of 5 MiB, travels the runner
    connection as JSON, and is read again at each reload.
  - A preview hostname with only a start page and a service worker that
    asks the app page for each file. The app page then answers messages
    from untrusted code, Open needs an app page around the frame, and each
    file has the read limit.
- These ways were rejected:
  - A frame with the HTML in `srcdoc`, because that frame gets the security
    policy of the app page, so no script of the file can run.
  - The HTML on the app's own site, or a weaker script policy of the app,
    because a script of the file could act as the member on each API route.
  - A copy of the files of the page in the app's storage, because the app
    keeps no copy of workspace files, which can hold secrets.
- In Preview, the header keeps Copy and Download, and it adds Reload and
  Open, as the bar of a Preview tab has them. Reload shows while the page
  opens or shows. Open shows once the files preview exists, as on the bar
  of a Preview tab, because it needs the launch address.
- Reload loads the page again. Open opens the page at the path of the file
  in a new browser tab. The Mac app opens it in the default browser, with
  a [browser launch](desktop-app.md#port-previews).
- On desktop, the header also has Expand, after Reload, while the page
  shows. Expand shows the page in the large window of a Preview tab, as
  [Port previews](port-previews.md) says. The window names the file. It
  also closes when the files preview ends, because Reload and Open then
  need a new files preview, which only a show of the tab opens.
- On a phone, the file page also shows the frame, with Reload and Open in
  its header, and with no Expand.
- While the frame has the focus, every key goes to the frame, as
  [Where a key goes](keyboard-shortcuts.md#where-a-key-goes) says for the
  frame of a port preview.
- From the press until the page loads, the tab shows the "Opening preview"
  page of the launch page. It shows first while the app opens the files
  preview, then while the frame loads. So the member sees one wait.
- When the open fails, the tab shows the failure of a Preview tab: "The
  preview couldn't open", the message of the server, and Try again. Try
  again opens the files preview again. This holds for each failure except
  `file_server_unavailable`. Reason: a Preview tab and the launch page
  already show these states.
- The frame loads the page again when the workspace reports a change of
  the file. So an edit of an agent shows. A change of another file, such
  as a style file of the page, shows after Reload.
- The frame stays loaded while another tab shows, as the page of a Preview
  tab does. So a return shows the page as the member left it. Reason: the
  app cannot read or set the scroll place of a page from another site.
- While the cloud computer is stopped or starts, or after its later start
  failed, the tab keeps the page that it already shows, as a file tab
  keeps its file. Otherwise the tab shows the state of the cloud computer,
  as [Files and changes](workspace-tools.md#files-and-changes) says.
- An HTML file whose label hides a secret value has no Preview, and its
  tab shows Source.
  [Paths that hide a secret value](file-row-menu.md#paths-that-hide-a-secret-value)
  says which labels hide one. Reason: the address of the page holds the
  real path, and Open shows that address.
- An HTML file whose own name starts with a dot, such as `.draft.html`,
  has no Preview, and its tab shows Source. Reason: the files preview
  serves no dot file (HTML preview decision 2 D), so its page can never
  load.
- The page and the files that it loads have no read limit. The read limit
  of 5 MiB holds for Source.
- Source, Copy, and Download give the file as it is on disk. The changes
  that the [file server](file-server.md#local-file-addresses) makes apply
  only to the files preview.

## Older software

- When the runner of the workspace announces no file server, the tab
  shows a notice in place of the page: "Restart to preview this file". The
  notice says that the preview needs newer cloud computer software, and
  asks the member to select Restart in the workspace header. It has no
  button of its own. The header has no Reload and no Open, and Source
  still works. Reason: [Restart](restart-the-software.md) downloads the
  newest release before it restarts the runner.
- When the workspace leaves Starting, such as after a Restart or a
  resume, each HTML tab in Preview opens the files preview again: a tab
  that shows the notice, and a tab that kept its page.
- A show of the tab opens the files preview when the app keeps no live
  one: at the first show after a return to the workspace, after the files
  preview ended, and after a failed open. Reload loads the page again, and
  it opens a new files preview when the app keeps none. So a release that
  the runner installs while the workspace is idle shows the page at the
  next show of the tab.
- Reason for the open after a return: the files preview can end while the
  member is in another workspace, such as at a stop, and the page of an
  ended preview cannot load.
- Reason: a Restart shows Starting until the runner is ready, and a file
  tab already reads again when the state of the cloud computer changes. A
  new event for the file server was not chosen, because the open route
  already answers the current state.

## The files preview

- A workspace has at most one active files preview. It has a random
  hostname on the preview domain, as a port preview has. Each member loads
  it with grants and a cookie of their own, as for a port preview.
- `POST /api/orgs/{orgId}/workspaces/{workspaceId}/previews/files` opens
  the files preview of the workspace, or returns the active one. The reply
  gives the preview as the open of a port preview does: its ID, the port
  number 0, its launch address, and its expiry.
- The route needs a running cloud computer, with the checks and the
  refusals of the open of a port preview.
- The route also needs a connected runner that announced its file server.
  Otherwise it answers HTTP 409 with the error code
  `file_server_unavailable`. The tab then shows the notice of
  [Older software](#older-software).
- The route checks the announcement before the relay. So an older cloud
  computer gets `file_server_unavailable`, not
  `preview_relay_unavailable`.
- Each request of the files preview passes the checks of a port preview,
  with the credential cookie and the access of its viewer, as
  [Port previews](terminal-previews-and-desktop.md#port-previews) says.
- Each such request reaches the file server through the preview relay,
  with the files mark and the
  [preview origin](file-server.md#the-preview-origin). The cookie and header rules of a port preview apply
  to it. Each reply carries `X-Content-Type-Options: nosniff`.
- The Worker refuses a WebSocket upgrade of a files preview with the 404
  of an unknown preview, before any call to the cloud computer.
- A request of the files preview is not activity of the workspace, as for
  a port preview (decision 293).
- The files preview is no port preview. It has no Preview tab, and the
  Preview tool does not list it, as [Port previews](port-previews.md)
  says. The agent preview calls neither list, open, nor close it, as
  [Previews](section-and-preview-calls.md#previews) says.
- The files preview ends when the cloud computer stops and after 24 hours,
  as a port preview does. After its end, the next show of an HTML tab
  opens a new one. The new hostname gives the page new cookies and new
  storage.
- No close ends the files preview. A close of it through the app's route
  or the close call of an agent changes nothing, as for a preview that the
  workspace does not have. Reason: no screen offers a close for it, and on
  desktop no control ends a preview (decision 292).
- Risk: during a rollback, the previous Worker lists the files preview as
  a preview of port 0.

## Which files a page can load

[Files of an HTML page](html-page-files.md) gives the files that a page
can load, with HTML preview decision 2 and sandbox files decision 1.
