export class SerialQueue {
  private tail: Promise<void> = Promise.resolve()

  run(action: () => Promise<void>): Promise<void> {
    const result = this.tail.then(action)
    this.tail = result.catch(() => {})
    return result
  }
}
