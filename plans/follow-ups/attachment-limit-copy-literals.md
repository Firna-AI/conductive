# The copy of the file limits repeats the limits as literals

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-16, from the review of branch `calummoore/file-modal-hover-popup-0ore`.
- **Location:** `docs/mockups/src/components/chat/attachmentCopy.ts` (`tooLargeBody`, `previewLimitBody`), `src/shared/messages.ts` (`ATTACHMENT_MAX_BYTES`), `src/chat/components/chip-field/local-preview.ts`.
- **Reason:** `tooLargeBody` is older than the branch. One fix for both texts belongs in one branch.

- **Background:** The notice of a file over 1 GB and the body of a preview over its limit write the limits as words, such as "1 GB" and "20 MB". The code holds the same limits as constants.
- **Problem:** A change of a constant leaves the words wrong.
- **Impact if no action:** The app can name a limit that it does not use.
- **Root question:** How do the words of a limit follow the limit that the code uses?
- **Options:**
  - **A.** Build each text from its constant with one formatter of limits. Effort: Small.
  - **B.** Add a test that each text names its constant. Effort: Small.
- **Left out:** None.
- **Wider fix:** A.
- **Previous examples:** None found.
- **Recommendation:** A.
- **Action:** fix after merge, apply A.
