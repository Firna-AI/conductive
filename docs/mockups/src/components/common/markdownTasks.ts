/**
 * The task box of a list item, such as `- [ ]` and `- [x]` in Markdown.
 * The chat and the file preview read it in the same way, from item 14 B of
 * the Markdown plan.
 */

/**
 * A task box as typed at the start of the text of an item: `[ ]`, `[x]`, or
 * `[X]`, then a space or a tab, or the end of the text.
 */
const taskBox = /^\[([ xX])\](?:[ \t]+|$)/u

/** The text of a list item, and whether its task is done, or null. */
export type TaskText = { text: string; checked: boolean | null }

/**
 * The text of a list item without its task box, and the state of the box:
 * done for `[x]` and `[X]`, not done for `[ ]`, and null for an item with
 * no task box. The box counts only at the start of the item, as on GitHub.
 */
export function taskText(text: string): TaskText {
  const box = taskBox.exec(text)
  if (box === null) return { text, checked: null }
  return { text: text.slice(box[0].length), checked: box[1] !== ' ' }
}
