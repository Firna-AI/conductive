export type FakeMethod = 'GET' | 'HEAD' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface FakeRouteWriter {
  json(method: FakeMethod, path: string, body: unknown, status?: number): void
  empty(method: FakeMethod, path: string): void
  response(method: FakeMethod, path: string, response: Response): void
  handle(
    method: FakeMethod,
    path: string,
    handler: (request: Request) => Promise<Response>,
  ): void
}
