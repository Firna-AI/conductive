/** A fence longer than every run of backticks in its content. */
function fence(text: string, minimum: number): string {
  const longest = (text.match(/`+/g) ?? []).reduce(
    (length, run) => Math.max(length, run.length),
    0,
  )
  return '`'.repeat(Math.max(minimum, longest + 1))
}

export function inlineCode(text: string): string {
  const ticks = fence(text, 1)
  const padding =
    /^`|`$/.test(text) || (/^ .* $/s.test(text) && /\S/.test(text))
  return `${ticks}${padding ? ' ' : ''}${text}${padding ? ' ' : ''}${ticks}`
}

export function codeBlock(text: string, language = ''): string {
  const ticks = fence(text, 3)
  return `${ticks}${language}\n${text}${text.endsWith('\n') ? '' : '\n'}${ticks}`
}

/** Metadata is plain text even when it contains Markdown punctuation. */
export function plainText(text: string): string {
  return text.replace(/[\r\n]+/g, ' ').replace(/[\\`*_{}[\]<>#]/g, '\\$&')
}
