/** The answer of one command line: whether it failed, and its blocks. */
export type CommandDone = (
  failed: boolean,
  blocks: readonly (readonly Uint8Array[])[],
) => void

/**
 * Sends command lines to a tmux client in control mode and matches each
 * answer to its line. tmux answers each command of a line with one block, in
 * order. When a command fails, tmux runs no later command of its line, so
 * the line ends at its first failed block.
 */
export class CommandQueue {
  private readonly send: (line: string) => void
  private readonly waiting: {
    count: number
    blocks: (readonly Uint8Array[])[]
    done: CommandDone
  }[] = []

  constructor(send: (line: string) => void) {
    this.send = send
  }

  /** Sends the commands as one line, which tmux runs at once. */
  run(commands: readonly string[], done: CommandDone): void {
    if (commands.length === 0) return
    this.waiting.push({ count: commands.length, blocks: [], done })
    this.send(commands.join(' ; '))
  }

  /** Takes the next block of an answer. */
  block(failed: boolean, lines: readonly Uint8Array[]): void {
    const line = this.waiting[0]
    if (!line) return
    line.blocks.push(lines)
    if (!failed && line.blocks.length < line.count) return
    this.waiting.shift()
    line.done(failed, line.blocks)
  }
}
