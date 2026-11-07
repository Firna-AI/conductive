# The marketing pictures can go stale

- **Severity:** Low. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-08, the wider fix of finding 8 of PR #46, branch `conductor/boat-native-remote-workspaces-milestone-7w`, round 2. It is the second case of the class.
- **Location:** the stored pictures under `src/marketing/pictures/`, the capture tool under `tools/marketing-pictures/`, and the gate in `package.json`.

- **Terms:**
  - **Marketing pictures:** 26 stored WebP files of mockup screens that the marketing site shows. A person makes them with `npm run marketing:pictures`, which opens the mockups in Chrome and captures each screen.
  - **Gate:** `npm run check`, the complete check that CI runs on each pull request.
- **Background:** The marketing README says that a change to a captured screen needs a new capture. Milestone 7w added a login line to the composer and did not capture again, by a scope call. So the site shows the old composer. Commit `30eccde` fixed the first case of this drift and added the capture command.
- **Problem:** Nothing finds a stale picture. A capture on another machine or Chrome version also changes up to 292 pixels of pictures whose screens did not change, so a new capture can bring noise files into a diff.
- **Impact if no action:** The site can show screens that the product no longer has, until someone notices. Each capture can add noise files to a pull request.
- **Root question:** How do the marketing pictures stay in line with the mockups?
- **Options:**
  - **A.** Keep the README rule, and capture again by hand after each change of a captured screen. Effort: Small.
  - **D.** Add a drift check to the gate. After the mockup build, capture the pictures into a temporary folder, and compare the decoded pixels with the stored files. Fail when a picture has more than about 100 pixels that change by more than 64 of 255. The noise of another machine gives no such pixels, and the login line gave 4,808 to 41,067. CI needs Chrome, each run takes up to a minute longer, and a Chrome update can move pixels unless the version is pinned. Effort: Medium.
  - **E.** Make the pictures in the build, and stop storing them. `npm run build` captures the pictures into the build output. Then no screen change can leave a stale picture, and no noise files reach a diff. Each build needs Chrome and the mockup build, about one minute more, and `npm run dev` and the deploy machine need them too. Effort: Large.
  - **F.** Draw the screens on the site as static HTML from the mockup components, in place of pictures. The build needs no browser, and the screens cannot go stale. The site must send the mockup styles to each visitor, and the screens look slightly different in each browser. Effort: Large.
- **Left out:** A third copy of the capture rule in `AGENTS.md` or a skill, because the rule was known and a scope call still deferred the capture.
- **Wider fix:** E. D is the cheaper detection fix.
- **Previous examples:** commit `30eccde`, and finding 8 of PR #46.
- **Recommendation:** D. It finds every stale picture for one minute of CI, and keeps the build free of Chrome.
- **Action:** ask the user, because D adds a gate and E makes the build need Chrome.
