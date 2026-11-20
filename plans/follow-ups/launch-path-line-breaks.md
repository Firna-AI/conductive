# A launch path with a line break opens a 404

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-18, from the review of branch `calummoore/preview-html-file-c42r`, finding 51.
- **Location:** `worker/previews/launch-document.ts:24-27`, `worker/previews/launch.ts:137` and `:165`, `worker/previews/launch-test-support.ts:23`, `docs/protocol/preview-grants.md`.
- **Reason:** A Rare product bug of Medium severity waits for a later branch under the fix rule, and the cost after the merge is only a short fallback for a path in the form body.

- **Terms:**
  - **Launch page:** the page on the app's hostname that posts a one-use grant to the authorizer in a form.
  - **Authorizer:** a fixed hostname on the preview domain that takes the grant, sets the preview cookie, and sends the browser to the preview hostname.
  - **Launch path:** the optional `path` of a launch address, which names the HTML file that the preview opens. `docs/protocol/preview-grants.md`, "Launch paths", states its rules.
- **Background:**
  - The launch page puts the path in a hidden form field. The authorizer reads it from the form body, checks it with `isFilePath`, and redirects to its percent-encoded segments on the preview hostname.
  - A repository path can hold each character but NUL, also a line break. The owner chose that in finding 33B, recorded in commit `0a5c5aafc`.
  - When a browser sends a form, it turns each lone CR or lone LF of a field into CR LF.
  - The test support `launchForm` builds the form body with `URLSearchParams`, which keeps a bare LF, so no test sees the change.
- **Problem:** A path such as `reports/a<LF>b.html` reaches the authorizer as `reports/a<CR><LF>b.html`. The authorizer redirects to that changed path, and the file server answers 404, because no file has that name.
- **Impact if no action:** Preview and Open in the web app show 404 for such a file. Source and Open in the Mac app, which carries the path in the fragment, still work.
- **Root question:** How should a preview open the exact file that the member selects?
- **Options:**
  - **A.** Encode the path of the form into reversible ASCII text, and decode it before the check. Effort: Small.
  - **B.** Put the path in the query of the form's action, as the browser launch already does, with one path reader for both modes. Keep the grant in the form body. Effort: Small.
  - **C.** Put the path in the encrypted launch grant, and redirect to the path from the redeemed grant. Keep the path out of the credential cookie. In the browser launch, keep the path in the fragment only for the target check of the authorizer page. An older grant simply holds no path, so no migration is needed. Read a path in the form body as a fallback for one release, because a launch page of the previous Worker can post one for up to 60 seconds. Update `docs/protocol/preview-grants.md` and `worker/previews/README.md`. Effort: Small.
- **Each option also needs:** a regression test, with `launchForm` changed to turn each lone CR or LF of a form field into CR LF, as a browser does, so that the test fails before the fix.
- **Left out:** A refusal of line breaks, because it removes valid file names, which the owner chose to allow. A conversion of CR LF back to LF, because a lone CR, a lone LF, and CR LF all arrive as CR LF. A script `fetch` from the launch page, because the cookie would then belong to the app's site and Open in a new tab gets none. `multipart/form-data` or `text/plain`, because they change line breaks too.
- **Wider fix:** C, because the path then never passes through the browser between the launch and the redirect.
- **Previous examples:** Commit `0a5c5aafc`, finding 33B, restored tabs, line breaks, and backslashes in repository paths.
- **Recommendation:** C. B stays a good direct fix if a smaller change to the grant code matters more.
- **Action:** fix after merge, apply C, because a Rare product bug of Medium severity waits for a later branch under the fix rule.
