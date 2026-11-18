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
 * Sends each raw part of a file with an `XMLHttpRequest`, because only it
 * reports the bytes of a body that the browser sent. The request is a `PUT`
 * with the session cookie, also to the app origin of the Mac app, and one
 * header: `Content-Type: application/octet-stream`. The browser adds the
 * length of the part, and the path names the upload and the part. `resolve`
 * turns the path into the address that the fetch of the same services
 * uses. `newRequest` makes the request, so a test can give a fake one.
 *
 * One upload sends many parts with one `signal`. So each request stops
 * listening to the signal when it ends.
 */
export function xhrFileTransport(
  newRequest: () => XhrRequest,
  resolve: (path: string) => string,
): FileTransport {
  return ({ path, body, progress, signal }) =>
    new Promise<FileReply>((done, fail) => {
      if (signal.aborted) {
        fail(stopped())
        return
      }
      const request = newRequest()
      const stop = () => request.abort()
      const end = () => signal.removeEventListener('abort', stop)
      request.open('PUT', resolve(path))
      request.withCredentials = true
      request.setRequestHeader('Content-Type', 'application/octet-stream')
      request.upload.addEventListener('progress', (event) =>
        progress(event.loaded),
      )
      request.addEventListener('load', () => {
        end()
        done({ status: request.status, body: bodyOf(request) })
      })
      request.addEventListener('error', () => {
        end()
        fail(new Error('The upload failed.'))
      })
      request.addEventListener('abort', () => {
        end()
        fail(stopped())
      })
      signal.addEventListener('abort', stop, { once: true })
      request.send(body)
    })
}
