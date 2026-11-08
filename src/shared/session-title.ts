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
