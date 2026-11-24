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

/** The line that starts each section of a patch, one for each file. */
const fileHeader = 'diff --git '

/**
 * The lines of a patch. Git ends each line with LF, so only LF parts them:
 * a carriage return, a line or paragraph separator, or an invalid byte of
 * a file that the runner replaced stays inside its line.
 */
function patchLines(patch: string): string[] {
  const lines = patch.split('\n')
  if (lines[lines.length - 1] === '') lines.pop()
  return lines
}

/**
 * Whether a patch deletes its file: Git writes a `deleted file mode` line
 * in the header of a deleted file. A type change, such as a file that
 * becomes a link, deletes the old entry and adds a new one at the same
 * path, so its second section also holds a `new file mode` line, and the
 * path still holds a file. Only a whole line of a section's header counts,
 * before the first hunk of that section. Each line of a hunk starts with
 * its sign, so no text of a file can read as such a line.
 */
export function deletesFile(patch: string): boolean {
  let deleted = false
  let created = false
  let inHunk = false
  for (const line of patchLines(patch)) {
    if (line.startsWith(fileHeader)) inHunk = false
    else if (line.startsWith('@@')) inHunk = true
    else if (inHunk) continue
    else if (line.startsWith('deleted file mode ')) deleted = true
    else if (line.startsWith('new file mode ')) created = true
  }
  return deleted && !created
}

/** The lines that the rows of a text diff add and remove. */
export function changedLines(rows: readonly DiffRow[]): {
  added: number
  removed: number
} {
  let added = 0
  let removed = 0
  for (const row of rows) {
    if (row.kind === 'added') added += 1
    else if (row.kind === 'removed') removed += 1
  }
  return { added, removed }
}

/**
 * Reads the hunks of a unified diff. The header of each file section, such
 * as `diff --git` and `+++`, does not show: a type change has two sections,
 * and the second header is no row of the first section.
 */
export function parsePatch(patch: string): DiffRow[] {
  const rows: DiffRow[] = []
  let oldLine: number | null = null
  let newLine: number | null = null
  let inHunk = false
  for (const ended of patchLines(patch)) {
    // A file with CRLF ends keeps its CR before each LF.
    const line = ended.endsWith('\r') ? ended.slice(0, -1) : ended
    if (line.startsWith(fileHeader)) {
      inHunk = false
      continue
    }
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
