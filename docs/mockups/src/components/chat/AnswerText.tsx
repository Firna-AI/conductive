import type { InlineText } from '../../../../../src/chat/markdown/agent-inline'
import {
  answerParts,
  type AnswerPart,
} from '../../../../../src/chat/markdown/answer-parts'
import { answerReading } from './chatReading'
import { useChatWorkspaces } from './chatWorkspaces'
import { ReadChip } from './LinkChip'
import { FileLinkText, FilePicture, MentionChip } from './MentionChip'
import { CodeText, WebLinkText } from './WebLinkText'

/**
 * The element of each mark. Their look comes from the `prose` class of
 * `MarkdownProse.module.css` around the text, such as the weight of bold
 * text.
 */
const markTags = { strong: 'strong', emphasis: 'em', strike: 'del' } as const

/**
 * How a text draws: in a message line or not, and whether the Markdown
 * image of a picture file can show as its picture.
 */
interface Drawing {
  line: boolean
  pictures: boolean
}

/**
 * The label of a picture as plain text, for its alternative text and for
 * its box: the words of the label without their marks, with a space for
 * each line break, as the app draws it.
 */
function plainLabel(parts: readonly AnswerPart[]): string {
  return parts
    .map((part) => {
      if (part.kind === 'text' || part.kind === 'code') return part.text
      if (part.kind === 'mark') return plainLabel(part.parts)
      return part.kind === 'break' ? ' ' : ''
    })
    .join('')
}

/**
 * A line break. In a message line, a space comes before it: the closed line
 * hides the break, so it stays one line, and the space keeps the words
 * apart. The open line breaks the line.
 */
function LineBreak(props: { line: boolean }) {
  if (!props.line) return <br />
  return (
    <>
      {' '}
      <br />
    </>
  )
}

/**
 * A Markdown link or image of an answer to a file of the tree: a link with
 * its label, which opens the file. Where pictures show, the image of a
 * picture file shows as its picture (screenshot decision 2).
 */
function TreeFileLink(props: {
  part: Extract<AnswerPart, { kind: 'file-link' }>
  drawing: Drawing
}) {
  const { part, drawing } = props
  const { entry, lines } = part
  if (!part.picture || !drawing.pictures) {
    return (
      <FileLinkText entry={entry} lines={lines}>
        <AnswerParts drawing={drawing} parts={part.label} />
      </FileLinkText>
    )
  }
  return (
    <FilePicture entry={entry} label={plainLabel(part.label)} lines={lines} />
  )
}

/** Draws one part of the text of an agent message. */
function Part(props: { part: AnswerPart; drawing: Drawing }) {
  const { part, drawing } = props
  switch (part.kind) {
    case 'text':
      return part.text
    case 'code':
      return <CodeText part={part} />
    case 'break':
      return <LineBreak line={drawing.line} />
    case 'mark': {
      const Mark = markTags[part.mark]
      return (
        <Mark>
          <AnswerParts drawing={drawing} parts={part.parts} />
        </Mark>
      )
    }
    case 'chip':
      return <ReadChip target={part.target} />
    case 'link':
      return (
        <WebLinkText link={part.link}>
          <AnswerParts drawing={drawing} parts={part.words} />
        </WebLinkText>
      )
    case 'file':
      return <MentionChip part={part} />
    case 'file-link':
      return <TreeFileLink drawing={drawing} part={part} />
  }
}

/** Draws the parts of the text of an agent message in order. */
function AnswerParts(props: {
  parts: readonly AnswerPart[]
  drawing: Drawing
}) {
  return props.parts.map((part, index) => (
    <Part drawing={props.drawing} key={index} part={part} />
  ))
}

/**
 * The inline text of a block of an answer, or of a message line in the
 * work of a turn, as the fixtures write it with the inline tree of the app.
 * `answerParts` of the app reads it with the workspaces of the chat and the
 * tree of the mockups: each link to a workspace of the org is a chip, each
 * mention and each inline path of the tree is a file chip, and a Markdown
 * link shows as its label. `line` draws the text of a message line, whose
 * closed line shows each line break as a space. With `pictures`, as in a
 * paragraph or a list item, the Markdown image of a picture file shows as
 * its picture (screenshot decision 2). A heading and a table cell keep its
 * link.
 */
export function AnswerText(props: {
  text: InlineText
  line?: boolean
  pictures?: boolean
}) {
  const parts = answerParts(props.text, answerReading(useChatWorkspaces()))
  const drawing: Drawing = {
    line: props.line === true,
    pictures: props.pictures === true,
  }
  return <AnswerParts drawing={drawing} parts={parts} />
}
