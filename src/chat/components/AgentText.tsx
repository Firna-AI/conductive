import { memo, useMemo } from 'react'
import { AgentBlocks } from '../../ui/components/chat/AgentBlocks'
import itemStyles from '../../ui/components/chat/ChatItemView.module.css'
import { classes } from '../../ui/components/common/classes'
import headingStyles from '../../ui/components/common/MarkdownHeadings.module.css'
import prose from '../../ui/components/common/MarkdownProse.module.css'
import { agentBlocks } from '../markdown/agent-blocks'
import { answerDrawing } from './answer-drawing'

/**
 * An answer of the agent: paragraphs, headings, lists, code, quotes, rules,
 * and tables, as `agentBlocks` reads them with the shared Markdown parser,
 * drawn by the shared `AgentBlocks`. A heading is `h1` to
 * `h6`, at the level that the agent wrote, and its look comes from the
 * heading style that the file preview shares. Quotes, rules, bold text,
 * emphasis, strikethrough, and task boxes take the look of the shared
 * `MarkdownProse.module.css`. A list item holds the blocks that the agent
 * indents under it. The text of each block draws through `AnswerText`. The
 * Markdown image of a picture file in a paragraph or a list item shows as
 * its picture, read for the message with the ID `id`, the ID of its item in
 * the transcript. `live` marks an answer that the agent still writes, whose
 * open marks close at the end of its text.
 *
 * Each update of a live answer reads the whole text again, and draws again
 * only the blocks whose data changed. An answer whose ID, text, and `live`
 * stay the same draws nothing again.
 */
export const AgentText = memo(function AgentText(props: {
  id: string
  text: string
  live?: boolean
}) {
  const { id, text } = props
  const live = props.live === true
  const blocks = useMemo(() => agentBlocks(text, live), [text, live])
  const drawing = useMemo(() => answerDrawing(id), [id])
  return (
    <div
      className={classes(itemStyles.agent, headingStyles.headings, prose.prose)}
    >
      <AgentBlocks blocks={blocks} drawing={drawing} />
    </div>
  )
})
