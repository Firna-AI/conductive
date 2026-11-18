# Screenshots in answers

Status: Active. On branch `calummoore/screenshots-prompts-imnj`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

Agents check interface work in a browser on the desktop of the cloud
computer, but the member never sees what they saw. The agent instructions
say only where to keep screenshots, and a rule says that they do not ask
the agent to show a screenshot in a reply. In an answer, a Markdown image
of a workspace file shows as a link that opens the file tab. This change
asks agents to save and show a screenshot of interface work, and shows
such a Markdown image as a picture in the answer.

The change does not show the images that an agent reads in a turn by
itself, the images that the computer tools return inline, or pictures of
attached files in a message.

## Decisions

The user chose both decisions on 18 November 2026, after a brainstorm on
17 November 2026.

- **Screenshot decision 1: B.** The agent instructions get one line:
  "When you design or check an interface in a browser, save a screenshot
  of the result as a PNG file in the context folder. Show it in your reply
  as a Markdown image." It replaces the rule that the instructions do not
  ask the agent to show a screenshot in a reply.
  - Alternative A: the agent saves the screenshot and reads the file, so
    that an automatic preview shows it. Not chosen, because decision 2
    chose previews that the agent picks, and a second read costs tokens.
  - Left out: automatic screenshots by the runner, because the sessions
    share one desktop. Text that names the screenshot tool, because the
    instructions never name single computer tools.
  - Reason: one short line reaches agents powered by Claude and Codex. A
    Markdown image of a file already opens the picture in the file tab, so
    the line helps before the picture ships.
- **Screenshot decision 2: B.** The agent picks the images. A Markdown
  image of a picture file of the workspace in an answer shows as a small
  picture. A press on it opens the file tab. Plain Markdown links and file
  chips stay as they are. This changes the part of answer chip decision 4,
  of 13 November 2026, that shows a Markdown image as a link.
  - Alternative A: chips with image names at the end of the turn. No
    picture, so it misses the goal.
  - Alternative C: an automatic picture at the end of the turn for each
    image file that a read call names. Not chosen: it shows images that
    the member does not need, such as attached files and failed attempts,
    and it needs a mapping of Codex image views.
  - Alternative D: the runner stores a small copy of each read image in
    the chat event. Not chosen: it needs a new event field and an image
    library, and the secret filter cannot hide values in a picture.
  - Reason: the agent knows which images show the result, and it is the
    smaller job.

## Design calls

These are my calls of 18 November 2026, under the decision test.

- Only the `![label](path)` form shows a picture. A Markdown link without
  `!` to a picture file stays a link. Reason: the agent asks for a picture
  with the image form, and a link stays a link.
- Only PNG, JPEG, GIF, and WebP files show as pictures, as in the file
  tab. An SVG file stays a link. Reason: one rule for pictures in the app.
- The picture keeps its proportions. It fits the width of the answer, up
  to a height of 240 CSS pixels. Its alternative text is the label, and
  its title is the path, as for the link. Reason: the answer stays short
  to read, and the file tab shows the full size.
- A press on the picture opens the file tab, as the link does. A press
  with a modifier key stays with the browser. Reason: same as each other
  file link of the chat.
- The picture reads the file through the existing file read route of the
  file tab. It adds no route, no event field, and no storage.
- The chat reads a picture only while the sandbox runs. It never starts or
  resumes a sandbox for a picture. Without a running sandbox, the image
  shows as the link of today. Reason: a resume that the member did not ask
  for costs money, as [Stop and resume](../docs/protocol/stop-and-resume.md)
  says.
- A read starts only when the picture comes near the view. At most two
  reads run at one time. One open chat reads each path once. Reason: an
  image can be up to 5 MiB, and a long chat can hold many.
- While the read runs, a box of the final width shows the label. When the
  read fails, the file passes the read limit, or the browser cannot draw
  the bytes, the image shows as the link of today. Reason: the link still
  opens the file tab, which gives the reason.
- A picture shows in the text of each agent message, also in list items.
  In a heading and a table cell, the image stays a link. Reason: a picture
  in those places breaks the layout of the heading or the row.
- A copy of the answer and the Markdown transcript keep the Markdown that
  the agent wrote. Reason: a copy gives the text as written.
