# A failed preview launch shows raw JSON in the frame

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-18, from the finding checks of the review of branch `calummoore/preview-html-file-c42r`, the check of finding 103.
- **Location:** `worker/previews/handler.ts:56`, `worker/http.ts:61`.
- **Reason:** `origin/main` has the same reply, so the HTML preview change did not cause it, and a fix reaches the port previews too.

- **Terms:**
  - **Launch address:** the address on the app's hostname that loads a preview in a frame or a new tab. Each load gets a one-use grant.
  - **Preview tab:** a tab of the centre column that shows the page of a port preview in a frame.
- **Background:**
  - A frame of a Preview tab, and the frame of an HTML file tab, load the launch address of their preview.
  - When the preview has ended, the launch route answers 404 `preview_not_found` with a JSON body, through the error response of `worker/http.ts`.
  - The app normally opens a new preview before it loads a frame, so this reply is rare in a frame.
- **Problem:** A frame that still loads an ended preview, such as after a race or a reload of an old page, shows the raw JSON text of the error.
- **Impact if no action:** The member sees JSON text in place of a page, and must press Reload or open the tab again.
- **Root question:** What should a frame show when its launch address names a preview that ended?
- **Options:**
  - **A.** Answer a launch navigation that asks for HTML, with no `Accept: application/json`, with the failed state of the "Opening preview" page: "The preview couldn't open", as the authorizer page already shows it. Keep the JSON reply for a request that asks for JSON. Effort: Small.
  - **B.** Keep the reply, and let the app watch the frame and open a new preview when it fails. Cost: the app cannot read a frame of another site, so it needs a new signal. Effort: Medium.
  - **C.** Change nothing. Effort: Small.
- **Left out:** A redirect to a new preview from the launch route, because only the app's open route may open a preview.
- **Wider fix:** A, because each launch failure in a frame or a tab then shows the same page as a failed authorizer.
- **Previous examples:** `failPreviewScript` of `worker/previews/opening-page.ts` already draws the failed state for the authorizer page.
- **Recommendation:** A. It reuses the failed state that the opening page already has.
- **Action:** fix after merge, apply A, because the problem is outside the scope of the branch that found it, and the same reply serves the port previews.
