import type { ReactNode } from 'react'
import type { AgentDrawing } from '../../ui/components/chat/agentDrawing'
import type { InlineText } from '../markdown/agent-inline'
import { useShowsWords } from '../markdown/answer-reading'
import { AnswerText } from '../markdown/AnswerText'
import { CodeBlock } from './CodeBlock'

/**
 * Draws `children` only while `text` shows words where it draws, as
 * `useShowsWords` reads it with the tree and the links of the screen. So a
 * heading draws once a change of the tree gives it words, and goes again
 * when a change takes them.
 */
function ShowsWords(props: { text: InlineText; children: ReactNode }) {
  return useShowsWords(props.text) ? props.children : null
}

/**
 * How the chat draws the shared blocks of the agent message with the ID
 * `message`: each text through `AnswerText`, where the Markdown image of a
 * picture file can show as its picture, read for that message, each code
 * block through `CodeBlock`, in the colours of its fence label, and each
 * heading only while it shows words. A view keeps one drawing for each ID,
 * so the blocks of a live message draw again only when their data changes.
 */
export function answerDrawing(message: string): AgentDrawing {
  const pictures = { message }
  return {
    text: (text, place) => (
      <AnswerText
        line={place.line}
        pictures={place.pictures ? pictures : undefined}
        text={text}
      />
    ),
    code: (text, label) => <CodeBlock label={label} text={text} />,
    ShowsWords,
  }
}
