/** The fences of the code blocks of the file preview. */

/** The opening fence of a code block, such as ```` ```ts ```` or `~~~`. */
export function openingFence(
  line: string,
): { marker: string; indent: number } | null {
  const match = /^( {0,3})(`{3,}|~{3,})(.*)$/.exec(line)
  if (!match) return null
  const [, pad, marker, info] = match
  if (marker[0] === '`' && info.includes('`')) return null
  return { marker, indent: pad.length }
}

export function closesFence(line: string, marker: string): boolean {
  const match = /^ {0,3}(`{3,}|~{3,})[ ]*$/.exec(line)
  return (
    match !== null &&
    match[1][0] === marker[0] &&
    match[1].length >= marker.length
  )
}
