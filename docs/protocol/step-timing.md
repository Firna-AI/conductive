# Step timing

This doc holds the requirements and the decisions in force for the
`Server-Timing` header of the replies of the Worker. It belongs to
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
