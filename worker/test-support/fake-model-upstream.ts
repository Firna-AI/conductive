import type { HttpFetch } from '../env'

export type ModelResponseFactory = (
  request: Request,
) => Response | Promise<Response>

/** Fresh replies let cancellation tests observe the original upstream stream. */
export class FakeModelUpstream {
  readonly requests: Request[] = []
  readonly bodies: string[] = []
  readonly responseFactories: ModelResponseFactory[] = []
  response: () => Response
  private readonly origin: string
  private readonly paths: readonly string[]
  private readonly method: 'GET' | 'POST'

  constructor(
    origin: string,
    paths: readonly string[],
    response: () => Response,
    method: 'GET' | 'POST' = 'POST',
  ) {
    this.origin = origin
    this.paths = paths
    this.response = response
    this.method = method
  }

  fetch: HttpFetch = async (request) => {
    const url = new URL(request.url)
    if (
      url.origin !== this.origin ||
      request.method !== this.method ||
      !this.paths.includes(url.pathname)
    )
      throw new Error('Unexpected model upstream request')
    this.requests.push(request)
    const factory = this.responseFactories.shift()
    if (factory) return factory(request)
    this.bodies.push(await request.text())
    return this.response()
  }
}
