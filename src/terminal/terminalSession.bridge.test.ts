import { expect, it, vi } from 'vitest'

import { bridgeInputMessage } from '../shared/terminal-bridge'
import { FakeTerminal } from '../test-support/fake-terminal'
import { FakeScreen } from './fakeScreen.test-support'
import { TerminalSession } from './terminalSession'

const nonce = '0123456789abcdef0123456789abcdef'

function bridged() {
  const screen = new FakeScreen()
  const transport = new FakeTerminal()
  const events = {
    onClosed: vi.fn(),
    onControlChange: vi.fn(),
    onInput: vi.fn(),
    onSharedSize: vi.fn(),
  }
  const session = new TerminalSession(screen, transport, events)
  session.start()
  screen.bridge({ kind: 'hello', nonce, size: { columns: 100, rows: 30 } })
  return { screen, transport, events, session }
}

it('answers the hello of the bridge with the colours of the screen, and takes its size', () => {
  const { transport, events } = bridged()
  expect(transport.inputs).toEqual([
    bridgeInputMessage(nonce, {
      kind: 'hello',
      foreground: '#eeeeee',
      background: '#111111',
    }),
  ])
  expect(events.onSharedSize).toHaveBeenCalledWith({ columns: 100, rows: 30 })
})

it('drops the replies of the screen after the hello, and acknowledges each mark', () => {
  const { screen, transport } = bridged()
  screen.reply('\x1b[1;1R')
  screen.bridge({ kind: 'mark', mark: 4 })
  expect(transport.inputs.slice(1)).toEqual([
    bridgeInputMessage(nonce, { kind: 'ack', mark: 4 }),
  ])
})

it('sends focus reports and pastes as messages, and a paste counts as input', () => {
  const { screen, transport, events } = bridged()
  screen.reportFocus('\x1b[O')
  expect(screen.pasteHandler?.('one\r\ntwo')).toBe(true)
  expect(transport.inputs.slice(1)).toEqual([
    bridgeInputMessage(nonce, { kind: 'focus', focused: false }),
    bridgeInputMessage(nonce, { kind: 'paste', base64: btoa('one\ntwo') }),
  ])
  expect(events.onInput).toHaveBeenCalledTimes(1)
})

it('sends the size of the panel, not the shared size of the screen', () => {
  const { screen, transport, session } = bridged()
  const before = transport.sizes.length
  screen.resizeTo(100, 30)
  session.resizePanel(60, 20)
  session.resizePanel(60, 20)
  expect(transport.sizes.slice(before)).toEqual([{ columns: 60, rows: 20 }])
})

it('keeps replies, focus reports, and pastes as they were without a bridge', () => {
  const screen = new FakeScreen()
  const transport = new FakeTerminal()
  new TerminalSession(screen, transport, {
    onClosed: vi.fn(),
    onControlChange: vi.fn(),
  }).start()
  screen.reply('\x1b[1;1R')
  screen.reportFocus('\x1b[I')
  expect(transport.inputs).toEqual(['\x1b[1;1R', '\x1b[I'])
  expect(screen.pasteHandler).toBeNull()
})
