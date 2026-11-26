# Unicode names split into keyword colours

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-26, from branch `calummoore/auto-color-code-blocks-f7cr`, review finding 4.
- **Location:** `src/files/code/highlight.ts:23` (`wordToken`) and the check of the character before a word in `highlightLines`.
- **Reason:** a Rare product bug that is not High waits for a later branch. It needs a letter outside ASCII next to a keyword, and the text stays intact.

- **Source:** Review. **Category:** Product bug.
- **Terms:**
  - **Shared colourer:** `highlightLines` in `src/files/code/highlight.ts`. File tabs, diffs, the code field, chat code blocks, and the Markdown preview use it.
- **Background:** Since 2026-11-26, chat answers and the Markdown preview colour a code block with a known fence label, such as `rust`, with the shared colourer. The colourer reads a word with the ASCII pattern `/[A-Za-z_$][\w$]*/y`, and checks the character before a word with `/[\w$]/`.
- **Problem:** A name with a letter outside ASCII splits. `let async処理 = 1;` in Rust shows `async` as a keyword. A TypeScript block `const async処理 = 1`, a Python block with `return処理`, and a Go block with `func処理` show the same split. File tabs on `origin/main` show it too, for example `return` in `éreturn`. Type and number colours split too, such as `Value` in `πValue` and `1` in `変数1`.
- **Impact if no action:** Some valid names look like two tokens in file tabs, chat code blocks, and the preview.
- **Root question:** How does the colourer find the whole name, with letters outside ASCII, before it gives the name a colour?
- **Options:**
  - **A.** Check both ends of a keyword for a letter outside ASCII. Effort: Small.
  - **B.** Use the Rust identifier rule for Rust names only. Effort: Small.
  - **C.** Make the shared word rule read a whole Unicode name in every family: a start of `\p{XID_Start}`, `_`, or `$`, then `\p{XID_Continue}` or `$`, with the `u` flag. The check of the character before a word uses the same class. Rust keeps its `r#` raw identifier hook. Add `let async処理 = 1;` to `src/files/code/highlight.test.ts`. A probe on lines of 1,000,000 characters took the same time or less. Effort: Small.
- **Left out:** A separate Rust lexer, because C is smaller and covers every family. A test for the class that checks each keyword beside a letter outside ASCII, because C removes the case.
- **Wider fix:** C.
- **Previous examples:** `return` in `éreturn` on `origin/main`.
- **Recommendation:** C. One shared rule removes the split in every family. Keep the raw string tests of `src/files/code/highlight.test.ts` green.
- **Action:** fix after merge, apply C, because the defect is Rare and Low.
