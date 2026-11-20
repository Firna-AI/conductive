# Smoke-test the HTML file preview after the deploy

- **Severity:** Medium. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-20, from the post-merge section of the plan of branch `calummoore/preview-html-file-c42r`.
- **Location:** None.
- **Reason:** The check needs the deployed Worker and a cloud computer with the new runner release, which exist only after the merge.

- **Terms:**
  - **HTML file tab:** the file tab of an `.html` or `.htm` file, with a Preview and Source switch. Preview shows the page in a frame. `docs/protocol/html-file-preview.md` states its rules.
  - **Files preview:** the one preview of each workspace that serves the repository files on the preview domain `conductive.page`, through the file server of the agent runner on port 7683. `docs/protocol/file-server.md` states the rules of the file server.
  - **Browser launch:** the way the Mac app opens a preview in the default browser, with the grant and the file path in the fragment of an authorizer address.
- **Background:**
  - The tests run the Worker with a fake sandbox provider, and the file server over local HTTP. No test loads a page through the real preview domain, the real relay, and a real runner.
  - The Mac app opens Open in the default browser through the browser launch, which now carries the path of the file.
  - An older cloud computer has no file server, so the tab shows "Restart to preview this file" until a Restart installs the new release.
  - On E2B sandboxes the relay uses its ingress alias, and no test covers a files preview there.
- **Task:**
  1. In a workspace with the new release, write `.context/smoke/index.html` that loads `style.css`, `app.js`, and `picture.png` by relative addresses, and one script that runs.
  2. Open it from All files. Check the one "Opening preview" wait, then the page with its style, its picture, and its script, in Chrome and in Safari.
  3. Check Reload, Open in a new tab, and Source. Edit the file, and check that the frame loads the new version.
  4. In the Mac app, check the frame and Open, which goes to the default browser at the same file.
  5. Check that `.env` and a file in `.git` get 404 through the page, and that a port preview of port 7683 shows an error.
  6. In a workspace with an older release, check the notice, then Restart, and check that the page shows after Starting.
  7. Check that port 7683 is free in a new cloud computer, and that the Preview tool does not list it.
  8. Repeat steps 1 and 2 in a workspace on an E2B sandbox.
- **Impact if no action:** A defect of the real preview path, such as a header that the proxy or the relay drops, reaches members unseen.
- **Needs:** The deployed change, a workspace with the new runner release, an older workspace, a workspace on E2B, Chrome, Safari, and the Mac app.
- **Done when:** Each step passes, or each failure has its own follow-up item.
