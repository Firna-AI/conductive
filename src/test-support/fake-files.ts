import type { FetchLike, FileTransport } from '../app/api/client'

/**
 * A file transport over a fetch, for tests and the dev fakes, where no
 * `XMLHttpRequest` runs. It sends the raw file as the browser does, with
 * only the content type of a file, so the fake records, holds, or answers
 * it as any request. A fetch measures no sent bytes, so it reports no
 * progress, and the composer shows its spinner until the answer.
 */
export function fetchFiles(fetch: FetchLike): FileTransport {
  return async ({ path, file, signal }) => {
    const response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: file,
      signal,
    })
    let body: unknown
    try {
      body = await response.json()
    } catch {
      body = null
    }
    return { status: response.status, body }
  }
}

/**
 * The raw files that a fake got, in their order: the path of each, the
 * query that names it, and its bytes as text.
 */
export function sentFiles(requests: readonly Request[]) {
  return Promise.all(
    requests
      .filter(
        (request) =>
          request.headers.get('Content-Type') === 'application/octet-stream',
      )
      .map(async (request) => {
        const url = new URL(request.url)
        return {
          path: url.pathname,
          query: Object.fromEntries(url.searchParams),
          text: await request.clone().text(),
        }
      }),
  )
}
