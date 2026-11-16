# Marketing pictures take a font from the machine

- **Severity:** Low. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-09, a new problem of the check of round 1 finding 5 of the review of branch `calummoore/tab-drag-and-drop`.
- **Location:** `docs/mockups/src/design/metrics.ts:7`, the monospace font of the mockups.
- **Reason:** The branch that found it changed no font, and the fix touches every picture with code text.

- **Background:** The mockups take their monospace font, Source Code Pro, from the system, as `docs/mockups/src/design/metrics.ts` says. `npm run marketing:pictures` captures the mockups in Chrome on the machine that runs it.
- **Problem:** A machine without Source Code Pro draws code text in another font. Its capture then changes every marketing picture that shows code text.
- **Impact if no action:** A capture on another machine can commit pictures in the wrong font, or show changes that are only noise.
- **Root question:** How does every capture draw the same monospace font?
- **Options:**
  - **A.** Ship Source Code Pro with the mockups, as `docs/mockups/src/fonts/` ships Inter, and load it in the renderer. Effort: Small.
  - **B.** Make the capture command refuse to run when the font is missing. It adds a rejection, so it needs the user. Effort: Small.
- **Left out:** A note in the docs, because a person can miss it.
- **Wider fix:** A, because the font then comes with the repository.
- **Previous examples:** On 2026-11-12 the fast mode branch `calummoore/bern-mapm` found that the committed pictures draw a box in place of ⌘, for example in the Search row of the hero picture. A capture on that machine drew ⌘, but moved other text by about 2 px in all 29 pictures. That branch kept only its four `agents` pictures. A fresh capture of all pictures on a machine with the right fonts fixes the box.
- **Related:** `plans/follow-ups/marketing-pictures-unstable-capture.md` records a digit shift between two runs on one machine. Its cause is unknown.
- **Recommendation:** A.
- **Action:** fix after merge, apply A, because the branch that found it changed no font.
