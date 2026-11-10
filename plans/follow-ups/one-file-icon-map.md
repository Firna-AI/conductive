# Two file icon maps disagree

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-10, from branch `calummoore/file-selector-list`, the wider fix of finding 6 of review round 1, with two problems outside the scope that its check found.
- **Location:** `docs/mockups/src/components/files/fileIcons.tsx:22-23`, `src/files/panel/file-icons.tsx:3-18`, `src/files/code/languages.ts:130-188`.
- **Reason:** one map decides which icons the mockup of All files draws, which changes a mockup screen on `main`.

- **Terms:**
  - **Icon map:** the rule that gives a file its icon from its name: code, Markdown, or another file.
- **Background:**
  - The app's All files uses the map in `src/files/panel/file-icons.tsx`: many code extensions, and Markdown in any case.
  - The mockups use a smaller map in `EntryIcon` of `docs/mockups/src/components/files/fileIcons.tsx`: only `.ts`, `.tsx`, `.json`, and lower-case `.md`.
  - The branch made the list of `@` and the file chips of the app use the app's map, through an icon that the caller gives.
  - The syntax colours in `src/files/code/languages.ts:130-188` repeat the extension list, and `Dockerfile` and `.env` files get colours but the plain icon.
- **Problem:** The same file can get different icons in the mockups and in the app. The mockup screen `app/chat/masked-paths/all-files` gives `seed-[redacted].sql` the plain icon, but the app gives `.sql` the code icon.
- **Impact if no action:** The visual spec and the app disagree on file icons, and each new file type needs two or three edits.
- **Root question:** Which one icon map do All files, the list of `@`, and the chips use, in the app and in the mockups?
- **Options:**
  - **A.** Move the app's map into `EntryIcon` of the mockups, and let the app's `FileIcon` draw it. The mockup row of `seed-[redacted].sql` gets the code icon. Effort: Small.
  - **B.** Do A, and build the code extensions of the map from the language list of the syntax colours. Effort: Small.
- **Left out:** Generic icons, because the visual spec draws type icons in All files.
- **Wider fix:** B.
- **Previous examples:** The private map of the mockup All files before this branch, in `docs/mockups/src/components/files/FileTree.tsx`.
- **Recommendation:** B. One list sets the icons and the colours.
- **Action:** ask the user, because the change redraws a mockup screen on `main`, and the user decides which side of a mockup and product mismatch is right.
