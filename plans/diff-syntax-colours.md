# Syntax colours in diffs

Status: Active. On branch `calummoore/diff-syntax-highlighting`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

A diff tab shows each line as plain text, while a file tab shows the same
code in syntax colours. On 10 November 2026 the user reported the missing
colours with a screenshot of a diff tab. A brainstorm gave three
approaches, and the user chose option C of decision 218 on the same day:
each diff line takes the colours of its line in the whole old or new file.
The diff reply of the Worker already holds both whole files, so the change
needs no backend, runner, or contract change.

The change does not add a split view, a highlighter library, a background
worker for colours, or a new colour palette. Those stay as they are, as
decision 218 and the design calls below say.

Contract owners:

- [Tools of a workspace](../docs/protocol/workspace-tools.md#files-and-changes).
- The [Files screens README](../src/files/README.md).
- The [mockup catalogue](../docs/mockups/README.md), page `app/files`.
- [Website docs](../docs/protocol/website-docs.md), for the public guide.
- [Conductor Cloud comparison](../docs/protocol/conductor-cloud-comparison.md#statuses),
  for the "Diff viewer" row.

## Decision 218: Diffs show no syntax colours

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `src/files/diff/DiffView.tsx:48`
- **Terms:**
  - **Hunk:** one block of changed lines in a diff, with up to three unchanged lines around it.
  - **Diff reply:** the reply of the Worker's diff route, `DiffResponse` in `src/shared/files.ts`. It holds the patch and the whole old and new files.
  - **Multi-line comment or string:** a comment such as `/** … */`, or a string such as a template literal, that continues across lines.
- **Background:**
  - The Changes list opens the diff of a changed file as a tab. The tab shows a unified diff with old and new line numbers.
  - A file tab colours code with the in-house highlighter in `src/files/code/`. Only the file tab uses it.
  - The runner reads the whole old and new files from the same Git objects as the patch, and the Worker does not change them.
  - A measurement covered the 5,575 diffs of modified files with a known language, over all 575 commits of this repository. Every diff line matched its line in the whole file.
  - GitHub colours each diff line from its whole file. On two public commits, it colours the first lines of a hunk as a comment when the comment opens above the hunk.
- **Problem:** Each diff line shows as plain text. The protocol asks for syntax colours only in file tabs, so each option adds a requirement for diffs.
- **Impact if no action:** Code in a diff stays harder to read than the same code in its file tab. Reviews of agent changes stay slower.
- **Root question:** How does a reader of a diff see each line in the syntax colours of its file?
- **Options:**
  - **A.** Colour each diff line on its own. A line inside a multi-line comment or string gets wrong colours. That happened in 27.6% of the measured diffs. Effort: Medium.
  - **B.** Colour each hunk as two runs of lines: the old lines and the new lines. A hunk that starts inside a multi-line comment or string gets wrong colours, mostly in doc comments. That happened in 6.4% of the measured diffs. Effort: Medium.
  - **C.** Colour the whole old and new files from the diff reply. Each removed line takes the colours of its line in the old file. Each added or unchanged line takes the colours of its line in the new file. The colours are exact. A 5 MiB file took about 0.5 s for each side in Node on the sandbox, and a phone can be slower. A file tab already does this work for one side. Effort: Medium.
  - **D.** C, with code colours that keep a contrast of at least 4.5:1 on the green and red lines. The comment colour changes in both themes and the string colour in the light theme, or the diff lines get colours of their own. Comments then look brighter in file tabs and mockups too, or the diff colours drift from the file tab colours. Effort: Medium.
  - **E.** C, with the colours made in a background worker of the browser, as the Markdown preview does. The diff shows its last view until the new colours arrive. It adds a second worker that drops out-of-date replies, and its tests. It helps only files of several MiB, and the file tab still colours on the main thread. Effort: Large.
  - **F.** The Worker's diff route colours both whole files and sends the colours of the shown lines in a new field of the diff reply. The highlighter moves to `src/shared/`, and the diff reply, its parsers, and the protocol change. The Worker spends up to about 1 s on each read of two large files. A browser tab of an older app version shows file colours from older rules beside diff colours from newer rules. Effort: Large.
- **Left out:**
  - Change nothing. It fails the goal.
  - A highlighter library, such as Shiki or Prism. For diffs alone it fails the goal, because its colours differ from those of the file tab. For both tabs it still needs A, B, or C, so it is a separate decision about the file tab.
  - Colours that the runner sends. A stopped cloud computer can resume weeks later with an old runner, as the agent runner protocol says. Its diff colours can then differ from the file tab colours for weeks, which fails the goal.
  - Shared assumption, from the code: the colours come from the in-house highlighter. Its reason holds, because the diff then matches the file tab.
  - Shared assumption, from the code and the mockup: the diff stays one unified column. A split view is a separate feature, under consideration on the comparison page.
  - Shared assumptions that options drop: colours made in the browser, dropped by F. Colours made on the main thread, dropped by E. The current palette on the green and red lines, dropped by D.
- **Wider fix:** C, with one line renderer that the file tab and the diff tab share. A later code view then gets colours by default.
- **Previous examples:** None found. The diff view has shown plain text since 68a53b65, "feat(files): build workspace Files UI".
- **Recommendation:** C. It gives exact colours from data that each diff reply already holds, for about the same effort as A and B. E and F help only files of several MiB, and the palette change of D can follow later.
- **Action:** ask the user, because each option adds a new protocol requirement for diffs, and no recorded decision covers it.
- **Answer:** The user chose C on 10 November 2026, after the check of GitHub's output. The options check of the same day added D, E, and F after that answer, and kept the recommendation C.

The report of the options check is in
`.context/diff-syntax-colours/options-check-218.md`.

## Design calls

These calls are my own, made on 10 November 2026.

- Keep the in-house highlighter and its language rules. Reason: it meets
  the file tab requirement, and a library is a separate question.
- Keep the colour palette on the green and red lines. Reason: no protocol
  rule sets a text contrast, and option D can change it later. Comments
  drop from 4.0:1 on plain lines to 3.2:1 on added lines in the dark
  theme, and from 4.8:1 to 4.2:1 in the light theme. Light strings drop
  from 5.0:1 to 4.3:1 on removed lines.
- Colour on the main thread, and only up to the last line that the diff
  shows. Reason: the file tab colours its file on the main thread too. The
  worst case blocks the page for about 1 s in Node on the sandbox, when
  both sides are near the 5 MiB read limit.
- Keep the colours of each side while its text and its last shown line
  stay the same. Reason: the diff tab reads the diff again after each
  change of the file, and the old file does not change during the edits of
  an agent. A re-read then colours only the new side again.
- Split the whole files at each line feed and drop a carriage return
  before it, as the patch parser does. Reason: Git numbers lines this way.
  The split of the file tab also breaks a line at a lone carriage return,
  so its line numbers can differ from the hunk headers.
- Colour a diff line on its own when its text does not match its line in
  the whole file. Reason: the colours then stay right for that line, and
  the measurement found no such line.
- Take the language from the file name of the tab's path, for both sides,
  as the file tab does. Reason: a full path such as `docker/Dockerfile`
  finds no language, and a rename that changes the language is rare.
- In the mockup, colour each diff line on its own. Reason: the mockup
  fixtures hold no whole files, and per-line colours give the right
  picture for their lines.
- Teach the mockup highlighter the SQL keywords of the app, in any case,
  with no type colour for words with a capital letter. Reason: the SQL
  diff of `app/chat/masked-paths` then shows the colours of the app, not
  its keywords in the type colour.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The diff mockup gets syntax colours on its added, removed, and unchanged
lines. The `app/files` page and the `app/chat/masked-paths` page show it.

- [ ] Colour each line of `docs/mockups/src/components/files/DiffView.tsx`
      with the mockup highlighter, on every kind of line. Give the diff the
      language of its file.
- [ ] Add the SQL rules of the app to
      `docs/mockups/src/components/files/highlight.ts`: the keywords of
      `src/files/code/languages.ts`, in any case, `--` comments, and no
      type colour.
- [ ] Say in the description of the `diff` variant of `app/files` that the
      diff shows syntax colours.
- [ ] Run `npm run mockups:check`. Smoke-test the `diff` variant of
      `app/files` and the masked diff of `app/chat/masked-paths`, at phone
      and desktop sizes, in both colour schemes.
- [ ] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

The protocol states the colours of a diff with decision 218. The public
texts that describe diffs say that a diff shows syntax colours.

- [ ] Add to "Files and changes" in `docs/protocol/workspace-tools.md`: a
      diff shows the syntax colours of its file. Each removed line takes
      the colours of its line in the old file. Each added or unchanged line
      takes the colours of its line in the new file. Cite decision 218 with
      its reason: colours from the diff alone go wrong when a hunk starts
      inside a comment or a string that spans lines.
- [ ] Read the Terms page `src/marketing/terms.ts` and the Privacy page
      `src/marketing/privacy.ts` in full. Update each sentence that restates
      the colours of a file tab or a diff.
- [ ] Read each public guide in `src/marketing/docs/` in full. Say in
      "Inspect changes" of `files-and-changes.md` that a diff shows syntax
      colours. Update each other guide sentence that restates the fact.
- [ ] Say in the note of the "Diff viewer" row in
      `src/marketing/from-conductor/areas/review-and-merge.ts` that a diff
      shows syntax colours. Its status stays `available`.
- [ ] Check each relative link of each changed Markdown file.

## Milestone 3: Diff colours

Tags: ui

Depends on: 2

The diff tab colours its lines from the whole old and new files of the diff
reply, as decision 218 and the design calls say.

- [ ] Add the colours of the diff lines in `src/files/diff/`: colour the
      whole old and new files, and give each diff line the tokens of its
      line. Test a hunk that starts inside a comment, a side that opens a
      comment that the other side does not, a line that does not match its
      file, an added file, a deleted file, and a file without a language.
- [ ] Keep the colours of a side while its text and its last shown line
      stay the same.
- [ ] Draw the tokens in `DiffView` with one line renderer that `CodeView`
      shares.
- [ ] Pass the old and new files and the file name of the tab from
      `DiffPage`.
- [ ] Update `src/files/README.md`: the summary of the screens and the key
      code of `diff/` and `code/`.
- [ ] Open a diff on the development page of the Files screens. Check the
      colours in both colour schemes, and save screenshots under
      `.context/diff-syntax-colours/`.

## Milestone 4: Verification, commit, review, and pull request

Depends on: 1, 2, 3

- [ ] Run `npm run test -- src/files` and the complete gate,
      `npm run check`.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
- [ ] Check that decision 218 is still free on `origin/main`. Renumber it
      to the next free number when another change took it.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives decision 218 and the
      design calls of this plan with their dates, a permalink to this plan,
      and the follow-up items that the change adds.

Evidence of the brainstorm: `.context/diff-syntax-colours/brainstorm/`.
