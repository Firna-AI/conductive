function signal() {
  let resolve: () => void = () => undefined
  const promise = new Promise<void>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

/** Capture the committed initial stage before its synchronous peer closure. */
export class BrowserSuspensionProbe {
  private readonly storage: DurableObjectStorage
  private readonly entered = signal()
  private snapshot: Promise<Record<string, unknown>> = Promise.resolve({})

  constructor(storage: DurableObjectStorage) {
    this.storage = storage
  }

  close(work: () => void): void {
    const state = {
      fence: this.storage.kv.get('members:lifecycle-fence'),
      browserAt: this.storage.kv.get('alarm:browser'),
      regular: ['lifecycle', 'github', 'previews'].map(
        (source) => this.storage.kv.get(`alarm:${source}`) ?? null,
      ),
      pending: this.storage.kv.get('security:regular-alarms-pending'),
      deferred: this.storage.kv.get('security:regular-alarms-deferred-until'),
    }
    const alarm = this.storage.getAlarm()
    work()
    this.snapshot = alarm.then((value) => ({ ...state, alarm: value }))
    this.entered.resolve()
  }

  async wait(): Promise<Record<string, unknown>> {
    await this.entered.promise
    return this.snapshot
  }
}
