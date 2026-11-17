import { useTextLinks } from '../../shell/ui/text-links'
import { FileLink, LinkChip, useEntryLookup } from '../links/LinkedText'
import { useChatLinks } from '../links/LinksContext'
import { CodeText, ChatWebLink } from '../links/WebLinkText'
import { useRepositoryFolder } from '../mentions/MentionsContext'
import type { InlineText } from './agent-inline'
import {
  answerParts,
  namesFiles,
  type AnswerPart,
  type AnswerReading,
} from './answer-parts'
import { FileTextLink } from './FileTextLink'

/**
 * The element of each mark. Their look comes from the `prose` class of
 * `MarkdownProse.module.css` around the text. Bold text keeps the weight of
 * the browser (open question, item 11 of the Markdown parser plan).
 */
const markTags = { strong: 'strong', emphasis: 'em', strike: 'del' } as const

/**
 * What the chat reads the text with: the workspaces of the chat, the web
 * links of the screen, and the tree, while the chat has one. A text that
 * can name no file follows no change of the tree.
 */
function useAnswerReading(text: InlineText): AnswerReading {
  const { links } = useChatLinks()
  const find = useEntryLookup(namesFiles(text))
  const root = useRepositoryFolder()
  const { linkOf } = useTextLinks()
  return { links, web: linkOf, files: find ? { find, root } : undefined }
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

/** Draws one part of the text of an agent message. */
function Part(props: { part: AnswerPart; line: boolean }) {
  const { part, line } = props
  switch (part.kind) {
    case 'text':
      return part.text
    case 'code':
      return <CodeText part={part} />
    case 'break':
      return <LineBreak line={line} />
    case 'mark': {
      const Mark = markTags[part.mark]
      return (
        <Mark>
          <AnswerParts line={line} parts={part.parts} />
        </Mark>
      )
    }
    case 'chip':
      return <LinkChip target={part.target} />
    case 'link':
      return (
        <ChatWebLink link={part.link}>
          <AnswerParts line={line} parts={part.words} />
        </ChatWebLink>
      )
    case 'file':
      return <FileLink part={part} />
    case 'file-link':
      return (
        <FileTextLink entry={part.entry} lines={part.lines}>
          <AnswerParts line={line} parts={part.label} />
        </FileTextLink>
      )
  }
}

/** Draws the parts of the text of an agent message in order. */
function AnswerParts(props: { parts: readonly AnswerPart[]; line: boolean }) {
  return props.parts.map((part, index) => (
    <Part key={index} line={props.line} part={part} />
  ))
}

/**
 * The inline text of one block of an agent message, such as a paragraph,
 * a heading, a list item, or a table cell: its inline code, its bold text,
 * its emphasis, its strikethrough, and its line breaks, with each link of
 * a workspace as a chip, each mention and each inline path of the tree as
 * a file chip, and each web link, as `answerParts` reads them. `line`
 * draws the text of a message line, whose closed line shows each line
 * break as a space.
 */
export function AnswerText(props: { text: InlineText; line?: boolean }) {
  const parts = answerParts(props.text, useAnswerReading(props.text))
  return <AnswerParts line={props.line ?? false} parts={parts} />
}
