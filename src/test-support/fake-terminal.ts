import type { TerminalEnd, TerminalTransport } from '../shared/terminal'
import { fakeTerminalOutput } from './fixtures/tools'

/** Xterm tests use decoded output. The backend tests ttyd framing separately. */
export class FakeTerminal implements TerminalTransport {
  readonly inputs: string[] = []
  readonly sizes: { columns: number; rows: number }[] = []
  private readonly dataListeners = new Set<(output: string) => void>()
  private readonly closeListeners = new Set<(end: TerminalEnd) => void>()

  write(input: string): void {
    this.inputs.push(input)
  }

  resize(columns: number, rows: number): void {
    this.sizes.push({ columns, rows })
  }

  onData(listener: (output: string) => void): () => void {
    this.dataListeners.add(listener)
    listener(fakeTerminalOutput)
    return () => this.dataListeners.delete(listener)
  }

  onClose(listener: (end: TerminalEnd) => void): () => void {
    this.closeListeners.add(listener)
    return () => this.closeListeners.delete(listener)
  }

  emit(output: string): void {
    for (const listener of this.dataListeners) listener(output)
  }

  /** Ends the connection, by default as the end of the shell. */
  close(end: TerminalEnd = 'closed'): void {
    for (const listener of this.closeListeners) listener(end)
    this.dataListeners.clear()
    this.closeListeners.clear()
  }
}
