# Check the newsreel page fonts after release

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-23, from `calummoore/fonts-loading-issue-kjto`, its post-merge smoke test.
- **Location:** None.
- **Reason:** The check needs the merged Worker and a runner release on a real cloud computer.

- **Terms:**
  - **HTML tab:** the file tab of an HTML file, whose Preview shows the page in the member's browser from the files preview of the workspace.
- **Background:** Cal reported that `.context/launch-video/out/e-newsreel.html` in the `ciproxy` repository showed default fonts in the HTML tab. The page loads Geist and GeistMono from `file:///home/user/code/ciproxy/.context/launch-video/fonts/...` addresses, and it names the system fonts Nimbus Sans Narrow and C059. The change lets the file server change those addresses to full addresses on the files preview, serve the system fonts, and add a font stylesheet to each HTML page.
- **Task:** After the Worker deploys and the runner release reaches the workspace "ciproxy launch video brainstorm", open that page in the HTML tab. Check that Geist, GeistMono, Nimbus Sans Narrow, and C059 show, and that the browser's network panel shows each font load from the preview address.
- **Impact if no action:** A fault that only the real Worker and relay show stays hidden until a member reports it again.
- **Needs:** The deployed Worker, a runner release with the change, and access to that workspace.
- **Done when:** A screenshot of the page in the HTML tab shows all four fonts, and no font request failed.
