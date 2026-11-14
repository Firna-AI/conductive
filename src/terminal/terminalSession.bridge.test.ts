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
  const { screen, transport, events } = bridged()
  expect([screen.cols, screen.rows]).toEqual([100, 30])
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

it('gives the screen each shared size where the message comes, before the panel hears of it', () => {
  const { screen, events } = bridged()
  events.onSharedSize.mockImplementation(() =>
    expect([screen.cols, screen.rows]).toEqual([40, 10]),
  )
  screen.bridge({ kind: 'size', size: { columns: 40, rows: 10 } })
  expect(events.onSharedSize).toHaveBeenLastCalledWith({
    columns: 40,
    rows: 10,
  })
})

it('sends the colours again after a change of the scheme, only with a bridge', () => {
  const { screen, transport, session } = bridged()
  screen.theme = { foreground: '#111111', background: '#fafafa' }
  session.coloursChanged()
  expect(transport.inputs.at(-1)).toBe(
    bridgeInputMessage(nonce, {
      kind: 'hello',
      foreground: '#111111',
      background: '#fafafa',
    }),
  )
  const plain = new FakeTerminal()
  const alone = new TerminalSession(new FakeScreen(), plain, {
    onClosed: vi.fn(),
    onControlChange: vi.fn(),
  })
  alone.start()
  alone.coloursChanged()
  expect(plain.inputs).toEqual([])
})

it('sends each mouse report as a message with a bridge, and keeps the old paths without one', () => {
  const { screen, transport, events } = bridged()
  screen.sendMouse('\x1b[M #!', true)
  screen.sendMouse('\x1b[<0;5;5M', false)
  expect(transport.inputs.slice(-2)).toEqual([
    bridgeInputMessage(nonce, { kind: 'mouse', base64: btoa('\x1b[M #!') }),
    bridgeInputMessage(nonce, { kind: 'mouse', base64: btoa('\x1b[<0;5;5M') }),
  ])
  expect(events.onInput).toHaveBeenCalledTimes(2)
  const plainScreen = new FakeScreen()
  const plain = new FakeTerminal()
  new TerminalSession(plainScreen, plain, {
    onClosed: vi.fn(),
    onControlChange: vi.fn(),
  }).start()
  plainScreen.sendMouse('\x1b[M #!', true)
  plainScreen.sendMouse('\x1b[<0;5;5M', false)
  expect(plain.inputs).toEqual(['\x1b[<0;5;5M'])
})
