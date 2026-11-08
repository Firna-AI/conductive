import type { TerminalTransport } from '../shared/terminal'
import { fakeTerminalOutput } from './fixtures/tools'

/** Xterm tests use decoded output. The backend tests ttyd framing separately. */
export class FakeTerminal implements TerminalTransport {
  readonly inputs: string[] = []
  readonly sizes: { columns: number; rows: number }[] = []
  private readonly dataListeners = new Set<(output: string) => void>()
  private readonly closeListeners = new Set<() => void>()

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

  onClose(listener: () => void): () => void {
    this.closeListeners.add(listener)
    return () => this.closeListeners.delete(listener)
  }

  emit(output: string): void {
    for (const listener of this.dataListeners) listener(output)
  }

  close(): void {
    for (const listener of this.closeListeners) listener()
    this.dataListeners.clear()
    this.closeListeners.clear()
  }
}
