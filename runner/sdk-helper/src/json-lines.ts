import { TextLines } from './text-lines'

/** Frames UTF-8 input without treating a partial line as a message. */
export class JsonLines<T> {
  private readonly lines = new TextLines()

  private readonly read: (value: unknown) => T
  private readonly accept: (message: T) => void

  constructor(read: (value: unknown) => T, accept: (message: T) => void) {
    this.read = read
    this.accept = accept
  }

  push(chunk: Buffer): void {
    this.lines.push(chunk, (line) => {
      const value: unknown = JSON.parse(line)
      this.accept(this.read(value))
    })
  }

  end(): void {
    if (this.lines.end().length)
      throw new Error('The helper JSON line is incomplete.')
  }
}
