import type { PendingTurn } from './workspace-runtime'

export interface TurnScopeStorage {
  read(): Promise<PendingTurn[]>
  write(turns: PendingTurn[]): Promise<void>
}

/** Only the trusted dispatcher registers identities. Each session has its own turn. */
export class TurnScopes {
  private readonly storage: TurnScopeStorage
  private pending: Promise<unknown> = Promise.resolve()
  constructor(storage: TurnScopeStorage) {
    this.storage = storage
  }

  register(turn: PendingTurn): Promise<void> {
    return this.serial(async () => {
      const turns = await this.storage.read()
      await this.storage.write([
        ...turns.filter(
          (entry) =>
            entry.sessionId !== turn.sessionId && entry.turnId !== turn.turnId,
        ),
        turn,
      ])
    })
  }

  async sender(turnId: string): Promise<string | null> {
    return (await this.find(turnId))?.senderUserId ?? null
  }

  async find(turnId: string): Promise<PendingTurn | undefined> {
    await this.pending
    return (await this.storage.read()).find((turn) => turn.turnId === turnId)
  }

  remove(turnId: string): Promise<PendingTurn | undefined> {
    return this.serial(async () => {
      const turns = await this.storage.read()
      const turn = turns.find((entry) => entry.turnId === turnId)
      await this.storage.write(turns.filter((entry) => entry.turnId !== turnId))
      return turn
    })
  }

  clear(): Promise<void> {
    return this.serial(() => this.storage.write([]))
  }

  private serial<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.pending.then(operation)
    this.pending = next.catch(() => undefined)
    return next
  }
}
