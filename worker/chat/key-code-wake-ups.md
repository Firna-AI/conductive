# Wake-up key code

These files belong to the [chat backend](README.md#wake-ups).

- [session-wake-ups.ts](session-wake-ups.ts) owns the queue work for
  schedule, tool cancel, delivery, and the alarm.
- [session-wake-up-records.ts](session-wake-up-records.ts) keeps the
  pending, repeat, and resume indexes. It retains the final state and the
  session ID so Cancel can answer a request for a known ID.
- [session-wake-up-delivery.ts](session-wake-up-delivery.ts) checks the
  org and records the fired message or the cause that ended the wake-up.
  Message acceptance and the resume receipt commit together.
- [wake-admission.ts](wake-admission.ts),
  [wake-message.ts](wake-message.ts), and [wake-resume.ts](wake-resume.ts)
  share the access check, hidden message write, and computer resume with
  session watches.
- [session-wake-up-route.ts](session-wake-up-route.ts) reads the browser
  snapshot and authorizes a member cancel through the chat gate.
  [session-wake-up-cancel.ts](session-wake-up-cancel.ts) commits the end
  line for either cancel source.
- [session-wake-up-repair.ts](session-wake-up-repair.ts) repairs sources
  of restored orgs in batches. It keeps a cursor in the repair receiver.
  The workspace object keeps the wake-ups and their due times.
- [read-wake-up.ts](../../src/chat/api/read-wake-up.ts) reads the browser
  replies and events. [wake-up-markdown.ts](../../src/shared/transcript/wake-up-markdown.ts)
  uses the shared mockup words for the copy and the tool transcript.
