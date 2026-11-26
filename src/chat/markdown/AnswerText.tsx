import { memo } from 'react'
import { samePlainData } from '../components/same-data'
import { FileLink } from '../links/FileChips'
import { FilePicture, type AnswerPictures } from '../links/FilePicture'
import { LinkChip } from '../links/LinkedText'
import { CodeText, ChatWebLink } from '../links/WebLinkText'
import type { InlineText } from './agent-inline'
import { answerParts, namesFiles, type AnswerPart } from './answer-parts'
import { useAnswerReading } from './answer-reading'
import { FileTextLink } from './FileTextLink'

/**
 * The element of each mark. Their look comes from the `prose` class of
 * `MarkdownProse.module.css` around the text, which the file preview
 * shares, such as the weight of bold text.
 */
const markTags = { strong: 'strong', emphasis: 'em', strike: 'del' } as const

/**
 * How a text draws: in a message line or not, and with the pictures of its
 * message or without them.
 */
interface Drawing {
  line: boolean
  pictures?: AnswerPictures
}

/**
 * The label of a picture as plain text, for its alternative text and for
 * its box: the words of the label without their marks, with a space for
 * each line break, as the file preview shows alt text.
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
 * A Markdown link or image to a file of the tree. With the pictures of its
 * message, the image of a picture file shows as its picture, else as its
 * link.
 */
function TreeFileLink(props: {
  part: Extract<AnswerPart, { kind: 'file-link' }>
  drawing: Drawing
}) {
  const { part, drawing } = props
  const { entry, lines, picture } = part
  const label = <AnswerParts drawing={drawing} parts={part.label} />
  if (!picture || !drawing.pictures) {
    return (
      <FileTextLink entry={entry} lines={lines}>
        {label}
      </FileTextLink>
    )
  }
  return (
    <FilePicture
      entry={entry}
      label={plainLabel(part.label)}
      lines={lines}
      message={drawing.pictures.message}
      source={picture.source}
    >
      {label}
    </FilePicture>
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
      return <LinkChip target={part.target} />
    case 'link':
      return (
        <ChatWebLink link={part.link}>
          <AnswerParts drawing={drawing} parts={part.words} />
        </ChatWebLink>
      )
    case 'file':
      return <FileLink part={part} />
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
 * The inline text of a block, whether it draws in a message line, and the
 * pictures of its message, where its images of picture files show as their
 * pictures.
 */
interface AnswerTextProps {
  text: InlineText
  line?: boolean
  pictures?: AnswerPictures
}

/**
 * The inline text of one block of an agent message, such as a paragraph,
 * a heading, a list item, or a table cell: its inline code, its bold text,
 * its emphasis, its strikethrough, and its line breaks, with each link of
 * a workspace as a chip, each mention and each inline path of the tree as
 * a file chip, and each web link, as `answerParts` reads them. `line`
 * draws the text of a message line, whose closed line shows each line
 * break as a space. With `pictures`, as in a paragraph or a list item, the
 * Markdown image of a picture file shows as its picture. A heading and a
 * table cell give no `pictures`, so the image keeps its link there.
 *
 * A text draws again when its data changes, or when what the chat reads it
 * with changes: the workspaces, the tree, or the links of the screen, as
 * `useAnswerReading` gives them. A text that can name no file follows no
 * change of the tree. So a live update draws only the texts that changed.
 */
export const AnswerText = memo(function AnswerText(props: AnswerTextProps) {
  const reading = useAnswerReading(namesFiles(props.text))
  const parts = answerParts(props.text, reading)
  const drawing: Drawing = {
    line: props.line ?? false,
    pictures: props.pictures,
  }
  return <AnswerParts drawing={drawing} parts={parts} />
}, samePlainData)
