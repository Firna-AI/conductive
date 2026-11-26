# Review retries of app notice input

- **Severity:** Low. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-20, during watch chat implementation on `calummoore/wake-a-session-when-a-turn-ends-b5kh`.
- **Location:** `worker/chat/send-message.ts:114`, `worker/chat/secret-notice.ts`, `worker/chat/session-watch-notice.ts`, and `src/chat/components/TranscriptItem.tsx`.
- **Reason:** The existing manual retry behavior applies to all hidden app messages and is outside the one-shot watch delivery change.

- **Terms:**
  - **App notice:** A line the app adds to a session, such as a late secret answer or a watched turn's end.
  - **Hidden message:** The ordinary stored message that gives an app notice to the agent without a member bubble.
  - **Try again:** The member action that sends the newest failed request again.
- **Background:** App notices reach agents through ordinary stored messages. Their first acceptance emits an app notice without `message.accepted`, so the chat shows no member bubble. A failed turn can name its hidden message as `retryMessageId`. The chat offers Try again on the failed item that names the session's current retry message. `retryMessage` reads that message, checks the current retry ID, and sends its text again through ordinary `send` with a fresh ID and the member who pressed Try again. The new accepted message then shows as a member bubble. Late secret answers use this path too. These facts come from code inspection. No browser reproduction of this retry was performed.
- **Task:** Reproduce a failed late-answer or wake turn, press Try again, and inspect its bubble, copied transcript, agent input, and sender authority. Confirm whether the existing manual retry presentation is clear. Bring any proposed change of attribution or retry behavior to the member before implementation. Keep the original retry checks, current sender authority, and older-client compatibility.
- **Impact if no action:** A manually retried app notice can appear as words of the member who pressed Try again. This can obscure its original source.
- **Needs:** A local app and Worker fixture that can fail a turn after accepting an app notice. No production credential is required.
- **Done when:** The manual retry behavior is reproduced and its presentation is confirmed or a separate approved change addresses it.
