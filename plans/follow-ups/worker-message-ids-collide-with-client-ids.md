# Client IDs can take a Worker message ID

- **Severity:** High. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-23, from the review of `calummoore/agent-scheduling-wake-future-nlp0`, check of finding 2.
- **Location:** `worker/chat/secret-notice.ts` at `acceptSecretNotice`, `worker/chat/messages.ts` at `existingMessage`, and `worker/chat/wake-message.ts` at `saveWakeMessage`.
- **Reason:** Late secret answers already used this ID on main. The wake-up fix changes the IDs of scheduled wake-ups and watch wakes.

- **Terms:**
  - **Hidden message:** a Worker-made agent message that has a line in the chat instead of a member bubble.
  - **Late secret answer:** an answer to a secret request after the agent stopped waiting. The Worker sends a hidden message to tell the agent of that answer.
- **Background:** The chat accepts client-chosen message IDs. It stores the message and its turn mapping under that ID within the workspace. Scheduled wake-ups and watch wakes now allocate an unused ID inside the transaction that saves their message, event, and retry record.
- **Problem:** The late answer writer derives `secret-notice:<request ID>`. A member can use that ID first. The writer reads the existing message-to-turn mapping and treats it as proof that the notice was sent. That mapping can belong to the member message.
- **Impact if no action:** The late answer can show as sent without delivering its text. Resume or dispatch can follow the member message's turn mapping instead.
- **Root question:** How does each Worker-made message get a unique ID and retain the same ID across retries?
- **Options:**
  - **A.** Allocate an unused ID for late answers. Save a mapping from request ID to message ID in the same chat transaction. Read earlier legitimate notices using their stored IDs. Effort: Small.
  - **C.** Put Worker and client messages in separate storage namespaces. Carry the namespace in message and turn lookups. Preserve reads of existing data. Effort: Large.
  - **D.** Reserve Worker prefixes at the client boundary. Handle IDs already accepted under those prefixes. This option adds a rejection and needs Cal's approval. Effort: Small.
  - **E.** Use one transactional allocator for every Worker-made message. Persist the allocated ID with each event and its retry or request record. Keep earlier IDs readable. Use late secret answers and both wake paths as the first consumers. Effort: Medium.
- **Left out:** Retrying the same derived ID cannot remove the collision. Dropping the late answer leaves the agent unaware of the grant.
- **Wider fix:** E. The allocator gives each Worker message a fresh ID without restricting the client API.
- **Previous examples:** Scheduled wake-ups and watch wakes derived IDs from their public IDs. The Worker now allocates each of those message IDs inside the write transaction.
- **Recommendation:** E. It gives every Worker-made message the same uniqueness and retry rule.
- **Action:** fix after merge, apply E in a separate change that covers Worker-made messages.
- **Done when:** A late answer still sends once when a member owns the old derived ID. The member message and its turn mapping survive. A retry uses the persisted notice ID, and older valid notice records remain readable.
