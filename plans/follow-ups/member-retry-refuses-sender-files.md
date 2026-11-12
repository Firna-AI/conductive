# Try again by another member refuses attached files

- **Severity:** Medium. **Likelihood:** Common. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-10, from the options check of the plan `plans/composer-file-drops.md` on branch `calummoore/composer-file-drag-and-drop`.
- **Location:** `worker/chat/attachment-claims.ts:34`, `worker/chat/send-message.ts:89`, and `docs/protocol/isolation.md:47`.
- **Reason:** The fix changes which messages can use an uploaded file, a requirement in `docs/protocol/isolation.md`, which the user decides.

- **Terms:**
  - **Try again:** the chat action that sends the message of the newest failed turn of a session again, under a new message ID, with the same text and the same attached files.
  - **Uploader:** the member who uploaded an attached file. The Worker keeps the uploader in the record of each upload.
- **Background:**
  - `retryMessage` in `worker/chat/send-message.ts` builds a new message with the text and the attachment IDs of the failed message. It calls `send` with the request context of the member who pressed Try again.
  - `send` calls `resolveMessageAttachments` in `worker/chat/attachment-claims.ts` with the user ID of that member. That function throws `attachment_not_found`, "The attached file is not available. Upload it again.", when `record.uploaderUserId` is another user.
  - `docs/protocol/isolation.md`, under "Orgs and workspaces", says: "Only a message of the uploader in that workspace, or that first message, can use the file."
  - Other members can press Try again. `docs/protocol/isolation.md` and `docs/protocol/messages-and-attachments.md` say that such a Try again starts a new session on the member's own login when the login of the starter cannot be used, or when the starter does not share it.
  - The chat shows Try again to each member who can write: `TranscriptView.tsx` in `src/chat/components/` offers it on the failed item whose message the session record names, for any reader.
- **Problem:** When another member presses Try again on a failed turn whose message has attached files, the Worker refuses it with HTTP 404 and `attachment_not_found`. The member reads that the file is not available, although the workspace keeps the file.
- **Impact if no action:** Only the sender can retry a failed turn with files. Another member must get the files, upload them again, and send a new message.
- **Root question:** Can the Try again of another member give the agent the files of the failed message?
- **Options:**
  - **A.** Let a Try again use the files of the message that it retries, also for another member. The Worker checks that each file belongs to that accepted message in the same workspace. The rule in `docs/protocol/isolation.md` then names this case. Effort: Small.
  - **B.** Show Try again only to the sender on a failed turn whose message has files. Other members send a message of their own. Effort: Small.
  - **C.** Let the Try again of another member send the text without the files, and say so in the chat. Effort: Medium.
- **Left out:** A refusal with a clearer text and no other change: B is better on every point, because B shows no action that then fails.
- **Wider fix:** None, because the problem is one rule of one route.
- **Previous examples:** None found.
- **Recommendation:** A. A retry repeats a message that the workspace accepted, and its files stay in the same workspace, so no file reaches a place that it could not reach before.
- **Action:** ask the user, because A changes which messages can use an uploaded file, a requirement in `docs/protocol/isolation.md`.
