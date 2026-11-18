import { StringDecoder } from 'node:string_decoder'

/**
 * Frames UTF-8 input into lines that end only at LF. A JSON string can hold
 * U+2028 and U+2029 raw, and `node:readline` also ends a line at them.
 */
export class TextLines {
  private readonly decoder = new StringDecoder('utf8')
  private pending = ''

  /** Gives each complete line to `accept` in order, without its LF. */
  push(chunk: Buffer, accept: (line: string) => void): void {
    const text = this.decoder.write(chunk)
    this.pending += text
    // Only a new LF can end a line, so a long line is searched once.
    if (!text.includes('\n')) return
    for (
      let end = this.pending.indexOf('\n');
      end >= 0;
      end = this.pending.indexOf('\n')
    ) {
      const line = this.pending.slice(0, end)
      this.pending = this.pending.slice(end + 1)
      accept(line)
    }
  }

  /** Returns the text after the last LF, and clears it. */
  end(): string {
    const rest = this.pending + this.decoder.end()
    this.pending = ''
    return rest
  }
}
