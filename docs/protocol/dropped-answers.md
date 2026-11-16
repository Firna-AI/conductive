# Dropped answers

This doc holds the requirements and the decisions in force for a model
answer that drops before it is complete. It belongs to
[Messages and attachments](messages-and-attachments.md), which covers the
messages of a session. The terms are those of the
[architecture doc](../architecture.md#terms). A stream drop decision
number names a decision of the change for model answers that drop before
they are complete. The gateway side of a drop is in
[Streams](model-gateway-requests.md#streams).

## The continue message

- A drop is a model answer that ends before it is complete, such as when
  its connection closes. The drop cuts the reply of the agent. The part of
  the reply that arrived stays in the chat.
- After a drop in a Claude turn, the runner sends the agent one continue
  message in place of a failure (stream drop decision 2). The turn keeps
  running, so Stop works as in any running turn.
- Reason: the gateway cannot prevent every drop. Claude does not send a
  model request again after part of its answer arrived.
- A Continue action for the member was rejected, because the member must
  first notice the failure. An automatic Try again was rejected, because
  it gives the agent the whole request again.
- The continue message asks the agent to continue from where it stopped,
  with no repeat of work that is done. It asks the agent to start its
  reply with one short sentence that says that the connection to the
  model dropped (stream drop decision 3).
- The agent writes that sentence, so its words can vary. A line of the app
  at the cut was not chosen, because it needs new event data, an app
  change, and a mockup.
- The chat does not show the continue message. The reply to it answers
  the same messages as the cut reply. So the turn ends only when the agent
  finishes.
- A drop in a reply after a notification of
  [background work](agent-runner.md#background-work) gets a continue
  message too. The reply to it then answers no message, as the cut reply
  did.
- Each start of the agent program gets at most one continue message. A
  second drop fails the turn, which names the cause.
- A Codex turn gets no continue message. Reason: Codex connects again by
  itself after its answer stream drops.
