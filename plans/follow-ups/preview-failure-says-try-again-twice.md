# A preview failure says "Try again" twice

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-18, from Milestone 1 of the plan `plans/html-file-preview.md` on branch `calummoore/preview-html-file-c42r`.
- **Location:** `worker/previews/access.ts:106`, `src/shell/workspace/previews/PreviewPages.tsx:48`.
- **Reason:** The HTML file preview change reuses the failure of a Preview tab as it is, and the words of the shared server message affect every tool of the workspace.

- **Terms:**
  - **Preview tab:** a tab of the centre column that shows the page of a port preview, with Reload and Open over the page.
  - **Tool failure:** the reply that the Worker gives when the cloud computer does not answer a request of a workspace tool, built by `toolFailure` in `worker/previews/access.ts`.
- **Background:**
  - When the cloud computer does not answer, the Worker replies 502 `sandbox_unavailable` with the message "The cloud computer did not answer. Try again."
  - A Preview tab whose open fails shows the title "The preview couldn't open", the message of the server, and a button "Try again", in `PreviewTabPage` of `src/shell/workspace/previews/PreviewPages.tsx`.
  - The HTML file tab of the change in `plans/html-file-preview.md` shows the same failure, as the mockup `app/files/html/failed` draws it.
- **Problem:** The screen reads "The cloud computer did not answer. Try again." directly above a button named "Try again".
- **Impact if no action:** The words repeat. A member still understands the screen and can press the button.
- **Root question:** What words should a failure with a Try again button show for a cloud computer that does not answer?
- **Options:**
  - **A.** Drop "Try again." from the server message. Cost: an agent tool call and each screen without a button lose the hint. Effort: Small.
  - **B.** Keep the message, and give the failure screens a fixed body, such as "The cloud computer did not answer.", for the code `sandbox_unavailable`. Cost: the screens then show their own words for one code. Effort: Small.
  - **C.** Keep both, as today. Effort: Small.
- **Left out:** A button with another name, such as "Retry". The app uses "Try again" for each such button.
- **Wider fix:** None, because this is one repeated phrase, not a class of defect.
- **Previous examples:** None found.
- **Recommendation:** B. The agents keep the hint, and the screens with a button stop repeating it.
- **Action:** ask the user, because this is a choice between two correct texts, which no copy rule settles.
