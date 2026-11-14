import { describe, expect, it, vi } from 'vitest'
import { FakeTerminal } from '../test-support/fake-terminal'
import { fakeTerminalOutput } from '../test-support/fixtures/tools'
import { FakeScreen } from './fakeScreen.test-support'
import { TerminalSession } from './terminalSession'

function startSession() {
  const screen = new FakeScreen()
  const transport = new FakeTerminal()
  const events = {
    onClosed: vi.fn(),
    onControlChange: vi.fn(),
    onInput: vi.fn(),
  }
  const session = new TerminalSession(screen, transport, events)
  session.start()
  return { screen, transport, events, session }
}

describe('TerminalSession', () => {
  it('shows the output and sends typed input and each screen size', () => {
    const { screen, transport, events } = startSession()

    screen.type('ls\r')
    screen.resizeTo(120, 40)

    expect(screen.output).toEqual([fakeTerminalOutput])
    expect(transport.inputs).toEqual(['ls\r'])
    expect(transport.sizes).toEqual([
      { columns: 80, rows: 24 },
      { columns: 120, rows: 40 },
    ])
    expect(events.onInput).toHaveBeenCalledTimes(1)
  })

  it('turns only the next typed letter into a control byte when Ctrl is held', () => {
    const { screen, transport, events, session } = startSession()

    session.toggleControl()
    screen.type('c')
    screen.type('c')

    expect(transport.inputs).toEqual(['\x03', 'c'])
    expect(events.onControlChange.mock.calls).toEqual([[true], [false]])
    expect(screen.focusCount).toBe(1)
  })

  it('sends replies of the screen without the held Ctrl or an activity report', () => {
    const { screen, transport, events, session } = startSession()

    session.toggleControl()
    screen.reply('\x1b[12;5R')
    screen.reply('\x1b[I')
    screen.type('c')

    expect(transport.inputs).toEqual(['\x1b[12;5R', '\x1b[I', '\x03'])
    expect(events.onControlChange.mock.calls).toEqual([[true], [false]])
    expect(events.onInput).toHaveBeenCalledTimes(1)
  })

  it('sends the keys of the key row in the cursor key mode of the program', () => {
    const { screen, transport, session } = startSession()

    session.pressKey('up')
    screen.modes = { applicationCursorKeysMode: true }
    session.pressKey('down')
    session.toggleControl()
    session.pressKey('up')
    session.pressKey('escape')
    session.pressKey('tab')

    expect(transport.inputs).toEqual([
      '\x1b[A',
      '\x1bOB',
      '\x1b[1;5A',
      '\x1b',
      '\t',
    ])
    expect(screen.focusCount).toBe(6)
  })

  it('reports a close from the transport and sends no later input or size', () => {
    const { screen, transport, events } = startSession()

    transport.close()
    screen.type('ls\r')
    screen.reply('\x1b[0n')
    screen.resizeTo(100, 20)

    expect(events.onClosed).toHaveBeenCalledTimes(1)
    expect(transport.inputs).toEqual([])
    expect(transport.sizes).toEqual([{ columns: 80, rows: 24 }])
  })

  it('releases both sides and closes the transport when disposed', () => {
    const { screen, transport, events, session } = startSession()
    const close = vi.spyOn(transport, 'close')

    session.dispose()
    transport.emit('late output')
    screen.resizeTo(100, 30)

    expect(close).toHaveBeenCalledTimes(1)
    expect(events.onClosed).not.toHaveBeenCalled()
    expect(screen.listenerCount).toBe(0)
    expect(screen.output).toEqual([fakeTerminalOutput])
    expect(transport.sizes).toEqual([{ columns: 80, rows: 24 }])
  })
})
