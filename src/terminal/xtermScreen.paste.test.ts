// @vitest-environment happy-dom
import { Terminal } from '@xterm/xterm'
import { expect, it, vi } from 'vitest'

import {
  bridgeInputMessage,
  bridgeOutputMessage,
} from '../shared/terminal-bridge'
import { FakeTerminal } from '../test-support/fake-terminal'
import { TerminalSession } from './terminalSession'
import { XtermScreen } from './xtermScreen'

const nonce = '0123456789abcdef0123456789abcdef'

function parsed(xterm: Terminal): Promise<void> {
  return new Promise((resolve) => xterm.write('', resolve))
}

it('sends a paste once, as a bridge message, and xterm.js sends no keys for it', async () => {
  const host = document.createElement('div')
  document.body.append(host)
  const xterm = new Terminal({ allowProposedApi: true })
  xterm.open(host)
  const screen = new XtermScreen(xterm)
  const transport = new FakeTerminal()
  const session = new TerminalSession(screen, transport, {
    onClosed: vi.fn(),
    onControlChange: vi.fn(),
  })
  session.start()
  const keys: string[] = []
  screen.onUserInput((data) => keys.push(data))
  const size = { columns: 80, rows: 24 }
  transport.emit(
    bridgeOutputMessage(nonce, { kind: 'hello', version: 1, size }),
  )
  await parsed(xterm)
  const before = transport.inputs.length

  const clipboardData = new DataTransfer()
  clipboardData.setData('text/plain', 'one\ntwo')
  const textarea = host.querySelector('textarea')
  textarea?.dispatchEvent(
    new ClipboardEvent('paste', {
      clipboardData,
      bubbles: true,
      cancelable: true,
    }),
  )

  expect(transport.inputs.slice(before)).toEqual([
    bridgeInputMessage(nonce, { kind: 'paste', base64: btoa('one\ntwo') }),
  ])
  expect(keys).toEqual([])
  session.dispose()
  screen.dispose()
  xterm.dispose()
  host.remove()
})
