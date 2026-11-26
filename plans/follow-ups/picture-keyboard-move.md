# A keyboard cannot move a zoomed picture

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-22, from branch `calummoore/image-zoom-j6zh`, review item 7.
- **Location:** `src/files/page/use-picture-zoom.ts` and the stage in `src/ui/components/files/ImageView.tsx`.
- **Reason:** keys on the picture are a new requirement, which the user reviews, and the zoom change shipped without them.

- **Source:** Review. **Category:** Product bug.
- **Terms:**
  - **Stage:** the part of the file tab that shows a picture, above its zoom bar.
- **Background:** The file tab shows a PNG, JPEG, GIF, or WebP file as a picture. A zoom bar under it has Zoom out, the zoom, Zoom in, Fit, and Expand on desktop. The wheel, a pinch, and a double press zoom the picture about the pointer. A drag moves a zoomed picture. `docs/protocol/workspace-tools.md` gives these requirements.
- **Problem:** The stage cannot take the focus, and it reads no key. Zoom in and Zoom out zoom about the middle. So a keyboard user can zoom, but cannot see the edges of a picture that is larger than the stage.
- **Impact if no action:** A member who uses only a keyboard or a switch device can read only the middle of a zoomed picture.
- **Root question:** How does a member without a pointer see each part of a zoomed picture?
- **Options:**
  - **A.** The stage takes the focus while the picture is larger than the stage. The arrow keys move the picture by 40 px, and Shift with an arrow by a stage. Its focus ring and its name tell the keys. Effort: Small.
  - **B.** Four move buttons in the zoom bar, for up, down, left, and right. They make the bar wider, also for members with a pointer. Effort: Small.
  - **C.** Change nothing. Fit shows the whole picture, and Expand shows it larger. Effort: Small.
- **Left out:** Scroll bars on the stage, because the wheel zooms and so cannot scroll them.
- **Wider fix:** None, because no other view of the app zooms.
- **Previous examples:** None found.
- **Recommendation:** A. It follows image viewers that members know, and it adds nothing to the bar.
- **Action:** ask the user, because the keys add behaviour at a boundary that no requirement covers.
