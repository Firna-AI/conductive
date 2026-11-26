# Chat text key code

This guide belongs to [Chat key code](key-code.md). It names the files,
the types, and the functions that read and draw the text of the chat: the
links, the chips, the mentions, the pictures, and the Markdown of agent
messages. [Agent text](agent-text.md), [Text links](text-links.md), and
[Pictures in answers](answer-pictures.md) give their rules. Each path is
relative to `src/chat/`, the folder of this guide.

- `links/`: `workspace-links.ts`, the link syntax, the reader of the
  links of a message field, and `linkTarget`, with the session of a
  session link. Its `sessionTarget` gives the same target for a session
  that the chat names by its IDs. `chat-parts.ts` is the reading of
  sent messages, over the tokens of `chat-tokens.ts`. In it,
  each mention of a file of the message is an
  `AttachmentPart`, also when the tree holds that path, and also without a
  tree. Its `filesWithoutChip` gives the files of a message that no part
  shows as a chip. `link-parts.ts` gives the `LinkPart` of a web link with
  its address, and the `CodePart` of code that holds one address alone.
  `LinksContext.tsx` gives the workspaces that chips find
  the open of a chip, and the origin of the chat's workspace link.
  In a sent member message, each skill text that names a listed skill is
  a skill part. `skillTextAt` in the shared contracts owns that rule.
  `LinkedText.tsx` holds `useChatParts` and
  `ChatText`. `useChatParts` reads the parts of a text with the workspaces
  and the tree and skill lists of the chat, the files of a sent message, and the web links
  of `useTextLinks` in `../shell/ui/text-links.tsx`. The agent of the
  choice of the message comes first in the lookup of its skills, as
  `findListedSkill` finds them. Each skill part keeps the skill and the
  agent whose list holds it, so the title of a skill chip and its skill
  tab come from one lookup.
  `ChatText` draws the parts with their workspace and session chips, and
  their links through `WebLinkText.tsx`. `SkillLink.tsx` draws a skill part
  as a `SkillChip` that links to the skill tab of its part, through
  `skillTabs` of `ChatMentions`. In a chat without `skillTabs`, the chip
  opens nothing. Answers keep skill text as text.
  `FileChips.tsx` draws the file chips,
  and each `AttachmentPart` as the shared `SentFileChip`.
  `SessionLinkText` draws a session that the chat names by its IDs, such
  as the session whose agent stopped a turn, with the same session chip.
  [Chips of attached files](../../docs/protocol/file-mentions.md#chips-of-attached-files)
  states the rules of that chip. The chip opens the file tab of its copy
  through `openFile` and `href` of `ChatMentions`. It opens nothing when
  `ChatText` gets no `opens`, or in a chat without `ChatMentions`.
  `LinkChip` of `LinkedText.tsx` and `FileLink` of `FileChips.tsx` draw
  the chips that answers share. `FilePicture.tsx` draws the Markdown image
  of a picture file of an answer as the shared `AnswerPicture`, and
  `picture-read.ts` reads and decodes its file, as
  [Pictures in answers](answer-pictures.md) says.
  `mention-copy.ts` makes
  the browser's own copy of chat text give the text of each chip that has
  a `data-mention` mark: each file chip, each skill chip, each `SentFileChip`, and each
  picture of an answer, with the box of its label. Each such
  chip holds its copy text in a `ChipCopyText`, which shows only while the
  root of the page has `COPYING_CLASS`. The style sheet of `ChipCopyText`
  gives that class, so the class name has one source. The copy sets the class, moves an
  edge of the selection inside a chip to the edge of the chip, and the
  next animation frame removes the class before the page paints.
  `chipOf` in `LinksContext.tsx` gives what a chip shows of its workspace.
- `links/session-links.ts`: `useLinkedSession`, the session that a chip
  finds: a live session of the chat's workspace, or one of the one read of
  another workspace in `session-reads.ts`, made again for each load of a
  chat or of New workspace. `chat-links.ts` gives a chat its links, with
  the origin of the link of its workspace.
- `mentions/`: `mention-rows.ts` gives the entries that the list offers and
  their order. `MentionsContext.tsx` gives the files that the chat gets and
  the tree that the list and the chips find, with one value for each tree.
  Its `useFilesMentionTree` gives that tree to a part outside the chat,
  such as Add to chat of the Files panel, and `MentionTarget` names a file
  or a folder of a mention.
  `MentionIcon.tsx` gives the icon of All files for an entry.
  `mention-skills.ts` gives `MentionSkills`, the skill lists in
  `ChatMentions.skills`, and `findListedSkill`, the lookup of a skill of
  either agent, which also gives the agent whose list holds the skill. It
  holds no React, so the readers of chat text use its types, and
  `useMentionSkills` of `MentionsContext.tsx` follows the lists.
  `ChatMentions.skillTabs` opens the skill tab of a skill chip and gives
  its address.
  `skill-rows.ts` gives the rows of the list of `/` and their order.
  [`skill-text.ts`](../shared/skill-text.ts) owns the shared skill text rule.
  [`mention-text.ts`](../shared/mention-text.ts) in the shared contracts
  owns the text of a mention, which the chat shares with the Worker.
- `markdown/agent-blocks.ts`: `agentBlocks`, the chat adapter of the
  shared Markdown parser. It gives the paragraphs, headings, lists with
  their task boxes, code blocks, quotes, rules, and tables of an agent
  message, with `TextTable` of `markdown/agent-tables.ts` and the
  paragraphs and headings of `markdown/agent-paragraphs.ts`. In live text,
  `markdown/live-end.ts` finds the block where the text ends, and
  `markdown/live-marks.ts` closes its open marks. `markdown/agent-inline.ts`
  gives the inline tree of each block, with every line break.
  `markdown/answer-parts.ts`: `answerParts`, the chips and the links of an
  inline tree, with the line breaks of `markdown/agent-breaks.ts` and the
  mentions of `markdown/answer-text.ts`. `markdown/AnswerText.tsx`:
  `AnswerText`, which draws them, with the pictures of a message, and
  `markdown/FileTextLink.tsx`, a link to a file. `samePlainData` of
  `components/same-data.ts` lets a block draw again only when its data
  changes. `components/AgentText.tsx`:
  `AgentText`, which draws the blocks of an answer, with the heading and
  prose styles that the file preview shares.
  `components/answer-drawing.tsx`: `answerDrawing`, the drawing of the app
  for the blocks of one message.
- `../ui/components/chat/`: the blocks that the chat
  shares with the mockups. `AgentBlocks.tsx`: `AgentBlocks`, the blocks of
  an answer and of the body of an open message line. `LineBlocks.tsx`:
  `LineBlocks`, the blocks of a message line, as spans, with the named
  task boxes of the line, and `holdsTable`. `agentDrawing.ts`:
  `AgentDrawing` and `TextPlace`, which tell the blocks how a view draws
  their text, their code, and their headings.
