interface NativeRequestInput {
  url: string
  method?: string
  headers?: Record<string, string>
  body?: unknown
  onJson?(): Promise<void>
}

interface NativeResponseValue {
  status: number
  headers: [string, string][]
  body: Uint8Array
}

export interface NativeRequests {
  prepare(id: string, input: NativeRequestInput): Promise<void>
  dispatch(id: string): Promise<NativeResponseValue>
  bodyUsed(id: string): Promise<boolean>
}

class NativeBodyRequest extends Request {
  private readonly onJson: NativeRequestInput['onJson']

  constructor(input: NativeRequestInput) {
    super(input.url, {
      method: input.method ?? (input.body === undefined ? 'GET' : 'POST'),
      headers: input.headers,
      body: input.body === undefined ? undefined : JSON.stringify(input.body),
    })
    this.onJson = input.onJson
  }

  override async json<T = unknown>(): Promise<T> {
    await this.onJson?.()
    return super.json<T>()
  }
}

export function nativeRequests(
  fetch: (request: Request) => Promise<Response>,
): NativeRequests {
  const requests = new Map<string, Request>()
  const find = (id: string) => {
    const request = requests.get(id)
    if (!request) throw new Error(`Unknown native request: ${id}`)
    return request
  }
  return {
    prepare: async (id, input) => {
      requests.set(id, new NativeBodyRequest(input))
    },
    dispatch: async (id) => {
      const response = await fetch(find(id))
      return {
        status: response.status,
        headers: [...response.headers],
        body: new Uint8Array(await response.arrayBuffer()),
      }
    },
    bodyUsed: async (id) => find(id).bodyUsed,
  }
}
