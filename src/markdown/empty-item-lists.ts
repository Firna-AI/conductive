import type { StateCore, Token } from 'markdown-it'

/** The type of the token that opens a list, for the token that closes it. */
const openTypes: ReadonlyMap<string, string> = new Map([
  ['bullet_list_close', 'bullet_list_open'],
  ['ordered_list_close', 'ordered_list_open'],
])

/** The index of the token that opens the block that closes at `at`. */
function openOf(tokens: readonly Token[], at: number): number {
  let open = 0
  for (let index = at; index >= 0; index -= 1) {
    open += tokens[index].nesting
    if (open === 0) return index
  }
  return 0
}

/** The index of the token that closes the block that opens at `at`. */
function closeOf(tokens: readonly Token[], at: number): number {
  let open = 0
  for (let index = at; index < tokens.length; index += 1) {
    open += tokens[index].nesting
    if (open === 0) return index
  }
  return tokens.length - 1
}

/**
 * Whether the list close at `at` and the token after it split one list of
 * CommonMark: the close of a list right after an empty item, then the open
 * of a list of the same kind and marker at the same level.
 */
function splitAt(tokens: readonly Token[], at: number): boolean {
  const close = tokens[at]
  const next = tokens.at(at + 1)
  return (
    next !== undefined &&
    openTypes.get(close.type) === next.type &&
    close.level === next.level &&
    close.markup === next.markup &&
    tokens.at(at - 1)?.type === 'list_item_close' &&
    tokens.at(at - 2)?.type === 'list_item_open'
  )
}

/**
 * Shows each paragraph of the items of a list, as in a loose list. The
 * parser hides the paragraphs of a tight list, which the HTML of the parser
 * draws without `<p>`.
 */
function loosen(tokens: readonly Token[], from: number, to: number): void {
  const level = tokens[from].level + 2
  for (let index = from; index <= to; index += 1) {
    const token = tokens[index]
    if (token.level === level && token.type.startsWith('paragraph_')) {
      token.hidden = false
    }
  }
}

/**
 * Joins the lists that `markdown-it` 15.0.3 splits after an empty item.
 * That version ends a list at the second blank line after an empty item,
 * such as `-`, two blank lines, and `- b`, and starts a new list at the next
 * item. CommonMark lets any number of blank lines stand between two items
 * of one list, so the next item continues the list. The joined list is
 * loose, because blank lines stand between its items, and its source lines
 * reach the end of the last item. A later list of another marker stays a
 * new list, as in CommonMark.
 */
export function joinEmptyItemLists(state: StateCore): void {
  const { tokens } = state
  // From the end, so a chain of splits joins into one list.
  for (let at = tokens.length - 2; at >= 2; at -= 1) {
    if (!splitAt(tokens, at)) continue
    const first = openOf(tokens, at)
    const next = tokens[at + 1]
    loosen(tokens, first, closeOf(tokens, at + 1))
    const map = tokens[first].map
    if (map && next.map) map[1] = next.map[1]
    tokens.splice(at, 2)
  }
}
