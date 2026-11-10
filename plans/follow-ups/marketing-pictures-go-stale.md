# Marketing pictures go stale after screen changes

- **Severity:** Low. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-09, from round 1 finding 5 of the review of branch `calummoore/tab-drag-and-drop`.
- **Location:** `tools/marketing-pictures/run.ts`, the capture command `npm run marketing:pictures`. `src/marketing/pictures/`, the committed pictures. `package.json`, the `mockups:check` script.
- **Reason:** The recommended check adds a gate, which the user decides.

- **Terms:**
  - **Marketing picture:** a still capture of a mockup screen that the public site shows. Git keeps each picture as a file under `src/marketing/pictures/`.
  - **Capture page:** the built mockup page that the capture command opens in Chrome to take one picture.
- **Background:**
  - `src/marketing/README.md`, `docs/mockups/marketing-site.md`, and `docs/mockups/README.md` say to run `npm run marketing:pictures` and commit the pictures when a screen that they show changes. A person checks each picture before it goes public.
  - These doc rules did not stop three stale sets: commit `9ad3d12` after a header change, commit `e9827da` after a merge, and the branch `calummoore/tab-drag-and-drop`, which removed the Rename button of a session tab and left ten pictures with the button.
  - Two builds of the same tree give byte-identical capture pages and style sheets.
- **Problem:** Nothing tells a branch that a picture of the public site no longer matches its screen.
- **Impact if no action:** The public site can show controls that the app no longer has, until someone notices.
- **Root question:** How do the marketing pictures stay in step with the screens that they show?
- **Options:**
  - **A.** Keep the doc rules only. Effort: Small.
  - **B.** The capture command also writes a list with a hash of each capture page and of the style sheets that it links. A step after the mockup build in `npm run mockups:check`, and so in `npm run check`, computes the hashes again and names each picture to capture again. It needs no browser. It can flag a change that no picture shows: then one capture run, about 70 to 100 seconds, clears it. Effort: Medium.
  - **C.** CI captures the pictures and fails when one differs from its file by more than the capture noise. It needs one pinned image with Chrome and the fonts for CI and every capture. Effort: Large.
  - **D.** The site build captures the pictures from the current mockups, and Git keeps no picture. Each build then needs Chrome, and no person checks a picture before it goes public. Effort: Large.
- **Left out:** Draw the screens live on the site, because the content security policy of the site allows only hashed style elements. One more doc rule, because three doc rules did not stop the class.
- **Wider fix:** B, the cheapest check that catches a stale picture from any cause, with no browser in the gate.
- **Previous examples:** Commits `9ad3d12` and `e9827da`, and the removed session Rename button that remained in ten marketing pictures.
- **Related:** `plans/follow-ups/marketing-pictures-unstable-capture.md` records capture noise. A comparison of captures needs stable pixels.
- **Recommendation:** B. It catches every stale picture before the merge, at the cost of one more step in the gate.
- **Action:** ask the user, because each option other than A adds a gate or a build error.
- **Answer:** On 9 November 2026, the user chose to keep this work as a follow-up item for a later change, and to merge the change that found it without it. No option is chosen yet, so the item still needs a decision.
