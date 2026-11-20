import type { ReactNode } from 'react'
import type { InlineText } from '../../../../../src/chat/markdown/agent-inline'
import type { AgentDrawing } from './agentDrawing'
import { textShowsWords } from './answerNodes'
import { AnswerText } from './AnswerText'
import { CodeBlock } from './CodeBlock'

/** Draws `children` only when `text` shows words, as `answerNodes` reads it. */
function ShowsWords(props: { text: InlineText; children: ReactNode }) {
  return textShowsWords(props.text) ? props.children : null
}

/**
 * How the mockups draw the shared blocks of the agent messages of their
 * fixtures: each text through the `AnswerText` of the mockups, where the
 * Markdown image of a picture file can show as its picture, each code block
 * through the `CodeBlock` of the mockups, and each heading only when its
 * text shows words.
 */
export const fixtureDrawing: AgentDrawing = {
  text: (text, place) => (
    <AnswerText line={place.line} pictures={place.pictures} text={text} />
  ),
  code: (text) => <CodeBlock text={text} />,
  ShowsWords,
}
