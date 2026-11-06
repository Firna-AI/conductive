/** One row of a unified diff, with the old and the new line numbers. */
export type DiffRow =
  | { kind: 'hunk'; text: string }
  | {
      kind: 'context' | 'added' | 'removed'
      text: string
      oldLine: number | null
      newLine: number | null
    }
  /** A git note, such as "\ No newline at end of file". */
  | { kind: 'note'; text: string }

const hunkHeader = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/

/**
 * Reads the hunks of a unified diff. The file header before the first
 * hunk, such as `diff --git` and `+++`, does not show.
 */
export function parsePatch(patch: string): DiffRow[] {
  const rows: DiffRow[] = []
  let oldLine: number | null = null
  let newLine: number | null = null
  let inHunk = false
  const lines = patch.split(/\r?\n/)
  if (lines[lines.length - 1] === '') lines.pop()
  for (const line of lines) {
    if (line.startsWith('@@')) {
      const match = hunkHeader.exec(line)
      oldLine = match ? Number(match[1]) : null
      newLine = match ? Number(match[2]) : null
      inHunk = true
      rows.push({ kind: 'hunk', text: line })
      continue
    }
    if (!inHunk) continue
    const sign = line[0] ?? ' '
    const text = line.slice(1)
    if (sign === '\\') {
      rows.push({ kind: 'note', text: line })
    } else if (sign === '+') {
      rows.push({ kind: 'added', text, oldLine: null, newLine })
      if (newLine !== null) newLine += 1
    } else if (sign === '-') {
      rows.push({ kind: 'removed', text, oldLine, newLine: null })
      if (oldLine !== null) oldLine += 1
    } else {
      rows.push({ kind: 'context', text, oldLine, newLine })
      if (oldLine !== null) oldLine += 1
      if (newLine !== null) newLine += 1
    }
  }
  return rows
}
