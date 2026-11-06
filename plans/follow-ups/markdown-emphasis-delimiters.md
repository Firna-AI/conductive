# Markdown emphasis pairs its markers wrongly

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-06, from PR #14, branch `conductor/boat-native-remote-workspaces-milestone-10`, finding 3 and two new problems of its check.
- **Location:** `src/files/markdown/markdown-inline.ts:218` and `:226`.
- **Reason:** each case needs a rare Markdown shape, so the fix rule defers it.

- **Terms:**
  - **Emphasis marker:** a `*` or `_` that starts or ends italic or bold text in Markdown.
- **Background:** The Files tab renders Markdown with the app's own safe parser. CommonMark pairs emphasis markers with a stack of open markers.
- **Problem:**
  - A closing run must match the opening size, so `**bold and *italic***` shows as plain text.
  - The closer search runs through link text and addresses, so `*See [*this*](https://e.com) now*` breaks the link.
  - The matcher pairs each opener with the first closer and ignores punctuation, so `*a (*b*) c*` renders wrongly.
- **Impact if no action:** Some Markdown files show stray markers or broken links in the preview.
- **Root question:** How does the preview pair emphasis markers as CommonMark does?
- **Options:**
  - **A.** Let the matcher take part of a closing run. Effort: Small.
  - **B.** A delimiter stack by the CommonMark rules that skips links, in the existing safe renderer. Effort: Medium.
  - **C.** A maintained Markdown parser, with the same link and HTML safety. This adds a dependency. Effort: Large.
- **Left out:** None.
- **Wider fix:** B.
- **Previous examples:** finding 4 of the same review, a slow scan of the same parser.
- **Recommendation:** B.
- **Action:** fix after merge, apply B, because each case needs a rare Markdown shape.
