# A preview launch tab shows raw JSON for other refusals

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-16, from the finding check of review finding 2 on branch `calummoore/oslo-nocm`.
- **Location:** `worker/security/preview-sign-in.ts` and `worker/previews/handler.ts`.
- **Reason:** A tab with a session gets the same JSON on `origin/main`.

- **Terms:**
  - **Launch address:** the app's `/api/orgs/.../previews/...` address that checks access and starts a preview.
- **Background:**
  - A top-level browser tab can open a launch address, for example from a copied link.
  - Branch `calummoore/oslo-nocm` sends a signed-out tab to sign-in instead of a JSON 401.
  - Every other refusal still answers with JSON, such as `access_required` for a person who waits, or `sandbox_not_ready` for a stopped computer.
- **Problem:** A person sees a raw JSON error page with no next step.
- **Impact if no action:** A person who opens a launch address for a stopped workspace or without app access sees an error page that the app never designed.
- **Root question:** What does a person see when a launch in a browser tab fails for a reason other than sign-in?
- **Options:**
  - **A.** Redirect a top-level launch tab to the app page of the preview for each refusal, so the app shows its own state. Effort: Small.
  - **B.** Serve a small HTML page with the error message and a link to the workspace. Effort: Small.
  - **C.** Change nothing, because agents now give app page links. Effort: Small.
- **Left out:** Changing the JSON refusal of every API address, because the app's fetch handling reads it.
- **Wider fix:** A, because the app page already shows every preview state.
- **Previous examples:** None found.
- **Recommendation:** A. The Preview tool already explains a stopped computer and a closed preview.
- **Action:** ask the user, because it changes the launch behaviour in `docs/protocol/terminal-previews-and-desktop.md`.
