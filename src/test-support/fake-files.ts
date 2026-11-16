import type { FetchLike, FileTransport } from '../app/api/client'

/**
 * A file transport over a fetch, for tests and the dev fakes, where no
 * `XMLHttpRequest` runs. It sends each raw part with `PUT`, as the browser
 * does, with only the content type of a file, so the fake records, holds,
 * or answers it as any request. A fetch measures no sent bytes, so it
 * reports no progress, and the composer shows its spinner until the answer.
 */
export function fetchFiles(fetch: FetchLike): FileTransport {
  return async ({ path, body, signal }) => {
    const response = await fetch(path, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/octet-stream' },
      body,
      signal,
    })
    let reply: unknown
    try {
      reply = await response.json()
    } catch {
      reply = null
    }
    return { status: response.status, body: reply }
  }
}

/**
 * The raw parts that a fake got, in their order: the path of each, which
 * names its upload and its number, and its bytes as text.
 */
export function sentParts(requests: readonly Request[]) {
  return Promise.all(
    requests
      .filter(
        (request) =>
          request.headers.get('Content-Type') === 'application/octet-stream',
      )
      .map(async (request) => ({
        path: new URL(request.url).pathname,
        text: await request.clone().text(),
      })),
  )
}
