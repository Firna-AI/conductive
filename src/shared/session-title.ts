/**
 * A title for a session or workspace, or null when no text remains.
 * It takes the first line with text and makes each run of spaces one space.
 * It removes one final full stop, but keeps an ellipsis. It cuts a line
 * over 60 Unicode code points at its last space within the limit, or at
 * the limit when the first word is longer.
 * The Worker, runner, development page, and mockups share this rule, as
 * "Sessions" in `docs/protocol/agents-and-sessions.md` says.
 */
export function sessionTitleFrom(text: string): string | null {
  const line = text.trim().split('\n')[0].replace(/\s+/g, ' ').trim()
  const title = withoutFinalFullStop(line)
  if (title === '') return null
  const points = Array.from(title)
  const limit = 60
  if (points.length <= limit) return title
  const boundary = points.lastIndexOf(' ', limit)
  return points.slice(0, boundary > 0 ? boundary : limit).join('')
}

export function withoutFinalFullStop(text: string): string {
  return text.replace(/(?<!\.)\.$/, '').trimEnd()
}
