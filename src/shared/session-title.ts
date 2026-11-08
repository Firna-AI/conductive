/**
 * The title that a message gives a later session of a workspace, or null
 * when the message has no text. It takes the first line with text, makes
 * each run of spaces one space, and removes one final full stop, but keeps
 * an ellipsis. It cuts a line over 60 Unicode code points at its last
 * space within the limit, or at the limit when the first word is longer.
 * The Worker, the development page, and the mockups share this rule, as
 * "Sessions" in `docs/protocol/chat-and-events.md` says.
 */
export function sessionTitleFrom(text: string): string | null {
  const line = text.trim().split('\n')[0].replace(/\s+/g, ' ').trim()
  const title = /[^.]\.$/.test(line) ? line.slice(0, -1) : line
  if (title === '') return null
  const points = Array.from(title)
  const limit = 60
  if (points.length <= limit) return title
  const boundary = points.lastIndexOf(' ', limit)
  return points.slice(0, boundary > 0 ? boundary : limit).join('')
}
