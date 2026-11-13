# Port previews

This doc holds the requirements and the decisions in force for the port
previews of the Preview tool. It belongs to
[Tools of a workspace](workspace-tools.md#port-previews). A decision
number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. A chat link
decision number names a decision of the change that makes each web
address of chat text a link, as [Chat links](chat-links.md) says.

- A preview shows in a frame inside the app, with an "Open" link that
  opens it in a new tab. Reason: Safari blocks the cookies of the
  previewed app inside a frame.
- The accessible name of the link is "Open in new tab". Reason: the user
  asked for the short label, and a screen reader user must still hear
  that the link opens a new tab.
- The port form lists the servers that listen in the sandbox, from the
  report of the runner (decision 220). The form shows when no preview is
  open, and after "+".
  [Listening ports](agent-runner.md#listening-ports) says which ports the
  list holds.
- Reason: a user often does not know the port, such as when an agent
  started the server. The report is ready when the form shows, and it
  needs no call to Boat.
- A check by the Worker through a Boat command while the form shows was
  rejected. It runs about 720 commands an hour for each open form, and Boat
  keeps each command record for 90 days. An answer of the runner on
  request was rejected, because no update arrives between two requests.
- Both a check and a report were rejected, because two paths must stay in
  step. An install of the newest runner at each start was rejected,
  because a start then takes longer and can fail in a new way. It also
  breaks the rule that only a build installs the software of a sandbox,
  which decision 148 kept for the terminal programs.
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
  [Terminal](workspace-tools.md#terminal) says (terminal links decision
  1 B).
- A click on a server opens its preview with the same request and checks
  as a typed port. A port that has an open preview leaves the list,
  because its tab shows it.
- A server joins or leaves the list within about 4 seconds after it starts
  or stops. Each open tab gets each new list, and a tab that opens later
  shows the latest list.
- The port field stays below the list, as a smaller "Other port" row. It
  uses the same preview checks for ports that the list leaves out.
- When the runner reports no server, the form asks the user to start one
  in the terminal, or to ask the agent. The field stays.
- When the app has no report, the form shows only the field. This holds
  for a sandbox whose runner does not report ports, such as one from an
  older org image, because only a build installs a new runner.
- When the sandbox stops, the workspace sends `ports.updated` with
  `ports: null` to the open tabs. A null list means that the app has no
  report. Reason: an old list would offer servers that the stop ended.
- The tab of an open preview shows the port and at most 10 characters of
  the name. A longer name shows 9 characters and "…". The tab shows no
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
  request. The address then names the preview.
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
  Preview tool.
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
