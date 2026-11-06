import type { ChatScheduler } from './types'

export class ManualChatClock {
  private time: number
  private sequence = 0
  private readonly tasks = new Map<
    number,
    { at: number; work: () => Promise<void> }
  >()

  constructor(time: number) {
    this.time = time
  }

  now = () => this.time

  schedule: ChatScheduler = (work, delayMs) => {
    const id = ++this.sequence
    this.tasks.set(id, { at: this.time + delayMs, work })
    return () => this.tasks.delete(id)
  }

  get scheduledCount() {
    return this.tasks.size
  }

  async advance(milliseconds: number): Promise<void> {
    const target = this.time + milliseconds
    let next = this.next(target)
    while (next) {
      const [id, task] = next
      this.tasks.delete(id)
      this.time = task.at
      await task.work()
      next = this.next(target)
    }
    this.time = Math.max(this.time, target)
  }

  private next(target: number) {
    return [...this.tasks.entries()]
      .filter(([, task]) => task.at <= target)
      .sort(([, left], [, right]) => left.at - right.at)[0]
  }
}
