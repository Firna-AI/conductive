import { MarkedNodes } from '../common/MarkedNodes'
import { answerNodes, type AnswerNode, type AnswerPart } from './answerNodes'
import { FileLinkText, FilePicture } from './MentionChip'
import { Part } from './MessageText'
import { WebImagePart } from './WebLinkText'

/**
 * A line break of a message line: a space, then the break. The closed line
 * hides the break, so it stays one line, and the space keeps the words
 * apart. The open line breaks the line.
 */
const lineBreak = (
  <>
    {' '}
    <br />
  </>
)

/**
 * One unit of an answer: code, a chip, a link, an image as a link, or the
 * picture of a picture file. With `pictures`, the Markdown image of a
 * picture file shows as its picture, else as its link.
 */
function AnswerUnit(props: { part: AnswerPart; pictures: boolean }) {
  const { part } = props
  if (part.kind === 'file-link') {
    return part.picture && props.pictures ? (
      <FilePicture part={part} />
    ) : (
      <FileLinkText part={part} />
    )
  }
  if (part.kind === 'image') return <WebImagePart part={part} />
  return <Part answer part={part} />
}

/**
 * The nodes of the text of an answer, as `answerNodes` reads them: bold
 * text, emphasis, strikethrough, and line breaks around code, chips, and
 * links. `line` draws the text of a message line, whose closed line shows
 * each line break as a space. With `pictures`, as in a paragraph or a list
 * item of an answer, the Markdown image of a picture file shows as its
 * picture (screenshot decision 2). A heading and a table cell keep its
 * link.
 */
export function AnswerNodes(props: {
  nodes: readonly AnswerNode[]
  line?: boolean
  pictures?: boolean
}) {
  const pictures = props.pictures === true
  return (
    <MarkedNodes
      lineBreak={props.line ? lineBreak : undefined}
      nodes={props.nodes}
      unit={(part) => <AnswerUnit part={part} pictures={pictures} />}
    />
  )
}

/**
 * The text of an answer, or of a message line in the work of a turn. Each
 * link to a workspace of the org is a chip, each mention and each inline
 * path of the file tree is a file chip, and a Markdown link shows as its
 * label. The marks and the line breaks read as `answerNodes` says. With
 * `pictures`, the Markdown image of a picture file shows as its picture.
 */
export function AnswerText(props: {
  text: string
  line?: boolean
  pictures?: boolean
}) {
  return (
    <AnswerNodes
      line={props.line}
      nodes={answerNodes(props.text)}
      pictures={props.pictures}
    />
  )
}
