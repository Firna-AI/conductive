// @vitest-environment happy-dom

import type { Terminal } from '@xterm/xterm'
import { afterEach, expect, it, vi } from 'vitest'
import type { TerminalEnd, TerminalTransport } from '../shared/terminal'
import { connectScreen, openScreen } from './screenConnection'

/** A transport whose output and end the test gives. */
class Controlled implements TerminalTransport {
  private readonly data = new Set<(output: string) => void>()
  private readonly ends = new Set<(end: TerminalEnd) => void>()
  write(): void {}
  resize(): void {}
  onData(listener: (output: string) => void): () => void {
    this.data.add(listener)
    return () => this.data.delete(listener)
  }
  onClose(listener: (end: TerminalEnd) => void): () => void {
    this.ends.add(listener)
    return () => this.ends.delete(listener)
  }
  close(): void {
    this.ends.clear()
  }
  emit(output: string): void {
    for (const listener of [...this.data]) listener(output)
  }
  end(end: TerminalEnd): void {
    for (const listener of [...this.ends]) listener(end)
  }
}

/** Resolves when xterm.js has parsed each chunk that was written before. */
function parsed(xterm: Terminal): Promise<void> {
  return new Promise((resolve) => xterm.write('', resolve))
}

function text(xterm: Terminal): string {
  const buffer = xterm.buffer.active
  const lines: string[] = []
  for (let row = 0; row < buffer.length; row++)
    lines.push(buffer.getLine(row)?.translateToString(true) ?? '')
  return lines.join('\n').trim()
}

afterEach(() => vi.useRealTimers())

it('keeps the output of an ended connection until a new connection shows its own, and reports the time since the first output', async () => {
  vi.useFakeTimers({ now: 0, toFake: ['Date'] })
  const host = document.createElement('div')
  document.body.append(host)
  const parts = openScreen(
    host,
    {},
    { links: () => undefined, hintClass: 'hint' },
  )
  const closed: [TerminalEnd, number][] = []
  const events = {
    onClosed: (end: TerminalEnd, lasted: number) => closed.push([end, lasted]),
    onControlChange: () => undefined,
    onInput: () => undefined,
  }

  const first = new Controlled()
  const firstConnection = connectScreen(parts, host, first, events)
  first.emit('old output')
  vi.setSystemTime(90_000)
  first.end('lost')
  firstConnection.dispose()
  await parsed(parts.xterm)

  // The try ends before its first output, as when the network is down.
  const failed = new Controlled()
  const failedConnection = connectScreen(parts, host, failed, events)
  failed.end('lost')
  failedConnection.dispose()
  await parsed(parts.xterm)
  const afterFailedTry = text(parts.xterm)

  const working = new Controlled()
  connectScreen(parts, host, working, events)
  working.emit('new output')
  await parsed(parts.xterm)

  expect({ afterFailedTry, afterNewOutput: text(parts.xterm), closed }).toEqual(
    {
      afterFailedTry: 'old output',
      afterNewOutput: 'new output',
      closed: [
        ['lost', 90_000],
        ['lost', 0],
      ],
    },
  )
  parts.dispose()
  host.remove()
})
