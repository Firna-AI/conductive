import { FakeTerminal } from '../../test-support/fake-terminal'

/**
 * The fake terminal, with typed input echoed back as a shell would. A shell
 * in raw mode echoes no control sequence, such as a reply, so neither does
 * this one. It reports each input, size, and close to the development page.
 */
export class EchoTerminal extends FakeTerminal {
  private readonly report: (entry: string) => void

  constructor(report: (entry: string) => void) {
    super()
    this.report = report
  }

  write(input: string): void {
    super.write(input)
    this.report(`input ${JSON.stringify(input)}`)
    if (input.includes('\x1b')) return
    this.emit(input.replaceAll('\r', '\r\n').replaceAll('\x7f', '\b \b'))
  }

  resize(columns: number, rows: number): void {
    super.resize(columns, rows)
    this.report(`size ${columns} x ${rows}`)
  }

  close(): void {
    super.close()
    this.report('close')
  }
}

/**
 * Holds the terminal reads that start before the sandbox runs, until the page
 * answers them. Each held read then answers with the state that it read, so
 * an old answer can arrive after a newer read.
 */
export class DevHold {
  private armed: boolean
  private readonly waiting: (() => void)[] = []

  constructor(armed: boolean) {
    this.armed = armed
  }

  /** Lets the next reads answer at once. */
  disarm(): void {
    this.armed = false
  }

  /** A promise that `answer` resolves, or null when reads answer at once. */
  wait(): Promise<void> | null {
    if (!this.armed) return null
    return new Promise((resolve) => this.waiting.push(resolve))
  }

  answer(): void {
    for (const resolve of this.waiting.splice(0)) resolve()
  }
}
