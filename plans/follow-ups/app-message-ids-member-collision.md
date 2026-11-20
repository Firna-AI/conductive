# App message IDs can collide with member IDs

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-20, from the branch `calummoore/resuming-agent-on-timeout-fg44`, the wider fix F of review finding 1 and the late-answer part of review finding 4.
- **Location:** `worker/chat/secret-notice.ts:33-35`, `worker/chat/send-message.ts:109-142`, `worker/chat/chat-records.ts`.
- **Reason:** the late-answer notice is on `origin/main`, outside the scope of the branch that found the class.

- **Terms:**
  - **App message:** a message that the app writes into a session, which the chat does not show as a member message. Examples are the late-answer notice and the continuation message after a provider stop.
  - **Late-answer notice:** the app message that tells the agent that a member answered its secret request late.
- **Background:** App messages and member messages share one message store, keyed by message ID. A member's client chooses the ID of each member message, and the route accepts any nonempty ID. The branch fixed the continuation message: it now gets a fresh random ID with the `continuation:` prefix, and no code finds it by a derived ID. Its Try again also sends a new hidden app message.
- **Problem:** The late-answer notice still uses the derived ID `secret-notice:<request ID>`, and members can read the request ID in `secrets.request.updated` events. A member message with that ID makes a late answer count as sent, so the agent never gets the notice. Try again on a failed late-answer turn also sends the notice text again as a visible message of the member who presses it. A Try again of a failed late-answer turn by a member without the session's login sends the notice to a new linked session, whose agent never made the secret request. A member's own message with an ID that starts with `continuation:` is treated as an app message: the chat hides its linked reply, and it does not move a chain start.
- **Impact if no action:** A late answer can be lost without notice, and the chat can show the app's notice text as a member message.
- **Root question:** How does the app keep its own messages apart from member messages in the shared message store?
- **Options:**
  - **A.** Fix only the late-answer notice. Store a sent notice in an app-only record keyed by the secret request. Give the notice a fresh prefixed ID. Read an older notice by its old derived ID only when that message has the sender and the text of the notice. Make Try again of a notice send a new hidden notice. Effort: Medium.
  - **B.** Do A, and add one helper that creates every app message with a fresh prefixed ID, and one rule in `worker/chat/README.md`: no code finds app state by an ID that a member can choose. Move the continuation message to the helper. Effort: Medium.
- **Left out:** Server-assigned IDs for every message, because older apps choose the message ID and reuse it to retry a send. A separate store for app messages, because an older `conductive` program reads app messages by ID with `get_message`.
- **Wider fix:** B.
- **Previous examples:** Review finding 1 of the branch `calummoore/resuming-agent-on-timeout-fg44`, for the continuation message.
- **Recommendation:** B. One helper stops the class for each later app message.
- **Action:** fix after merge, apply B.
