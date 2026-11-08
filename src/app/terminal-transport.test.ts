import { expect, it, vi } from 'vitest'

import { terminalPaths } from '../shared/terminal'
import type { ReadyTerminal } from '../terminal/terminalApi'
import {
  createTerminalConnector,
  type OpenTerminalSocket,
  type TerminalSocket,
} from './terminal-transport'

class FakeSocket extends EventTarget implements TerminalSocket {
  binaryType: BinaryType = 'blob'
  readyState = 0
  readonly sent: string[] = []
  closes = 0
  private readonly listeners = new Map<
    string,
    Set<EventListenerOrEventListenerObject>
  >()

  override addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions,
  ): void {
    super.addEventListener(type, listener, options)
    if (!listener) return
    const listeners = this.listeners.get(type) ?? new Set()
    listeners.add(listener)
    this.listeners.set(type, listeners)
  }

  override removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | EventListenerOptions,
  ): void {
    super.removeEventListener(type, listener, options)
    if (listener) this.listeners.get(type)?.delete(listener)
  }

  get listenerCount(): number {
    return [...this.listeners.values()].reduce(
      (total, listeners) => total + listeners.size,
      0,
    )
  }

  send(data: string): void {
    this.sent.push(data)
  }
  close(): void {
    this.closes++
    this.end()
  }
  open(): void {
    this.readyState = 1
    this.dispatchEvent(new Event('open'))
  }
  message(data: string | ArrayBuffer): void {
    this.dispatchEvent(new MessageEvent('message', { data }))
  }
  end(): void {
    this.readyState = 3
    this.dispatchEvent(new Event('close'))
  }
  fail(): void {
    this.dispatchEvent(new Event('error'))
  }
}

function fixture(state = 0) {
  const socket = new FakeSocket()
  socket.readyState = state
  const open = vi.fn<OpenTerminalSocket>(() => socket)
  const terminal: ReadyTerminal = {
    state: 'ready',
    socketPath: terminalPaths.socket('org', 'workspace'),
    protocol: 'tty',
  }
  const transport = createTerminalConnector(open)(terminal)
  return { socket, open, terminal, transport }
}

it('initializes once with the latest early size and preserves ordered input and resize frames', () => {
  const { socket, open, terminal, transport } = fixture()
  expect(open.mock.calls).toEqual([[terminal.socketPath, 'tty']])
  expect(socket.binaryType).toBe('arraybuffer')
  transport.resize(80, 24)
  transport.write('ls\r')
  transport.resize(100, 30)
  transport.write('\x1b[0n')
  expect(socket.sent).toEqual([])
  socket.open()
  socket.open()
  transport.write('π')
  transport.resize(120, 40)
  expect(socket.sent).toEqual([
    '{"columns":100,"rows":30}',
    '0ls\r',
    '0\x1b[0n',
    '0π',
    '1{"columns":120,"rows":40}',
  ])
  transport.close()
})

it('waits for the first measured size when its socket is already open', () => {
  const { socket, transport } = fixture(1)
  transport.write('pwd\r')
  expect(socket.sent).toEqual([])
  transport.resize(90, 25)
  expect(socket.sent).toEqual(['{"columns":90,"rows":25}', '0pwd\r'])
  transport.close()
})

it('decodes split UTF-8 output while title and preference frames stay out of terminal text', () => {
  const { socket, transport } = fixture()
  const output: string[] = []
  const stop = transport.onData((text) => output.push(text))
  socket.message(Uint8Array.of(48, 65, 0xe2).buffer)
  socket.message('1Private terminal title')
  socket.message(new TextEncoder().encode('2{"fontSize":14}').buffer)
  socket.message(Uint8Array.of(48, 0x82).buffer)
  socket.message(Uint8Array.of(48, 0xac, 66).buffer)
  socket.message('0\x1b[31mred')
  expect(output).toEqual(['A', '€B', '\x1b[31mred'])
  stop()
  socket.message('0unsubscribed output')
  expect(output).toEqual(['A', '€B', '\x1b[31mred'])
  transport.close()
})

it('ends once on an error before open and discards pending and later input', () => {
  const { socket, transport } = fixture()
  const closed = vi.fn()
  const output = vi.fn()
  transport.onClose(closed)
  transport.onData(output)
  transport.write('queued input')
  transport.resize(80, 24)
  socket.fail()
  socket.end()
  socket.open()
  socket.message('0late output')
  transport.write('late input')
  transport.resize(100, 30)
  transport.close()
  expect(closed).toHaveBeenCalledTimes(1)
  expect(output).not.toHaveBeenCalled()
  expect(socket.sent).toEqual([])
  expect(socket.closes).toBe(1)
  expect(socket.listenerCount).toBe(0)
})

it('flushes final decoder text before one peer-close notification and releases its socket listeners', () => {
  const { socket, transport } = fixture(1)
  const events: string[] = []
  transport.onData((text) => events.push(text))
  transport.onClose(() => events.push('closed'))
  transport.resize(80, 24)
  socket.message(Uint8Array.of(48, 65, 0xe2).buffer)
  socket.end()
  socket.fail()
  socket.end()
  transport.write('late input')
  transport.resize(100, 30)
  transport.close()
  expect(events).toEqual(['A', '�', 'closed'])
  expect(socket.sent).toEqual(['{"columns":80,"rows":24}'])
  expect(socket.closes).toBe(0)
  expect(socket.listenerCount).toBe(0)
})

it('closes a pending socket locally and reports its ended state to later subscribers', () => {
  const { socket, transport } = fixture()
  const removed = vi.fn()
  const stop = transport.onClose(removed)
  stop()
  transport.write('pending input')
  transport.resize(80, 24)
  transport.close()
  transport.close()
  socket.open()
  const late = vi.fn()
  transport.onClose(late)()
  transport.write('late input')
  expect(removed).not.toHaveBeenCalled()
  expect(late).toHaveBeenCalledTimes(1)
  expect(socket.sent).toEqual([])
  expect(socket.closes).toBe(1)
  expect(socket.listenerCount).toBe(0)
})

it('reports send failure through close and releases the failed connection', () => {
  const { socket, transport } = fixture(1)
  const closed = vi.fn()
  transport.onClose(closed)
  vi.spyOn(socket, 'send').mockImplementation(() => {
    throw new Error('Socket send failed')
  })
  expect(() => transport.resize(80, 24)).not.toThrow()
  transport.write('late input')
  expect(closed).toHaveBeenCalledTimes(1)
  expect(socket.closes).toBe(1)
  expect(socket.listenerCount).toBe(0)
})
