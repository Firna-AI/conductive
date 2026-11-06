# Marketing picture capture depends on mockup markup

- **Severity:** Medium. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-06, from PR #5, branch `conductor/boat-native-remote-workspaces-milestone-15d`, finding 3.
- **Location:** `tools/marketing-pictures/capture-pictures.ts:22`, `src/marketing/pictures.ts`, and `docs/mockups/src/components/marketing/marketingPictures.tsx`.
- **Reason:** the fix changes the shared mockup rendering, outside the branch that found it.

- **Terms:**
  - **Capture command:** `npm run marketing:pictures`, which takes still pictures of mockup screens for the marketing site.
  - **ScreenPicture:** the mockup component that shows one app screen as a picture on the marketing page of the mockups.
- **Background:** The marketing site shows still pictures of three app screens. The capture command opens the marketing page of the mockups and saves each frame as a picture file. The site keeps its own copy of each picture's size, scale, and alt text.
- **Problem:** The command finds the frames through private markup of the mockup components, such as `[role=img]`, `[inert]`, and parent elements. It changes the styles of parent elements, and it names the files in the order of the frames on the page. After a reorder of the frames, the command saves the pictures under the wrong names without an error. The site's hand-kept copy of the sizes and the alt texts can also go stale without an error.
- **Impact if no action:** The home page can show the wrong screens or a squeezed picture, and a change of the mockup markup can break the command.
- **Root question:** How do the mockups, the site, and the capture command share one list of the pictures?
- **Options:**
  - **A.** Add named capture views and bounds callbacks to the mockup components, and capture the marketing page through them. Effort: Medium.
  - **B.** Export one page for each ScreenPicture, and capture its known viewport without reading or changing component internals. Effort: Medium.
  - **C.** Find each frame by its accessible name, which equals the site's alt text, and stop when no frame or more than one frame matches. This adds a new stop that needs the user's approval. Effort: Small.
  - **D.** Apply B. Then move each picture's key, labels, size, crop, and scale into one module with no imports, beside `marketingPictures.tsx`. The mockups, the site's `pictures.ts`, and the command all read it. Delete the site's copy and the README rule that keeps the copy in step by hand. Effort: Medium.
- **Left out:** None.
- **Wider fix:** D. One list removes the copies, so a renamed, reordered, resized, or relabelled picture cannot leave a copy behind.
- **Previous examples:** None found.
- **Recommendation:** D.
- **Action:** fix after merge, apply D, because it changes the shared mockup rendering outside the branch that found it.
