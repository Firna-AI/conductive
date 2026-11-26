/**
 * The front matter at the start of a `SKILL.md`: a line of `---`, the
 * fields, and the next line of `---`, as the runner reads it for the
 * skills list.
 */
const FRONT_MATTER = /^---[ \t]*\r?\n(?:[\s\S]*?\r?\n)?---[ \t]*(?:\r?\n|$)/

/** The text of a skill as its views show it: without a byte order mark. */
export function skillViewText(text: string): string {
  return text.startsWith('\uFEFF') ? text.slice(1) : text
}

/**
 * The Markdown body of the view text of a skill, which Preview shows: the
 * text after its front matter, or the whole text when it starts with no
 * front matter. A front matter without its last line of `---` is no front
 * matter, so the whole text shows.
 */
export function skillBody(text: string): string {
  const match = FRONT_MATTER.exec(text)
  return match ? text.slice(match[0].length) : text
}
