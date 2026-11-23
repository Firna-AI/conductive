# Session watch key code

These entries belong to the [chat backend](README.md) and implement
[Session watches](../../docs/protocol/session-watches.md).

- [session-watches.ts](session-watches.ts): `SessionWatches`, durable target delivery and caller resume through separate queue phases.
- [session-watch-records.ts](session-watch-records.ts): `SessionWatchRecords`, paginated target watches, durable caller receipts, and session Stop nonces.
- [session-watch-registration.ts](session-watch-registration.ts) records exact-turn intent in the target queue.
- [session-watch-end.ts](session-watch-end.ts) records normalized ends and reconciles retained terminal facts.
- [workspace-store.ts](workspace-store.ts) requests an earlier watch alarm from the committed turn-end hook. The pre-armed alarm retains recovery ownership.
- [session-watch-notice.ts](session-watch-notice.ts) commits the hidden message, command, mapping, app notice, and receipt together.
- [session-watch-admission.ts](session-watch-admission.ts) applies the caller's current access and fixed-login sender rule.
- [session-watch-resume.ts](session-watch-resume.ts) follows the notice's current message mapping and admits a normal resume in the caller queue.
- [session-watch-stop.ts](session-watch-stop.ts) removes pending wake commands in the explicit session Stop transaction and retains their history.
