# Retries

This guide belongs to the [chat backend](README.md). It gives the stored
retry state and the rules of the retry route.

[Messages](../../docs/protocol/messages-and-turns.md#messages) states the
rules. `Session.retryMessageId` names the one message that the retry route
accepts. It is the only public part of the retry state.

- `ChatTransaction.newestTurn` and `saveNewestTurn` keep the ID of the
  newest turn of each session under the `chat:v1:newest-turn:` prefix. This
  internal record never reaches a tab.
- Each accepted message records its turn there, also a running turn that it
  joins. It also sets `retryMessageId` to null.
- The end of the active turn sets `retryMessageId` to the retry message of a
  failed end. It does so only when that turn is still the newest turn. Every
  other end sets null.
- A refused end has no retry message, so it sets null.
- A turn that waits counts as the newest turn, also after a Stop ends it
  before it starts.
- When the newest turn finishes, a continuation of its unanswered messages
  becomes the newest turn.
- The session record and its `session.updated` event commit in the same
  transaction as the change that sets the field.
- A missing message, or a message of another session, gets
  `404 message_not_found`. Each other message that the record does not name
  gets `409 retry_not_available`, and the route writes nothing.
