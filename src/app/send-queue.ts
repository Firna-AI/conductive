/** Sends one request at a time, in call order, for one store. */
export class SendQueue {
  /** The last send in the queue. It never fails, so the next can go. */
  private sending: Promise<unknown> = Promise.resolve()

  /** Runs `send` after the send before it, also a failed one. */
  run<A>(send: () => Promise<A>): Promise<A> {
    const run = this.sending.then(send)
    this.sending = run.catch(() => undefined)
    return run
  }
}
