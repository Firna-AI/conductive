import prose from './MarkdownProse.module.css'

/**
 * The fixed check box of a task item, in a reply of the chat, in a message
 * line, and in the file preview, from items 14 B and 82 B of the Markdown
 * plan. It is a disabled check box, so a press changes nothing, and a
 * screen reader reads whether the task is done. The `taskBox` class of
 * MarkdownProse.module.css gives it the look of the design in each view.
 * The class of the item places it, as MarkdownProse.module.css and
 * MessageLine.module.css say. `label` names the state of the box where a
 * screen reader reads no check box, as in a message line, which it reads
 * as one button.
 */
export function TaskBox(props: { checked: boolean; label?: string }) {
  return (
    <input
      aria-label={props.label}
      checked={props.checked}
      className={prose.taskBox}
      disabled
      type="checkbox"
    />
  )
}
