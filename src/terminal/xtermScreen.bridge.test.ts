import { Terminal } from '@xterm/xterm'
import { expect, it } from 'vitest'

import { bridgeOutputMessage } from '../shared/terminal-bridge'
import type { BridgeEvent } from './bridgeLink'
import { XtermScreen } from './xtermScreen'

const nonce = '0123456789abcdef0123456789abcdef'
const other = 'fedcba9876543210fedcba9876543210'
const size = { columns: 90, rows: 20 }

function parsed(xterm: Terminal): Promise<void> {
  return new Promise((resolve) => xterm.write('', resolve))
}

it('takes the first hello, and later messages only with its nonce, and shows none of them', async () => {
  const xterm = new Terminal({ allowProposedApi: true })
  const screen = new XtermScreen(xterm)
  const events: BridgeEvent[] = []
  screen.onBridge((event) => events.push(event))
  screen.write(bridgeOutputMessage(other, { kind: 'size', size }))
  screen.write(bridgeOutputMessage(nonce, { kind: 'hello', version: 1, size }))
  screen.write(bridgeOutputMessage(other, { kind: 'hello', version: 1, size }))
  screen.write(bridgeOutputMessage(other, { kind: 'mark', mark: 1 }))
  screen.write(bridgeOutputMessage(nonce, { kind: 'mark', mark: 2 }))
  screen.write('ok')
  await parsed(xterm)
  expect(events).toEqual([
    { kind: 'hello', nonce, size },
    { kind: 'mark', mark: 2 },
  ])
  expect(xterm.buffer.active.getLine(0)?.translateToString(true)).toBe('ok')
  screen.dispose()
  xterm.dispose()
})

it('keeps the link of an OSC 8 as plain text', async () => {
  const xterm = new Terminal({ allowProposedApi: true })
  const screen = new XtermScreen(xterm)
  screen.write('\x1b]8;;https://example.com\x07site\x1b]8;;\x07')
  await parsed(xterm)
  const line = xterm.buffer.active.getLine(0)
  expect(line?.translateToString(true)).toBe('site')
  // xterm.js keeps the link of a cell in its private extended attributes.
  const cell = line?.getCell(0) as { extended?: { urlId?: number } } | undefined
  expect(cell?.extended?.urlId ?? 0).toBe(0)
  screen.dispose()
  xterm.dispose()
})
