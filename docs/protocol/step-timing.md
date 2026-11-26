# Step timing

This doc holds the requirements and the decisions in force for the
`Server-Timing` header of the replies of the Worker, and for the
[job step records](#job-step-records) of builds and starts. It belongs to
[Access and security](access-and-security.md). The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says. A create-speed decision number names a decision of the change that
made the create of a workspace answer sooner. A preview timing decision
number names a decision of the change that added the header to the
previews.

## The rule

Create-speed decision 2 puts one rule for every `Server-Timing` header of
the app here. A rule in the create doc only was rejected, because each
route with a header would then repeat the limits. A create reply without
the header, with the durations in the Worker log, was rejected, because a
measurement then needs access to the Worker logs.

- Two replies of the Worker carry a `Server-Timing` header, with the
  duration of each step of the Worker:
  - each preview reply that passes every check (preview timing decision
    1), with the steps that
    [Terminal, previews, and desktop](terminal-previews-and-desktop.md)
    gives
  - the 201 reply of the [create of a workspace](create-a-workspace.md#the-create)
    (create-speed decision 1)
- Reason: only these durations show where a slow request waits.
- The steps of a create are `create`, `message`, and `project`. `create`
  holds the access checks, the plan of the workspace, and the wait until
  the workspace and its first message are stored. `message` gives the
  queued first message. `project` gives the state of the workspace for
  the reader.
- Each such header holds fixed step names and whole milliseconds, and no
  ID, address, or secret (create-speed decision 2).
- A refused request gets no such header, so a refusal does not show which
  check failed.
- A reply that gets a `Server-Timing` header later follows the same rules.
  Its doc names its steps here.

## Job step records

The perf work of November 2026 needs to measure each change from real
jobs. Cal chose these rules on 18 November 2026: one database record for every
kind of job (step decision 2), the step boundaries below (step decision
3), 90 days of retention (step decision 4), and no view for users (step
decision 5). A step decision number names a decision of the change that
added these records.

- The app records the begin and the end of each step of each build,
  refresh, create, and resume of a workspace (step decision 2).
- A step is each phase of the job, the request for its cloud computer,
  the wait until that computer is ready, and each start step that the
  workspace shows (step decision 3).
- Each run of a start also gets one record. A run is one piece of the
  start work, from the time that it was due to the real end of its work.
  The record gives its waits for the chat queue, the count and the time of
  its provider calls, command polls, and database calls, and the name and
  the time of its slowest call (step decision 3).
- Reason: the waits between steps and inside each run are the largest
  part of a start. Records of the steps alone cannot show them.
- Each record holds fixed step names, the IDs of the job, the org, and the
  workspace, the times, the outcome, and the version of the Worker. It
  holds no step label, address, or secret. Reason: a label can hold the
  name of a repository or a branch.
- A record never fails or holds back the job that it measures.
- Only operators and agents read the records, through the database. The
  app shows them to no user (step decision 5). Reason: the goal is
  measurement. Step lengths in the build log and a panel in the operator
  section were rejected, because each changes what a screen shows for a
  measurement need.
- The app deletes each record after 90 days (step decision 4), and with
  its org. Reason: the perf work compares weeks. A record for the life of
  the org was rejected, because the records can grow to many gigabytes.
- Disk retention restarts, software image builds, and Continue get no
  records yet.
