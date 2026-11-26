import type { ReactNode } from 'react'
import type { InlineText } from '../../../../../src/chat/markdown/agent-inline'
import { answerShowsWords } from '../../../../../src/chat/markdown/answer-parts'
import type { AgentDrawing } from '../../../../../src/ui/components/chat/agentDrawing'
import { AnswerText } from './AnswerText'
import { answerReading } from './chatReading'
import { useChatWorkspaces } from './chatWorkspaces'
import { CodeBlock } from './CodeBlock'

/**
 * Draws `children` only when `text` shows words, as `answerShowsWords` of
 * the app reads it with what `AnswerText` reads the text with.
 */
function ShowsWords(props: { text: InlineText; children: ReactNode }) {
  const reading = answerReading(useChatWorkspaces())
  return answerShowsWords(props.text, reading) ? props.children : null
}

/**
 * How the mockups draw the shared blocks of the agent messages of their
 * fixtures: each text through the `AnswerText` of the mockups, where the
 * Markdown image of a picture file can show as its picture, each code block
 * through the `CodeBlock` of the mockups, in the colours of its fence
 * label, and each heading only when its text shows words.
 */
export const fixtureDrawing: AgentDrawing = {
  text: (text, place) => (
    <AnswerText line={place.line} pictures={place.pictures} text={text} />
  ),
  code: (text, label) => <CodeBlock label={label} text={text} />,
  ShowsWords,
}
