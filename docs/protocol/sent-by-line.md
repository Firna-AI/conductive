# The `Sent by:` line

This page holds the requirements and the decisions in force for the line
that ends the text of each tool message. It belongs to
[Session calls](session-calls.md), which defines a tool message and the
calls that send one. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says. The [mockup catalogue](../mockups/catalogue.md) draws a message with
this line at `app/workspace-links/sent-by`.

## The line

- The Worker adds a blank line, a `---` line, and a `Sent by:` line at the
  end of the text of each tool message (decision 259).
- The `Sent by:` line holds `Sent by:`, a space, and the session link of
  the calling turn (decision 261).
- The text before these lines stays exactly the text of the call.
- The stored message holds these lines. So the agent, the chat, a copy,
  and a read all show them.
- The chat shows the lines as text, as it shows the text of each message.
  Only the session link shows as a session chip, as
  [Session chips](workspace-links.md#session-chips) says.
- The title request of a new workspace reads only the text before these
  lines, as
  [The title of a new workspace](workspace-and-session-names.md#the-title-of-a-new-workspace)
  says.
- Reason: members and agents see which session sent the message. The run
  text of an automation also puts its facts after a `---` line, as
  [The run text](automation-runs.md#the-run-text) says.
- Risk: a member or an agent can type the same lines. So the lines inform
  the reader only, and no access depends on them.
- No mark, and a mark in the sender line only, were rejected. A member
  would then take the text as the words of the member who sent it.
- A mark that each reader builds from a field of the message was rejected.
  It needs a new field, and changes in the history, the copy, and the
  chat.
- A line at the start of the text was rejected, because the first line of
  a first message becomes the title of its session.
