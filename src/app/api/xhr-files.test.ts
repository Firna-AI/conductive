import { describe, expect, test } from 'vitest'
import { attachmentUploadPartPath } from '../../shared/messages'
import { xhrFileTransport, type XhrRequest } from './xhr-files'

/** A request that records what the transport does, and plays the browser. */
class FakeRequest implements XhrRequest {
  opened: [string, string] | null = null
  withCredentials = false
  headers: [string, string][] = []
  body: Blob | null = null
  aborted = false
  status = 0
  responseText = ''
  private readonly listeners = new Map<string, () => void>()
  private sent: (event: { loaded: number }) => void = () => {}
  readonly upload = {
    addEventListener: (
      _type: 'progress',
      listener: (event: { loaded: number }) => void,
    ) => {
      this.sent = listener
    },
  }

  open(method: string, url: string): void {
    this.opened = [method, url]
  }

  setRequestHeader(name: string, value: string): void {
    this.headers.push([name, value])
  }

  addEventListener(type: 'load' | 'error' | 'abort', listener: () => void) {
    this.listeners.set(type, listener)
  }

  send(body: Blob): void {
    this.body = body
  }

  abort(): void {
    this.aborted = true
    this.listeners.get('abort')?.()
  }

  /** The browser measured `loaded` bytes of the body as sent. */
  measure(loaded: number): void {
    this.sent({ loaded })
  }

  answer(status: number, text: string): void {
    this.status = status
    this.responseText = text
    this.listeners.get('load')?.()
  }
}

const part = new File(['png'], 'overlap.png', { type: 'image/png' }).slice(1)
const path = attachmentUploadPartPath(
  'acme',
  { type: 'new-workspace', messageId: 'message-1' },
  'upload-1',
  2,
)
const origin = 'https://worker.conductive.test'

function upload(request: FakeRequest, signal = new AbortController().signal) {
  const progress: number[] = []
  const transport = xhrFileTransport(
    () => request,
    (address) => new URL(address, origin).href,
  )
  const reply = transport({
    path,
    body: part,
    progress: (sentBytes) => progress.push(sentBytes),
    signal,
  })
  return { reply, progress }
}

describe('xhrFileTransport', () => {
  test('puts the raw part at the resolved address with the cookie, only the file content type, and the measured progress', async () => {
    const request = new FakeRequest()
    const { reply, progress } = upload(request)
    request.measure(1)
    request.measure(2)
    request.answer(200, JSON.stringify({ partNumber: 2, etag: 'etag-2' }))
    expect(await reply).toEqual({
      status: 200,
      body: { partNumber: 2, etag: 'etag-2' },
    })
    expect({
      opened: request.opened,
      credentials: request.withCredentials,
      headers: request.headers,
      body: request.body,
      progress,
    }).toEqual({
      opened: ['PUT', `${origin}${path}`],
      credentials: true,
      headers: [['Content-Type', 'application/octet-stream']],
      body: part,
      progress: [1, 2],
    })
  })

  test('gives an answer that is not JSON as no body', async () => {
    const request = new FakeRequest()
    const { reply } = upload(request)
    request.answer(502, 'Bad gateway')
    expect(await reply).toEqual({ status: 502, body: null })
  })

  test('aborts the request when its signal stops it, and opens none for a stopped signal', async () => {
    const running = new FakeRequest()
    const job = new AbortController()
    const { reply } = upload(running, job.signal)
    job.abort()
    await expect(reply).rejects.toMatchObject({ name: 'AbortError' })
    const late = new FakeRequest()
    await expect(upload(late, job.signal).reply).rejects.toMatchObject({
      name: 'AbortError',
    })
    expect({ aborted: running.aborted, opened: late.opened }).toEqual({
      aborted: true,
      opened: null,
    })
  })

  test('a part that ended no longer listens to the signal of its upload, which the next part keeps', async () => {
    const job = new AbortController()
    const first = new FakeRequest()
    const answered = upload(first, job.signal)
    first.answer(200, JSON.stringify({ partNumber: 1, etag: 'etag-1' }))
    await answered.reply
    const next = new FakeRequest()
    const running = upload(next, job.signal)
    job.abort()
    await expect(running.reply).rejects.toMatchObject({ name: 'AbortError' })
    expect({ first: first.aborted, next: next.aborted }).toEqual({
      first: false,
      next: true,
    })
  })
})
