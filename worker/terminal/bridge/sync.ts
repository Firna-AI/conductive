import { syncCommands } from './commands.ts'
import type { CommandQueue } from './queue.ts'
import { parsePaneState, rebuildPane, type PaneState } from './screen.ts'

const decoder = new TextDecoder()
const maxAttempts = 5

export interface SyncEvents {
  /** The pane and the bytes that rebuild it. Output after this is new. */
  rebuilt(state: PaneState, bytes: Uint8Array): void
  /** The pane could not be read after several attempts. */
  failed(): void
}

/**
 * Reads the pane and rebuilds it. While it runs, the bridge drops the output
 * of the pane, because the captures hold it. It reads the state and every
 * capture in one command line. When the line fails, it reads again, a few
 * times at most.
 */
export class Sync {
  private readonly queue: CommandQueue
  private readonly events: SyncEvents
  private active = false
  private again = false
  private attempts = 0

  constructor(queue: CommandQueue, events: SyncEvents) {
    this.queue = queue
    this.events = events
  }

  /** Whether a rebuild runs. The output of the client is then not valid. */
  get running(): boolean {
    return this.active
  }

  /** Starts a rebuild, or another one after the one that runs. */
  start(): void {
    if (this.active) {
      this.again = true
      return
    }
    this.active = true
    this.attempts = 0
    this.read()
  }

  private read(): void {
    this.attempts += 1
    if (this.attempts > maxAttempts) {
      this.active = false
      this.events.failed()
      return
    }
    this.queue.run(syncCommands, (failed, answers) => {
      const state = failed ? null : parsePaneState(line(answers[0]))
      if (!state) {
        this.read()
        return
      }
      const bytes = rebuildPane(state, {
        whole: answers[1] ?? [],
        history: answers[2] ?? [],
        screen: answers[3] ?? [],
        normal: answers[4] ?? [],
      })
      this.active = false
      this.events.rebuilt(state, bytes)
      if (this.again) {
        this.again = false
        this.start()
      }
    })
  }
}

function line(block: readonly Uint8Array[] | undefined): string {
  const first = block?.[0]
  return first ? decoder.decode(first) : ''
}