- Risk: when an agent saves a new screenshot under an old name, an older
  answer shows the newer image. The file tab has the same behaviour.

Contract owners:

- [Agent instructions](../docs/protocol/agent-instructions.md).
- [File mentions](../docs/protocol/file-mentions.md#files-in-answers).
- [Chat Markdown](../docs/protocol/chat-markdown.md).
- The [chat README](../src/chat/README.md).

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The answer of `app/file-mentions/answers` already holds the Markdown
image of a screenshot, "Postcode field on a phone". It shows that image as
a picture, on desktop and on a phone.

- [ ] Show the Markdown image of `app/file-mentions/answers` as a picture,
      with the size rules of the design calls. Update its description and
      rationale with screenshot decision 2.
- [ ] Add child pages for the loading box and for a stopped sandbox,
      where the image shows as a link. Keep each page at five screens or
      fewer.
- [ ] Update `user-flows/open-a-file-from-an-answer` so that a press on
      the picture opens the picture in the file tab, `app/files/image`.
- [ ] Update `docs/mockups/catalogue-workspace-tools.md` for the changed
      pages and the flow.
- [ ] Run `npm run mockups:check`. Smoke-test the changed pages on desktop
      and on a phone.
- [ ] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

- [ ] In `docs/protocol/agent-instructions.md`, add the screenshot line to
      the guidance, and replace the rule that the instructions do not ask
      the agent to show a screenshot in a reply.
- [ ] In `docs/protocol/file-mentions.md`, under Files in answers, say
      that a Markdown image of a picture file shows as a picture, with the
      rules of the design calls.
- [ ] In `docs/protocol/chat-markdown.md`, update the Markdown image rule.
- [ ] Read the Terms page, `src/marketing/terms.ts`, the Privacy page,
      `src/marketing/privacy.ts`, and each public guide in
      `src/marketing/docs/` in full. Update each sentence that restates a
      changed fact.
- [ ] Check each relative link of each changed Markdown file.

## Milestone 3: The screenshot line

Depends on: 2

- [ ] Add the screenshot line to `crates/cnd-runner/src/engine/instructions.rs`,
      after the line on the computer tools.
- [ ] Update the tests of the instructions text.
- [ ] Update the instructions test of the SDK helper in
      `runner/sdk-helper/src/providers/instructions.test.ts` when it holds
      the text.
- [ ] Run the Rust checks of `AGENTS.md` and the runner tests.

## Milestone 4: Picture reads for the chat

Depends on: 2

The chat gets a way to read the picture of one workspace file, with the
limits of the design calls. It adds no screen.

- [ ] Add a picture reader beside the file page in `src/files/`. It uses
      `FilesClient.readFile` and `fileView`, runs at most two reads at one
      time, and keeps one result for each path.
- [ ] Give the reader to the chat through `ChatMentions`, only while the
      sandbox runs. Wire it where the workspace screen builds the mentions.
- [ ] Add unit tests for the limit of two reads, the result for each
      path, a failed read, and a file over the limit.

## Milestone 5: Pictures in answers

Tags: ui

Depends on: 1, 4

- [ ] Add a picture part for the `![label](path)` form of a picture file
      in `src/chat/links/chat-parts.ts`. Keep the link part for headings,
      table cells, and each other file.
- [ ] Add the picture component beside `FileTextLink.tsx`: the loading
      box, the picture, the press that opens the file tab, and the link
      when no reader exists or the read fails.
- [ ] Start the read only when the picture comes near the view.
- [ ] Add DOM tests for each state, and for the copy of an answer with a
      picture.
- [ ] Update the chat README and the links docs of the chat.
- [ ] Smoke-test in the browser: an answer with a screenshot, a stopped
      sandbox, and a phone width. Save the screenshots under
      `.context/screenshots-in-answers/`.

## Milestone 6: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run the targeted tests and the complete gate named in `AGENTS.md`.
      Run the Rust checks too.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives the decisions and the
      design calls of this plan with their dates, a permalink to this plan,
      and the follow-up items that the change adds.

## Post-merge follow-up (non-blocking)

- [ ] In a new session of the deployed app, ask an agent to check a page
      in the browser. Confirm that its answer shows the screenshot as a
      picture, and that a press on it opens the file tab.
