import { Terminal } from '@xterm/xterm'
import { describe, expect, it } from 'vitest'
import { XtermScreen } from './xtermScreen'

/** Resolves when xterm.js has parsed each chunk that was written before. */
function parsed(xterm: Terminal): Promise<void> {
  return new Promise((resolve) => xterm.write('', resolve))
}

describe('XtermScreen', () => {
  it('sends the replies of xterm.js as replies, and typed keys with the same bytes as user input', async () => {
    const xterm = new Terminal()
    const screen = new XtermScreen(xterm)
    const seen: string[] = []
    screen.onUserInput((data) => seen.push(`user ${JSON.stringify(data)}`))
    screen.onReply((data) => seen.push(`reply ${JSON.stringify(data)}`))

    // A program asks for the cursor position.
    screen.write('abc\x1b[6n')
    await parsed(xterm)
    // Shift+F3 sends the same bytes as a cursor report.
    xterm.input('\x1b[1;2R', true)
    // Focus reports on, a setting request, and a request with no reply.
    screen.write('\x1b[?1004h\x1bP$qm\x1b\\\x1b[18t')
    await parsed(xterm)
    xterm.input('c', true)

    expect(seen).toEqual([
      'reply "\\u001b[1;4R"',
      'user "\\u001b[1;2R"',
      'reply "\\u001b[O"',
      'reply "\\u001bP1$r0m\\u001b\\\\"',
      'user "c"',
    ])
    screen.dispose()
    xterm.dispose()
  })
})
