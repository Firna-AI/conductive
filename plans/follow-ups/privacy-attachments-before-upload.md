# The Privacy page names attachments that cannot upload

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-10, from the options check of the plan `plans/start-from-github.md` on the branch `calummoore/new-chat-start-from-brainstorm`.
- **Location:** `src/marketing/privacy.ts:96` and `worker/chat/dependencies.ts:50`.
- **Reason:** The chat attachments work of `plans/boat-native-remote-workspaces.md` owns this sentence and the feature behind it.

- **Source:** Review. **Category:** Docs or spec.
- **Terms:**
  - **Privacy page:** the legal page of the marketing site, with its text in `src/marketing/privacy.ts`.
  - **Chat attachments milestone:** the open milestone "Chat attachments" of `plans/boat-native-remote-workspaces.md`. It adds file storage, the upload routes, and the copy of files into the cloud computer. It also adds the stored files to the Privacy page.
- **Background:**
  - The Privacy page says: "The files that you attach go to the cloud computer of the workspace."
  - In production, `resolveAttachments` in `worker/chat/dependencies.ts` refuses each message that names an attachment, with `503 attachments_unavailable` and "Attachments are not available. Try again."
  - The production Worker has no route for `POST /api/attachments`. Only the development fake in `src/app/dev/create-routes.ts` answers it.
  - The chat attachments milestone is open, and no file reaches a cloud computer yet.
- **Problem:** The Privacy page describes a data flow that production does not run.
- **Impact if no action:** A reader expects attached files to work and to reach the cloud computer. The page stays wrong until the chat attachments milestone ships.
- **Root question:** What does the Privacy page say about attached files while they cannot upload?
- **Options:**
  - **A.** Keep the sentence until the chat attachments milestone ships and states the stored files. Effort: Small.
  - **B.** Remove the sentence now, and let the chat attachments milestone add the full text. Effort: Small.
  - **C.** Say that file attachments are not available yet. Effort: Small.
- **Left out:** None.
- **Wider fix:** None. The repository rule that a change of a fact updates each legal sentence that restates it is already in force.
- **Previous examples:** None found.
- **Recommendation:** A. The sentence describes a planned flow and claims no data use beyond it, and the chat attachments milestone already changes this part of the page.
- **Action:** ask the user, because the legal page states a flow that production does not run, and only the user can accept that text.
