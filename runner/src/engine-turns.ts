import type { RunnerCommand } from '../../src/shared/runner'
import type { EngineOptions } from './engine-session'
import { turnKey, type SavedTurn } from './state-turns'

/** Loaded turns belong to the prior process. Live duplicates never end work. */
export class EngineTurns {
  private readonly options: EngineOptions
  private readonly loaded = new Map<string, SavedTurn>()
  private readonly live = new Set<string>()
  private readonly recoveries = new Map<string, Promise<void>>()

  constructor(options: EngineOptions) {
    this.options = options
    for (const turn of options.store.snapshot.turns) {
      const key = turnKey(turn)
      this.loaded.set(key, turn)
      if (turn.endEventNumber === null)
        this.recoveries.set(
          key,
          Promise.resolve().then(() =>
            options.emit({
              type: 'turn.completed',
              sessionId: turn.sessionId,
              turnId: turn.turnId,
              state: 'stopped',
              durationMs: Math.max(0, options.now() - turn.startedAt),
              files: [],
              omittedFileCount: 0,
              userMessageIds: turn.messageIds,
            }),
          ),
        )
    }
  }

  command(command: RunnerCommand): Promise<void> | null {
    if (command.type !== 'turn' && command.type !== 'interrupt') return null
    const key = turnKey(command)
    const saved =
      this.loaded.get(key) ??
      this.options.store.snapshot.turns.find((turn) => turnKey(turn) === key)
    if (command.type === 'turn') {
      if (saved || this.live.has(key))
        return this.recoveries.get(key) ?? Promise.resolve()
      this.live.add(key)
    } else if (
      this.loaded.has(key) ||
      (saved !== undefined && saved.endEventNumber !== null)
    )
      return this.recoveries.get(key) ?? Promise.resolve()
    return null
  }

  async idle(): Promise<void> {
    await Promise.all(this.recoveries.values())
  }
}
