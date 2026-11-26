# Service reports

This page belongs to [Services](services.md). It states the messages of
services between the agent runner, the Worker, and the app, the data that
the Worker keeps, and older software. The terms are those of
[Services](services.md#terms) and of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says. A services decision number names a decision of the change that adds
services, as [Services](services.md) says. A design call named here is a
design call of 20 November 2026 of that change.

## The runner and the Worker

- The runner protocol version stays 2 (design call). A runner that
  supports services says so in its hello. A Worker that supports them
  accepts them in its welcome. Only such a connection carries service
  messages.
- Reason: an optional field of the hello needs no new protocol version, as
  for the [file server](agent-runner.md#the-agent-runner).
- Any other connection carries no service message, and it works as before.
- Service messages are not numbered runner events. They never wait among
  the unconfirmed events of the runner, and the event numbers of a stream
  stay as they are (design call).
- Reason: after a rollback, the previous Worker must get no service message
  that it cannot read. A Worker refuses a runner event of an unknown type,
  as [The agent runner](agent-runner.md#the-agent-runner) says.
- Each report holds the full list of the services of the cloud computer,
  also when it is empty. It carries the boot ID of the current run of the
  cloud computer, and a revision.
- The runner sends a report after each accepted connection and after each
  change of a service.
- The Worker keeps the latest report. A report of another boot ID replaces
  the kept report. A report of the same boot ID replaces it only with a
  higher revision. So an older or a repeated report changes nothing.
- After each start of the runner, its next report gives the actual state
  of each service unit. Reason: a service can end while no runner runs,
  such as during a restart of the runner.
- Each control carries a request ID and the generation that the app saw. A
  repeated delivery of one control acts at most once. The runner answers
  with the result of the control and a new report.
- Each service message meets the
  [envelope limit](agent-runner.md#the-agent-runner) of the runner. A
  larger report or log read goes in private parts or pages. A part can
  split the source text of a field, such as a long name.
- The Worker joins the parts into the complete text of each field before
  it filters, stores, or shows that text. No service is left out.
- Reason: the change adds no limit to names, labels, or the count of
  services, as [Names and runs](services.md#names-and-runs) says. A filter
  of complete text also hides a secret value that crosses two parts.
- The runner keeps each public label complete until the Worker filters
  secret values, as for a [port label](listening-ports.md). No service
  message holds a definition, another argument of a command, or an
  environment value.

## The Worker

- The workspace filters the public text of each report before it stores or
  sends that text, as
  [The text of a row](services-in-the-app.md#the-text-of-a-row) says.
- The workspace keeps the latest report and each waiting control apart from
  its chat records and its chat commands (design call). So the previous
  Worker never reads them as its own data.
- Services add no D1 table and no D1 column (design call). Reason: their
  data lives only for one run of the cloud computer.
- A report and a control belong to no turn, and they add no activity, as
  [Activity](services.md#activity) says.
- When the cloud computer stops, the workspace clears its report and ends
  each waiting control. Reason: an old list would offer services that the
  stop ended.

## The Worker and the app

- The app reads the list, sends Stop and Restart, and reads the logs
  through routes of the workspace (design call).
- Each route checks the rights that
  [Access](services-in-the-app.md#access) gives.
- The events socket of a tab gets no new kind of top-level message (design
  call). Reason: an older copy of the app, such as an older Mac app,
  refuses an unknown top-level message.
- A port entry of a port report can name the service that owns its port,
  as an optional field. An older app ignores that field.

## Older software

- A runner without services, such as an older runner, gives no services.
  The Preview tool then shows as before, as
  [The list](services-in-the-app.md#the-list) says. An update of the
  [sandbox software](sandbox-software.md#updates) brings services.
- A Worker without services gets no service message, so a rollback of the
  Worker keeps working with a new runner.
- An older copy of the app keeps its port list and its navigation. It
  shows no services, and its port list keeps its shape.
