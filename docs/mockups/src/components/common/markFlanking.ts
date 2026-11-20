/**
 * The flanking rules of CommonMark, which decide whether a run of marks,
 * such as `**`, can open or close bold text, emphasis, or strikethrough.
 */

const whitespace = /\s/u
const punctuation = /[\p{P}\p{S}]/u

/**
 * Whether a run of `char` between `before` and `after` can open and close.
 * The start and the end of the text count as spaces. `_` cannot open or
 * close inside a word.
 */
export function flanking(char: string, before: string, after: string) {
  const spaceBefore = before === '' || whitespace.test(before)
  const spaceAfter = after === '' || whitespace.test(after)
  const markBefore = punctuation.test(before)
  const markAfter = punctuation.test(after)
  const left = !spaceAfter && (!markAfter || spaceBefore || markBefore)
  const right = !spaceBefore && (!markBefore || spaceAfter || markAfter)
  if (char !== '_') return { open: left, close: right }
  return {
    open: left && (!right || markBefore),
    close: right && (!left || markAfter),
  }
}
