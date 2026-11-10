/** A pending value that the test resolves or rejects explicitly. */
export function deferred<T>() {
  let resolve: (value: T) => void = () => {}
  let reject: (error: unknown) => void = () => {}
  const promise = new Promise<T>((ok, no) => {
    resolve = ok
    reject = no
  })
  return { promise, resolve, reject }
}

export class TextItem implements ClipboardItem {
  readonly presentationStyle = 'unspecified'
  readonly types = ['text/plain']
  private readonly data: Record<string, Blob | Promise<Blob>>
  constructor(data: Record<string, Blob | Promise<Blob>>) {
    this.data = data
  }
  getType(type: string): Promise<Blob> {
    return Promise.resolve(this.data[type])
  }
}

export class NoPromiseItem extends TextItem {
  constructor(data: Record<string, Blob | Promise<Blob>>) {
    super(data)
    throw new TypeError('Promise data is not supported.')
  }
}
