# Services in the app

This page belongs to [Services](services.md). It states the services of
the Preview tool, who may read and control them, Stop and Restart with
their results, the log view, and the text of each row. The terms are those
of [Services](services.md#terms) and of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says. A services decision number names a decision of the change that adds
services, as [Services](services.md) says. A UI call is a design call of
20 November 2026 of that change. The
[mockup catalogue](../mockups/catalogue-workspace-tools.md) draws each
state at `app/tools/services` and its child pages.

## The list

- The Preview tool lists the services of the workspace under the heading
  Services, above its servers (services decision 19 A). The servers follow
  under the heading Servers, then the Other port row. This holds on
  desktop and on a phone.
- The list holds each service of the latest report: running, stopped,
  ended, and failed, also a service with no port.
- Reason: a member finds each service beside the ports that the member
  opens. A service with no port, and the result of an ended run, stay
  reachable.
- A separate Services tool was not chosen, because it changes the
  navigation and the saved views. Marked Terminal tabs for services were
  not chosen, because they need new terminal transport, and the output of a
  terminal has no secret filter (services decision 19 A).
- The rows are in the order of their names (UI call). Reason: a Restart
  then keeps the row in its place.
- Each row has three lines (UI call):
  - the name, the program, and the folder, then Show log and the menu
  - the state, its time, and the [source](#the-source)
  - each port of the service, or "No port"
- The name, the program, and the folder shorten to fit. Their tooltip and
  their accessible name give them in full. Show log and the menu keep their
  place, and the ports wrap to more lines. Reason: no count of ports can
  push the controls out of view.
- A port that a service owns shows only in the row of that service. The
  rows under Servers are the servers that no service owns (UI call).
  Reason: each port then shows once.
- A press on a port opens its preview with the same request and checks as
  a typed port, as [Port previews](port-previews.md) says. On desktop, the
  port of the shown Preview tab is the current one, as for a server.
- On a phone, the list shows with the port form: when no preview is open,
  and after "+". A service stays in the list while a preview of its port is
  open (UI call). Reason: its row also holds its state, its log, and its
  controls.
- The list follows the latest report, with no reload of the page.
- When the software of the cloud computer gives no services, the Services
  section does not show, and the tool shows as before (UI call). Reason:
  no support differs from an empty list.
- When the report holds no service, the section shows one line: "Ask the
  agent to start a server as a service, which runs until the cloud
  computer stops."
- While the cloud computer does not run, the tool shows the state of the
  cloud computer, as each tool does. A stop ends each service, so no list
  of an earlier run shows.
- No control of a service ends a preview, and the close of a preview stops
  no service (services decision 19 A). Each Preview tab of a port stays
  after a Stop or a Restart of its service. Reason: a tab is a view of a
  port, as
  [Preview tabs and the end of a preview](port-previews.md#preview-tabs-and-the-end-of-a-preview)
  says.

## Access

- Each member who can read the workspace can read its list and the logs of
  its services (services decision 19 A).
- Stop and Restart follow the access rule of
  [Restart](restart-the-software.md#restart) in the workspace header. Every
  member of an org that is not suspended can stop and restart the services
  of a workspace whose owner is not suspended.
- A reader without that right gets no menu and no Stop question (UI call).
  Show log stays. The state in the header then shows as plain text, as for
  Restart.
- The Worker checks this right at each control, as it does for Restart. It
  also refuses a control while the cloud computer does not run.
- The source of a service gives no right.
- Reason: services are shared programs of the workspace, as its terminals
  are, and a Restart of the software already uses this rule.
- Controls only for the workspace owner and the admins, and controls only
  for the starter of a service, were not chosen. Reason: they block normal
  team work, and a terminal has no reliable starter.
- The agents control services only through the local
  [service calls](service-calls.md).

## Stop and Restart

- The menu of a row holds Restart, then Stop (UI call). On a phone, the
  menu opens as a sheet.
- Stop asks first, in a dialog on desktop and in a sheet on a phone
  (services decision 19 A). The question names the service, such as "Stop
  web?". It says "It ends for everyone in this workspace. Restart runs it
  again." Stop confirms in the danger tone, and Cancel changes nothing.
- Reason: a Stop ends a server for each member, as the close of a terminal
  does.
- Stop is off while the service does not run.
- Restart runs at once, with no question (services decision 19 A). It also
  works for a service that is stopped, ended, or failed. Reason: a Restart
  brings back the same server.
- A question before both controls, and no question at all, were not
  chosen.
- While a control runs, its row shows Stopping… or Restarting…, and its
  menu is off (UI call). Its ports and Show log stay.
- Each control names the service and the generation that the app saw
  (services decision 19 A).
- A control for a generation that is no longer current changes nothing.
  The app then shows an information toast, such as "Stop didn't run." with
  "web started again first. The list shows its latest state."
- Two Restarts of one generation give one new run. The later Restart then
  names a generation that is no longer current, so it changes nothing.
- A failed control shows the failure toast of the app with the message of
  the server, such as "Couldn't stop web." or "Couldn't restart web.".
- When the result of a control does not arrive, because a connection ends
  first, the app shows a warning toast, such as "Stop of web is
  unconfirmed." (services decision 19 A). The list then shows the actual
  state from the next report.
- The app sends no control again by itself. The member checks the state
  before a new try.
- Reason: a lost reply does not prove whether the control ran. A second
  control could restart a server twice, and a control that names its
  generation is safe to try again.
- A control that waits when the cloud computer stops ends with no effect.
  It never runs after a resume. Reason: a control for a run of an earlier
  start of the cloud computer must not act on a new run.
- A resend of a waiting control after a new connection, and a wait of 30
  seconds before Unconfirmed, were not chosen. Reason: a resend can run a
  control twice, and the wait adds a timer and a second result.

## The log view

- Show log opens the log of a service, in a wide dialog on desktop and in
  a sheet on a phone (services decision 19 A). Each reader of the workspace
  has Show log.
- The view shows the state and the program of the service above the
  output. The output shows as plain text, which wraps and scrolls.
- The view holds Reload and Close. Reload reads the log again. After a
  failed read, the view says "The log couldn't load.", and Try again takes
  the place of Reload.
- A log with no output yet says "Output shows here when web prints it.",
  with the name of the service.
- Each read gives at most the last 200 lines and the last 64 KiB, or
  65,536 bytes, of the log (services decision 19 A). When the log holds
  more, a line says "Earlier output is left out."
- Each read filters the complete log before it keeps the end. The filters
  of [Secrets that users enter](tokens-and-secrets.md#secrets-that-users-enter)
  hide each exact copy of a secret value. So no cut splits a hidden value.
- Each read filters the log again. So a value that the filters learn later
  is hidden at the next read.
- A read adds no activity, as [Activity](services.md#activity) says.
- A saved tab for a log, a log inside the list, and a terminal that
  follows the log were not chosen (services decision 19 A). Reason: the
  dialog gives the log room, with no new kind of saved tab.

## The text of a row

- The program of a service follows the name rule of
  [Listening ports](listening-ports.md): the file name of the program, or
  of the script of a known interpreter, with a next word of 1 to 20
  lowercase letters and hyphens (services decision 19 A). Its folder
  follows the folder rule of that page.
- The workspace filters the complete name, program, and folder before it
  stores or sends them. It then keeps at most 40 characters of the program
  and at most 120 characters of the folder, as for a port.
- The name has no cut. The row shortens it on the screen only.
- The other arguments of the command, and each environment value, stay in
  the cloud computer. Reason: an argument can hold a token or a password,
  as for the servers of [Port previews](port-previews.md).
- Risk: a password of lowercase letters alone can still pass as the next
  word, as for a port.
- No command field, and the full command after the filter, were not
  chosen. Reason: the first does not tell two servers of one program
  apart, and the filter hides only known secret values.
- The time of a row is relative, such as "Started 12m ago", or "Exit code
  1 · 2m ago" after an end.

### The source

- The source names the session that started the service when the Worker
  matches the turn context of the Start to a turn of that session, in its
  own records (services decision 19 A). The row shows the title of that
  session as a link to it.
- Otherwise the source is Local command, such as for a Start from a
  terminal.
- A Restart keeps the source of the Start, because it runs the same
  definition.
- The source is context, not proof of the person who started the service.
  It names no member, and it gives no right. Reason: each process of the
  cloud computer can read the turn ID of a running turn, and a terminal
  has no signed-in member.
- The name of the sender of that turn, and no source at all, were not
  chosen. A label that the cloud computer gives was rejected, because the
  code of a repository can give any label.
