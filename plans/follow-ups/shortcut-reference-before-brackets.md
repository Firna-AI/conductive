# Shortcut references before brackets lose their link

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-18, from branch `calummoore/output-summary-f7sm`, Markdown parser decision 20 A.
- **Location:** `src/files/markdown/preview-inline.test.ts`, the test `keeps every bracket of nested brackets around a shortcut reference, and links only the reference`. Both views use `src/markdown/parser.ts`.
- **Reason:** The user chose to accept the current reading until a `markdown-it` release fixes it.

- **Source:** Implementation.
- **Category:** Product bug.
- **Terms:**
  - **Shortcut reference:** A link such as `[a]` that gets its address from a separate definition such as `[a]: https://e.com/a`.
- **Background:** Agent messages and the file preview use `markdown-it` with its CommonMark preset. On 18 November 2026, the user chose to keep its reading of shortcut references before brackets. The app adds no wrapped link rule.
- **Problem:** With the input below, `markdown-it` 15.0.3 leaves `[a][` as text and links only `b`. CommonMark links `a` too. The relaxed test checks the letters of the long reference chain after it removes brackets. It does not require the CommonMark links or exact brackets for that chain.

  ```markdown
  [a][[b]]

  [a]: https://e.com/a
  [b]: https://e.com/b
  ```

  The current HTML is `<p>[a][<a href="https://e.com/b">b</a>]</p>`.
  CommonMark gives `<p><a href="https://e.com/a">a</a>[<a href="https://e.com/b">b</a>]</p>`.

- **Impact if no action:** An agent message or a file with this bracket shape loses the link of its first shortcut reference.
- **Root question:** How do both views regain the CommonMark reading of a shortcut reference before brackets?
- **Options:**
  - **A.** Adopt a `markdown-it` release that fixes this case. Tighten the relaxed chain assertion to preserve its exact brackets and links. Effort: Small, with an unknown wait.
  - **B.** Wrap the link rule in the app to restore shortcut fallback for an invalid second label. Cost: the app then owns part of the library's link parsing. Effort: Medium.
- **Left out:** Another Markdown library reverses the user's choice of one shared `markdown-it` parser. A separate rule for each view breaks their shared reading. No other approach preserves both choices.
- **Wider fix:** A. The upstream fix removes the parsing defect for every caller of the library.
- **Previous examples:** The relaxed test also checks nested brackets at 500 and 2,000 levels. Those nested references keep their brackets and their one link today.
- **Recommendation:** A. It follows the user's choice and keeps link parsing in the library.
- **Action:** fix after merge, apply A, when a `markdown-it` release fixes this case. This item closes when that release is adopted and the relaxed test checks the corrected reading.

The case is already reported as divergence 1 of
[markdown-it issue 1226](https://github.com/markdown-it/markdown-it/issues/1226).
Its report says that an invalid second label prevents shortcut fallback.
Its minimal input is `[foo][bar [baz]]`, with the definition `[foo]: /url`.
CommonMark gives `<p><a href="/url">foo</a>[bar [baz]]</p>`.
`markdown-it` gives `<p>[foo][bar [baz]]</p>`.
The second label contains unescaped brackets, so it is invalid under CommonMark section 6.3.
The link rule accepts balanced nested brackets during its label scan, then fails its reference lookup without shortcut fallback.
No new upstream report is needed.
