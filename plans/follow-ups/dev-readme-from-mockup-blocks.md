# Development README copies the mockup by hand

- **Severity:** Low. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-26, from branch `calummoore/auto-color-code-blocks-f7cr`, the wider fix of review finding 6 and a problem outside its scope.
- **Location:** `src/files/dev/dev-samples.ts:47`, `src/files/dev/dev-fixtures.ts:132` and `:240`, `docs/mockups/src/fixtures/fileContents.ts:99`.
- **Reason:** sharing the whole README reaches the development diff fixtures, beyond the code block colours change.

- **Source:** Review. **Category:** Code structure.
- **Terms:**
  - **Development page:** the local page of the files area that runs the real app parser on sample files, as `src/files/development.md` says.
- **Background:** The mockup README in `docs/mockups/src/fixtures/fileContents.ts` holds parsed blocks, because no mockup fixture reads Markdown (`docs/mockups/design-markdown.md`). The development README in `src/files/dev/dev-samples.ts` is Markdown text that people compare with that mockup. `src/files/dev/dev-fixtures.ts` copies parts of it again: a patch with the `ts` block at line 132, and a README diff at line 240.
- **Problem:** Three copies of the README are kept by hand. On 2026-11-26 they drifted: the development README labelled its test commands `bash`, and the mockup kept them unlabelled. The README diff at line 240 also gives the current text as both versions, so its removed row cannot match the old file.
- **Impact if no action:** The development page and the mockup drift again, and a reviewer compares two different samples.
- **Root question:** How do the development README, its patch, and its diff stay the same as the mockup README?
- **Options:**
  - **A.** Export the code blocks of the mockup README and write the development fences from them. It covers only code blocks. Effort: Small.
  - **B.** Derive the development README and the mockup blocks from one example fixture. Effort: Medium.
  - **C.** A test in `src/files/dev/dev-fixtures.test.ts` that compares the code blocks of both READMEs. It is a test for the class, so it needs the user's approval. Effort: Small.
  - **D.** B with the mockup blocks as the source. A writer in `src/files/dev/` turns the blocks into the development README Markdown. The same source gives the patch and the old side of the README diff, which needs an old README. Update `src/files/development.md`. Effort: Medium.
- **Left out:** A Markdown source that the mockup reads with the app parser, because the mockup would copy each parser bug.
- **Wider fix:** D.
- **Previous examples:** Commit `93bcefa91` made the mockups use the app's chat readers to reduce such drift.
- **Recommendation:** D. It leaves no copy kept by hand.
- **Action:** fix after merge, apply D, because it reaches the development diff fixtures outside the code block colours change.
