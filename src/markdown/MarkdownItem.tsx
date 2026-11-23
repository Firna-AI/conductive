import type { ReactNode } from 'react'
import prose from '../ui/components/common/MarkdownProse.module.css'
import { TaskBox } from '../ui/components/common/TaskBox'
import type { ListItem } from './task-boxes'

/**
 * A list item of Markdown, as an answer of the chat and the file preview
 * draw it. An item of one paragraph draws its text alone, and another item
 * draws its blocks. A task item draws its fixed check box at the start of
 * its first paragraph, as on GitHub, so a task with sub-tasks keeps its box
 * on the line of its words. The `task` class of `MarkdownProse.module.css`
 * puts the box in the place of the bullet. `text` draws the inline content
 * of a paragraph, and gives null for another block. `blocks` draws blocks.
 */
export function MarkdownItem<Block>(props: {
  item: ListItem<Block>
  text: (block: Block) => ReactNode
  blocks: (blocks: readonly Block[]) => ReactNode
}) {
  const { checked, blocks } = props.item
  const [first, ...rest] = blocks
  const lead = first === undefined ? null : props.text(first)
  const box = checked === null ? null : <TaskBox checked={checked} />
  const task = checked === null ? undefined : prose.task
  if (lead === null) {
    return (
      <li className={task}>
        {box}
        {props.blocks(blocks)}
      </li>
    )
  }
  if (rest.length === 0) {
    return (
      <li className={task}>
        {box}
        {lead}
      </li>
    )
  }
  return (
    <li className={task}>
      <p>
        {box}
        {lead}
      </p>
      {props.blocks(rest)}
    </li>
  )
}
