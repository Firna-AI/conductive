/**
 * The fixed check box of a task item, as the file preview of the app draws
 * it: the check box of the browser, disabled, so a press changes nothing.
 * A reply of the chat draws the same box, from item 14 B of the Markdown
 * plan. The class of the item places it, as MarkdownProse.module.css and
 * MessageLine.module.css say.
 */
export function TaskBox(props: { checked: boolean }) {
  return <input checked={props.checked} disabled type="checkbox" />
}
