# Pictures in Markdown

Status: Active. Not started. It starts after the change "One Markdown parser for the chat and the file preview" merges, from branch `calummoore/output-summary-f7sm`, and it gets its own branch. The pull request that completes the work deletes this plan, as the `plans` skill says.

Agents keep screenshots in the context folder of the workspace and name
them in an answer as a Markdown image, such as
`![Login](/home/user/code/app/.context/login.png)`. Since pull request
#361, the chat shows such an image as a link with its label. One press
opens the file tab, which draws the picture. A Markdown file in the file
preview shows only the alt text of an image. On 16 November 2026 the user
asked to show the image in the message itself.

This change draws each image whose address names a picture file of the
workspace. The chat and the file preview read the file through the
existing file route, as the file tab does, and draw its bytes from a
`data:` address. It needs no new route, no change to the content security
policy, and no stored copy. The agent instructions tell agents that the
chat shows such pictures. A picture at a web address stays a link, by
item 5 A of the Markdown parser change ("One Markdown parser for the chat and the file preview").


Note of 20 November 2026: pull request #498 on `main` already shows agent
screenshots as pictures in chat answers, with its own decisions. Before
this plan starts, check which of its decisions and TODOs #498 meets. The
merge record of the Markdown parser change lists them: #498 meets item 4 A
and most design calls for the chat. Item 7 B, pictures in the file
preview, design calls 13 and 14, and Milestone 5 remain.

## Decisions

The full items, with every option, are in
`.context/markdown-it-reader/images-options.md`.

- **Item 4, agent screenshots show only as a link: A**, read on view (Cal,
  17 November 2026). Not chosen: B, load from the download route, which
  needs a policy change for the Mac app. C, A with a smaller copy from a
  new runner command. D, a copy in app storage when the message ends,
  which adds stored user data. F, change nothing, so one press on the
  #361 link shows the picture. Left out: E, a file chip, which #361
  already gives as a link. Reason: members see the picture beside the
  words of the agent, with the code of the file tab and no new route.
- **Item 6, agent instructions about screenshots: B** (Cal, 17 November
  2026). The instructions say that the chat shows a Markdown image of a
  picture file in the repository folder. Not chosen: A, keep the rule and
  change only its reason. Reason: agents then show screenshots where the
  chat can draw them.
- **Item 7, pictures in the file preview: B** (Cal, 17 November 2026).
  Both views draw pictures. A path counts from the folder of the Markdown
  file. Not chosen: A, only the chat. Reason: one look for both views, as
  item 8 D chose.

## Design calls

Each is my call (17 November 2026), with its reason. Most come from the
image brainstorm.

1. Formats: PNG, JPEG, GIF, and WebP, known by the extension with
   `pictureType`. SVG and other files keep the link. Reason: one rule
   with the file tab, decision 265 B.
2. Size: the read limit of 5 MiB, with no smaller cap. A larger file keeps
   the link. Reason: a smaller cap is a new rejection, which needs the
   user.
3. When to read: when the picture nears the view, with no press, at most
   two reads at a time in each tab. Reason: the user asked to see the
   picture, and the limit bounds the data.
4. The box: as wide as the message at most, with a largest height that
   the mockups set. The picture keeps its proportions, and the box keeps
   its size while the picture loads. Reason: a tall screenshot must not
   fill the chat, and a late picture must not move the text that the
   member reads.
5. Alt text: the label is the `alt` of the picture. An empty label gives
   the file name. The title is the path with its lines, as `fileTitle`
   gives. Reason: screen readers, and one title with the #361 link.
6. Failure: the #361 link stays, with a short reason beside it, such as
   "Not found" or "Waits for the cloud computer". Reason: the member keeps
   a way to the file and learns why. The words follow the copy rules.
7. A stopped cloud computer: no picture starts it. The picture waits, as
   `useFollowed` waits, and a drawn picture stays. Reason: decision 11
   says that nothing restarts a stopped cloud computer without a press.
8. An archived workspace, or a chat without a file tree: the #361 rules
   apply, so the image stays its label. Reason: no file reads.
9. Paths: the image reads its target with `fileLinkTarget`, as the #361
   link does. In the file preview, a relative path counts from the folder
   of the Markdown file. Reason: one path rule per view.
10. A press opens the file tab, as the #361 link does. A click with a
    modifier key keeps the browser action.
11. Work fold: a closed message line shows the label. An open line shows
    the picture under the line, as it shows a table. Reason: the closed
    line stays one line.
12. A picture inside a link, a heading, or a table cell shows its label as
    the #361 link. Reason: a picture in a link can hide where the link
    leads, and a cell stays one row high.
13. A `data:` image of the four formats draws at once, with no read.
    Reason: the policy allows it, and no request leaves the app.
14. A picture reads its file again when an event changes it, as the file
    tab does. Reason: a file that the agent saves after its message still
    shows.
15. Memory: one cache in memory for each browser tab, with a byte cap.
    Nothing goes to the disk. Reason: no chat stays on the disk of the
    device.
16. The copied transcripts do not change.

Contract owners:

- [Chat Markdown](../docs/protocol/chat-markdown.md) and
  [File mentions](../docs/protocol/file-mentions.md#files-in-answers).
- [Workspace tools](../docs/protocol/workspace-tools.md), for the file
  preview and the file tab.
- [Agent instructions](../docs/protocol/agent-instructions.md).
- [Agent text](../src/chat/agent-text.md) and the
  [Files README](../src/files/README.md).

Replaced ways:

- The `data:` picture of the file tab in `src/files/page/file-view.ts`
  → one shared picture read, used by the file tab, the chat, and the file
  preview. Consumers: `FileBody.tsx`, `FilePage.tsx`, and their tests.
  Moved in Milestone 4.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

- [ ] Add states to `app/file-mentions/answers`: a picture in an answer,
      while it loads, after a failure, in a closed and an open message line,
      and in a table cell.
- [ ] Add a picture to the Markdown file of the file preview mockup.
- [ ] Run `npm run mockups:check`. Smoke-test the changed pages.
- [ ] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

- [ ] `docs/protocol/file-mentions.md` and `chat-markdown.md`: pictures of
      workspace files, with design calls 1 to 16.
- [ ] `docs/protocol/workspace-tools.md`: pictures in the file preview.
- [ ] `docs/protocol/agent-instructions.md`: the sentence of item 6 B.
- [ ] `src/chat/agent-text.md` and `src/files/README.md`.
- [ ] Read the Terms page, the Privacy page, and each public guide in
      `src/marketing/docs/` in full. Update each sentence that restates a
      changed fact.

## Milestone 3: Agent instructions

Depends on: 2

- [ ] Add the sentence of item 6 B to the instructions in
      `crates/cnd-runner/src/engine/instructions.rs`, with its test.
- [ ] Run the Rust checks of `AGENTS.md`.

## Milestone 4: Pictures in the chat and the file preview

Tags: ui

Depends on: 2

- [ ] Move the picture read of the file tab into one shared module, with
      the read limit of design call 3 and the cache of design call 15.
- [ ] Draw a picture for an image of the chat adapter, with design calls 4
      to 14.
- [ ] Draw a picture for an image of the preview adapter, with design call
      9 for its path.
- [ ] Add tests for each design call that the code decides.

## Milestone 5: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run the targeted tests, `npm run check`, and the Rust checks.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives the decisions and the
      design calls of this plan with their dates, a permalink to this
      plan, and the follow-up items that the change adds.

## Post-merge follow-up (non-blocking)

- [ ] Ask an agent for a screenshot in production, and check that the
      picture shows in the chat, on a desktop and on a phone.
