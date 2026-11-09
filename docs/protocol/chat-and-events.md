# Chat and events

This doc holds the requirements and the decisions in force for the chat of
a workspace. This page holds the events that reach the browser. Linked
pages cover [the agents and the sessions](agents-and-sessions.md),
[the messages and what the chat shows](messages-and-turns.md),
[the workspace links in chat](workspace-links.md), and
[the agent runner](agent-runner.md) in the sandbox. The terms are those of
the [architecture doc](../architecture.md#terms). A decision number names
a dated record, as [Decision numbers](../architecture.md#decision-numbers)
says.

## Agents

- [Agents](agents-and-sessions.md#agents) says which agents the app
  offers, where they run, and whose agent login each session uses.
- [Agent instructions](agent-instructions.md) states the text that each
  session gets apart from the messages, and the sender line of each
  message.

## Names in the product

- [Names in the product](agents-and-sessions.md#names-in-the-product) says
  how user-facing text names the agents.

## Sessions

- [Sessions](agents-and-sessions.md#sessions) says how the sessions of a
  workspace show as tabs, take their titles, and close.

### The tab row

- [The tab row](agents-and-sessions.md#the-tab-row) says how the tabs of
  the centre column keep their order, move, and open their tab menu.

## Workspace and session names

- [Workspace and session names](agents-and-sessions.md#workspace-and-session-names)
  says when the app names a workspace or a session.

## Messages

- [Messages](messages-and-turns.md#messages) says how the composer sends a
  message, which login the message uses, and how Stop and Try again work.

## Workspace links

- [Workspace links](workspace-links.md) says how chat text and the message
  field of each composer show a link to a workspace of the org, as a chip.

## What the chat shows

- [What the chat shows](messages-and-turns.md#what-the-chat-shows) says
  what the chat shows before, during, and after a turn.

### The work of a turn

- [The work of a turn](messages-and-turns.md#the-work-of-a-turn) says how
  the work before the answer of a turn folds into one line.

## Events

- The browser gets chat events only in the app's own event type. No SDK
  event type and no provider event type reaches the browser.
- Reason: one event type serves both agents, and the web app needs no
  change when an SDK changes its events.
- Every open tab of a workspace gets the same events in the same order.
- A tab that opens gets the stored history first, then the live events.
- The Durable Object of the workspace stores every event, so the chat
  survives a stop of the sandbox.
- A tab keeps the chat of each workspace that it showed in memory. A
  return to that workspace shows the chat at once, then gets only the new
  events (decision 87).
- A reload or a new tab starts empty. No chat stays on the disk of the
  device.
- A cache on the disk was rejected, because the chat, with its code and
  any secret that an agent printed, would stay on the device.
