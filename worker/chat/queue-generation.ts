import type { QueueTurn } from './queue-turn'

export class QueueGenerations {
  private readonly generations = new WeakMap<QueueTurn, number>()
  private readonly currentTurn: () => QueueTurn | undefined
  private readonly read: () => Promise<number>

  constructor(
    currentTurn: () => QueueTurn | undefined,
    read: () => Promise<number>,
  ) {
    this.currentTurn = currentTurn
    this.read = read
  }

  current = (): number | undefined => {
    const turn = this.currentTurn()
    return turn ? this.forTurn(turn) : undefined
  }

  forTurn = (turn: QueueTurn): number | undefined => this.generations.get(turn)

  withGeneration = async <T>(
    turn: QueueTurn,
    operation: () => Promise<T>,
  ): Promise<T> => {
    const prior = this.generations.get(turn)
    this.generations.set(turn, await this.read())
    try {
      return await operation()
    } finally {
      if (prior === undefined) this.generations.delete(turn)
      else this.generations.set(turn, prior)
    }
  }
}
