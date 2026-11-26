# Port previews

This doc holds the requirements and the decisions in force for the port
previews of the Preview tool. It belongs to
[Tools of a workspace](workspace-tools.md#port-previews). A decision
number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. A chat link
decision number names a decision of the change that makes each web
address of chat text a link, as [Chat links](chat-links.md) says. A
terminal links decision number names a decision of the change that makes
the addresses in the terminal open, as [Terminal](terminal.md) says.

- On desktop, each previewed port has its own Preview tab in the tab row
  of the centre column, beside the session, file, and diff tabs
  (decisions 288 and 291). The page of the preview fills the tab, in a
  frame. Reason: the frame in the tools panel was too small to use the
  page. The user chose this on 13 and 16 November 2026.
- One shared Preview tab, whose page follows the preview that the user
  picks, was rejected. The user opens many ports at the same time.
- A bar over the page holds Reload and an "Open" link that opens the
  preview in a new tab. Only a Preview tab has this bar. The Preview tool
  in the tools panel has no bar on desktop. The user asked for this on 13
  November 2026, because the bar of the tool is not needed when the page
  lives in the centre.
- Reason for "Open": Safari blocks the cookies of the previewed app inside
  a frame.
- On desktop, the bar also holds Expand, after Reload. Expand shows the
  page in a large window over the whole app, on the dim layer of a dialog.
  The header of the window names the page with the label of its tab, and
  holds Reload, Open, and Close. The user asked for this on 20 November
  2026, so a page is easy to view in a larger size.
- Close, Escape, and a press on the dim layer close the window, and the
  page stays in its tab. The window also closes when another tab shows or
  the page goes, such as when the cloud computer stops. While the window
  shows, the keys of the app run no command, and Tab stays in the window.
- The window shows the same frame, so the page keeps its state: its
  address, its scroll place, and its sign-in. A new frame in the window
  was rejected, because it loads the page again at the root address of
  the preview. This is a design call of 20 November 2026.
- A phone has no Expand, because its Preview page already shows the page
  across the whole width of the screen.
- On a phone, the Preview page shows the page in a frame, with a bar of
  the tabs of the open previews, "+", Reload, and Open. Reason: a phone has
  no tab row of files, so it shows no Preview tab.
- The accessible name of the link is "Open in new tab". Reason: the user
  asked for the short label, and a screen reader user must still hear
  that the link opens a new tab.
- The port form lists the servers that listen in the sandbox, from the
  report of the runner (decision 220). On desktop, the tool always shows
  the form, with no "+" (decision 290). On a phone, the form shows when no
  preview is open, and after "+".
  [Listening ports](agent-runner.md#listening-ports) says which ports the
  list holds.
- Above the servers, the form lists the [services](services.md) of the
  workspace, as [The list](services-in-the-app.md#the-list) says. A port
  that a service owns shows only in the row of its service.
- Reason: a user often does not know the port, such as when an agent
  started the server. The report is ready when the form shows, and it
  needs no call to Boat.
- A check by the Worker through a Boat command while the form shows was
  rejected. It runs about 720 commands an hour for each open form, and Boat
  keeps each command record for 90 days. An answer of the runner on
  request was rejected, because no update arrives between two requests.
- Both a check and a report were rejected, because two paths must stay in
  step. An install of the newest runner at each start was rejected,
  because a start then takes longer and can fail in a new way.
- An older sandbox gets a runner that reports ports with an update of its
  software, as [Updates](sandbox-software.md#updates) says (sandbox
  software decision 1). Sandbox software decisions are the decisions of
  the change that makes the sandbox software update itself.
- Each server is a button with its port, its program name, and its folder,
  when the report gives them (decision 221). A folder that does not fit
  keeps its end, after "…".
- Reason: the port alone does not say which server it is, and two servers
  of one program differ only by their folder. The full command line was
  rejected, because it can hold a token or a password.
- The title of the page of each server was rejected, because the runner
  then sends each server a request that the user did not make.
- A link to a local address in the terminal opens the preview of its port
  with the same request and checks as a typed port. A preview of that port
  that is open already shows with no new request. The path, the query,
  and the hash of the address do not carry over, as
  [Links](terminal-links.md#links) says (terminal links decision
  1 B).
- A click on a server opens its preview with the same request and checks
  as a typed port.
- On desktop, the list holds each port: each server of the report that no
  service owns, then each port with a Preview tab or an open preview that
  the report does not name, as `Port 8080`. A click on a port shows its
  Preview tab when it has one. Else a new Preview tab opens at the end of
  the row and shows (decision 291). The row of the port whose tab shows is
  the current one.
- Reason: the tool opens many ports at the same time, and a port with a
  tab must stay reachable from the tool.
- On a phone, a port that has an open preview leaves the list, because its
  tab shows it. The row of a service stays, with each of its ports.
- A server joins or leaves the list within about 4 seconds after it starts
  or stops. Each open tab gets each new list, and a tab that opens later
  shows the latest list.
- The port field stays below the list, as a smaller "Other port" row. It
  uses the same preview checks for ports that the list leaves out.
- When the runner reports no server, the form asks the user to start one
  in the terminal, or to ask the agent. The field stays. When the software
  gives services, the Services section takes the place of that request.
- When the app has no report, the form shows only the field. This holds
  for a sandbox whose runner does not report ports, until an update gives
  it a newer runner.
- When the sandbox stops, the workspace sends `ports.updated` with
  `ports: null` to the open tabs. A null list means that the app has no
  report. Reason: an old list would offer servers that the stop ended.
- A Preview tab, and the tab of an open preview on a phone, shows the port
  and at most 10 characters of the name. A Preview tab also shows a globe
  icon. A longer name shows 9 characters and "…". The tab shows no
  folder. A port that the latest list does not name shows `Port 3000`.
- The tooltip and the accessible name of the tab give the port, the full
  name, and the folder. Reason: the user asked for a short tab label, and
  the cut label must not hide which server the tab shows.
- A press on a local address in chat text opens the preview of its port,
  in the workspace of the chat (chat link decision 2 C). It uses the same
  request and checks as a typed port, as a click on a listed server does.
  [Local addresses](chat-links.md#local-addresses) says which
  addresses are local, and which port each one names.
- The link of a local address is the address of the Preview tool with
  that port. That address opens the preview of the port, also in a new
  tab. A port that has an open preview shows that preview, with no new
  request. On desktop, the address shows the Preview tab of the port, and
  it keeps naming the port. On a phone, the address then names the
  preview.
- The path, the query, and the hash of the local address do not carry
  over. So the preview opens at the first page of the server.
- Reason: an agent gives the local address of a server that it started in
  the sandbox. A press that opened the computer of the reader would show
  an error page or another server.
- A press that opens the port form, where a second press opens the
  server, was rejected, because one press can open it. A preview address
  in place of each local address of the text was rejected, because the
  app would then open previews by itself. An agent tool that gives the
  preview address was rejected, because answers still copy local
  addresses from the output of servers.
- Nothing opens by itself, and no notice of a server shows outside the
  Preview tool. A Preview tab that the user shows opens the preview of its
  port, as [Preview tabs and the end of a preview](#preview-tabs-and-the-end-of-a-preview)
  says.
- A name and a folder are text that screens show. So the filters of
  [Secrets that users enter](tokens-and-secrets.md#secrets-that-users-enter)
  hide each secret value in them.
- Some servers accept only requests to their local address, such as a dev
  server that checks `Host`. Such a server works in a preview with no change
  to its repository (decision 218).
  [Port previews](terminal-previews-and-desktop.md#port-previews)
  states the `Host` and the `Origin` that the server gets.
- A workspace whose cloud computer has no running relay refuses previews.
  The user starts a new workspace after an admin runs Build computer.
- The sandbox keeps port 7682 for the relay. A preview of port 7682 shows
  an error.
- The sandbox keeps port 7683 for the
  [file server](file-server.md). A preview of port
  7683 shows an error, because the file server answers only the requests
  of the files preview.
- The [files preview](html-file-preview.md#the-files-preview) of the HTML
  file tabs is no port preview. It has no Preview tab, and the Preview
  tool does not list it. The agent preview calls neither list nor close
  it.

## Preview tabs and the end of a preview

- A Preview tab names a port, not a preview. Each member has their own
  tabs in each workspace, in the one order of the tab row, as
  [The tab row](agents-and-sessions.md#the-tab-row) says.
- A port has at most one Preview tab.
- Close on a Preview tab removes only the tab, and ends no preview
  (decision 289). Reason: a tab is a view of the preview.
- On desktop, no control ends a preview (decision 292). A preview stays
  open until the cloud computer stops, 24 hours pass, or an agent closes it
  (decision 294). On a phone, the Close of a tab of the Preview page still
  ends its preview.
- Use of a preview never keeps the cloud computer running (decision 293).
  A preview works while the computer runs, but it never makes the computer
  run longer, as [Stop and resume](workspace-life.md#stop-and-resume)
  says.
- No screen shows the time that a preview has left.
- When a Preview tab shows and its port has no open preview, the app opens
  one, with no notice. A show is a click on the tab or on its port, a visit
  to its address, or Reload. Two open previews of one port, such as one
  that an agent opened, show the oldest one.
- Reason: a new preview costs the user nothing but a new load of the page,
  so an end needs no control and no notice. The user chose this on 16
  November 2026.
- A new preview gets a new address, so the previewed app loses its cookies
  and its storage after an end.
- A show of a Preview tab resumes a stopped cloud computer, as the show of
  a file tab does. While the computer does not run, the tab shows its
  state in place of the bar and the page. While a Resume runs, it shows
  the wait of a start, as [The resume](stop-and-resume.md#the-resume)
  says.
- A page stays loaded while another tab shows, so a return does not load
  it again while its preview lives.
- Close of a tab of the tool, Close preview in the centre bar, and an end
  after a time without use were rejected. A clock for each preview, which
  each request or the shown tab resets, was rejected too. The stop of the
  computer already follows a time without use.
- A count of the user's clicks and keys in the frame as activity was
  rejected. The user chose that no use of a preview keeps the computer
  running.
