import { describe, expect, it } from 'vitest'
import { codeKeyEdit, type CodeKey } from './code-keys'

/**
 * The text and the selection after a key press. `[` and `]` mark the
 * selection in `marked`, and `|` marks a caret.
 */
function press(key: CodeKey, marked: string): string | null {
  const caret = marked.indexOf('|')
  const start = caret >= 0 ? caret : marked.indexOf('[')
  const end = caret >= 0 ? caret : marked.indexOf(']') - 1
  const value = marked.replace(/[|[\]]/g, '')
  const edit = codeKeyEdit(key, value, start, end)
  if (!edit) return null
  const text = value.slice(0, edit.from) + edit.text + value.slice(edit.to)
  const [from, to] = edit.selection
  if (from === to) return `${text.slice(0, from)}|${text.slice(from)}`
  return `${text.slice(0, from)}[${text.slice(from, to)}]${text.slice(to)}`
}

describe('the keys of a code field', () => {
  it('starts a new line with the indent of the line of the caret', () => {
    expect(press('newline', 'if x; then\n  run|')).toBe(
      'if x; then\n  run\n  |',
    )
    expect(press('newline', '  a[b]c')).toBe('  a\n  |c')
  })

  it('inserts an indent step at the caret, and indents each line of a selection', () => {
    expect(press('indent', 'a|b')).toBe('a  |b')
    expect(press('indent', 'x\n[echo hi]')).toBe('x\n[  echo hi]')
    expect(press('indent', 'x\n[a\n\nb]\ny')).toBe('x\n[  a\n\n  b]\ny')
    expect(press('indent', '[a\n]b')).toBe('[  a]\nb')
  })

  it('outdents the line of the caret, or each line of a selection, by one step', () => {
    expect(press('outdent', '    ru|n')).toBe('  ru|n')
    expect(press('outdent', ' |run')).toBe('|run')
    expect(press('outdent', '|\n  run')).toBeNull()
    expect(press('outdent', '[  a\n\tb\n c]')).toBe('[a\nb\nc]')
    expect(press('outdent', 'run|')).toBeNull()
  })
})
