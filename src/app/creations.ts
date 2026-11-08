/**
 * The life of the creates of one signed-in person in this tab. A sign-out,
 * or a sign-in of another person, ends it. A send that started in it then
 * changes nothing when its answer comes.
 */
export interface Lifetime {
  readonly live: boolean
  /** Runs `callback` when the life ends. The returned function cancels it. */
  onEnd(callback: () => void): () => void
}

class Life implements Lifetime {
  live = true
  private readonly callbacks = new Set<() => void>()

  onEnd(callback: () => void): () => void {
    this.callbacks.add(callback)
    return () => {
      this.callbacks.delete(callback)
    }
  }

  end(): void {
    this.live = false
    for (const callback of [...this.callbacks]) callback()
    this.callbacks.clear()
  }
}

/**
 * The creates of one org in this tab: the create requests that its forms
 * send. Once the server takes a message, the workspace exists, also when
 * its first start fails, so nothing here outlives the request. A sign-out,
 * or a sign-in of another person, ends the life of the creates, with the
 * sends that still run. It keeps nothing in browser storage.
 */
export class Creations {
  private life = new Life()

  /** The life of the creates of the person who is signed in now. */
  get lifetime(): Lifetime {
    return this.life
  }

  /**
   * A sign-out, or another person: each send that still runs ends, so that
   * its answer changes nothing.
   */
  clear(): void {
    this.life.end()
    this.life = new Life()
  }
}
