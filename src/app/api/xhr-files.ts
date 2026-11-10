import type { FileReply, FileTransport } from './client'

/**
 * The part of an `XMLHttpRequest` that the transport uses. A browser's
 * request has it, and a test can give a fake.
 */
export interface XhrRequest {
  open(method: string, url: string): void
  withCredentials: boolean
  setRequestHeader(name: string, value: string): void
  readonly upload: {
    addEventListener(
      type: 'progress',
      listener: (event: { loaded: number }) => void,
    ): void
  }
  addEventListener(type: 'load' | 'error' | 'abort', listener: () => void): void
  send(body: Blob): void
  abort(): void
  readonly status: number
  readonly responseText: string
}

function stopped(): DOMException {
  return new DOMException('The upload stopped.', 'AbortError')
}

/** The JSON body of an answer, or `null` when it has none. */
function bodyOf(request: XhrRequest): unknown {
  if (request.responseText === '') return null
  try {
    const body: unknown = JSON.parse(request.responseText)
    return body
  } catch {
    return null
  }
}

/**
 * Sends each raw file with an `XMLHttpRequest`, because only it reports the
 * bytes of a body that the browser sent. The request carries the session
 * cookie, also to the app origin of the Mac app, and one header:
 * `Content-Type: application/octet-stream`. The browser adds the length of
 * the file, and the query of the path names the file. `resolve` turns the
 * path into the address that the fetch of the same services uses.
 * `newRequest` makes the request, so a test can give a fake one.
 */
export function xhrFileTransport(
  newRequest: () => XhrRequest,
  resolve: (path: string) => string,
): FileTransport {
  return ({ path, file, progress, signal }) =>
    new Promise<FileReply>((done, fail) => {
      if (signal.aborted) {
        fail(stopped())
        return
      }
      const request = newRequest()
      request.open('POST', resolve(path))
      request.withCredentials = true
      request.setRequestHeader('Content-Type', 'application/octet-stream')
      request.upload.addEventListener('progress', (event) =>
        progress(event.loaded),
      )
      request.addEventListener('load', () =>
        done({ status: request.status, body: bodyOf(request) }),
      )
      request.addEventListener('error', () =>
        fail(new Error('The upload failed.')),
      )
      request.addEventListener('abort', () => fail(stopped()))
      signal.addEventListener('abort', () => request.abort(), { once: true })
      request.send(file)
    })
}
