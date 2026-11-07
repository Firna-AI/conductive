/** Register before reading durable storage so completion cannot lose a waiter. */
export class StartWaiters<T> {
  private readonly listeners = new Set<(result: T) => void>()

  wait(read: () => Promise<T | undefined>): Promise<T> {
    return new Promise((resolve, reject) => {
      const receive = (result: T) => {
        this.listeners.delete(receive)
        resolve(result)
      }
      this.listeners.add(receive)
      void read().then(
        (result) => {
          if (result) receive(result)
        },
        (error: unknown) => {
          this.listeners.delete(receive)
          reject(error)
        },
      )
    })
  }

  publish(result: T): void {
    for (const listener of this.listeners) listener(result)
  }
}
