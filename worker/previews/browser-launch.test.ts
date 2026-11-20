import { runInNewContext } from 'node:vm'

import { Window } from 'happy-dom'
import { expect, it, vi } from 'vitest'

import { previewBrowserDocument } from './browser-launch'

const hostname = `${'a'.repeat(32)}.previews.test`
const encodedPath = '/reports/%5C%252F%20caf%C3%A9/%E4%BD%A0%E5%A5%BD.html'

async function runBrowser(paths: readonly string[], destination: string) {
  const authorizer = new URL(
    'https://authorize.previews.test/.conductive/authorize',
  )
  const fields = new URLSearchParams({ hostname, grant: 'grant-value' })
  for (const path of paths) fields.append('path', path)
  authorizer.hash = fields.toString()
  const replace = vi.fn<(url: string) => void>()
  const location = {
    href: authorizer.href,
    hash: authorizer.hash,
    pathname: authorizer.pathname,
    port: authorizer.port,
    replace,
  }
  const history = {
    replaceState: vi.fn((_state: unknown, _title: string, path: string) => {
      const clean = new URL(path, location.href)
      location.href = clean.href
      location.hash = clean.hash
    }),
  }
  const fetch = vi.fn<(url: URL, init: RequestInit) => Promise<Response>>(
    async () => {
      expect(location.hash).toBe('')
      return Response.json({ url: destination })
    },
  )
  const window = new Window()
  window.document.body.innerHTML =
    '<span id="title"></span><span id="detail"></span>'
  const { html } = previewBrowserDocument('browser-nonce')
  const script = /<script nonce="[^"]+">([\s\S]*)<\/script>/.exec(html)?.[1]
  if (!script) throw new Error('Missing authorizer script')
  await runInNewContext(script, {
    URL,
    URLSearchParams,
    location,
    history,
    fetch,
    document: window.document,
  })
  const failed = window.document.body.classList.contains('failed')
  window.close()
  return { fetch, replace, history, failed }
}

it('keeps the fragment path out of the POST and follows only its encoded address, or the root without a path', async () => {
  for (const { paths, pathname } of [
    { paths: [], pathname: '/' },
    { paths: ['reports/\\%2F café/你好.html'], pathname: encodedPath },
  ]) {
    const result = await runBrowser(paths, `https://${hostname}${pathname}`)
    expect(result.failed).toBe(false)
    expect(result.history.replaceState).toHaveBeenCalledExactlyOnceWith(
      null,
      '',
      '/.conductive/authorize',
    )
    expect(result.fetch).toHaveBeenCalledTimes(1)
    const [url, init] = result.fetch.mock.calls[0]
    expect(url.origin).toBe('https://authorize.previews.test')
    expect(url.searchParams.get('hostname')).toBe(hostname)
    expect(url.searchParams.getAll('path')).toEqual([])
    expect(url.hash).toBe('')
    expect(init).toEqual({
      method: 'POST',
      credentials: 'include',
      headers: {
        Authorization: 'Bearer grant-value',
        Accept: 'application/json',
      },
    })
    expect(result.replace).toHaveBeenCalledExactlyOnceWith(
      `https://${hostname}${pathname}`,
    )
  }
})

it('refuses an authorizer reply with another path or an unsafe address', async () => {
  for (const destination of [
    `https://${hostname}/`,
    `https://${hostname}/other.html`,
    `https://foreign.test${encodedPath}`,
    `http://${hostname}${encodedPath}`,
    `https://${hostname}:444${encodedPath}`,
    `https://user:password@${hostname}${encodedPath}`,
    `https://${hostname}${encodedPath}?other=1`,
    `https://${hostname}${encodedPath}#other`,
  ]) {
    const result = await runBrowser(
      ['reports/\\%2F café/你好.html'],
      destination,
    )
    expect(result.failed, destination).toBe(true)
    expect(result.replace, destination).not.toHaveBeenCalled()
  }
})

it('refuses duplicate fragment paths before sending the grant', async () => {
  const result = await runBrowser(
    ['first.html', 'second.html'],
    `https://${hostname}/`,
  )
  expect(result.failed).toBe(true)
  expect(result.fetch).not.toHaveBeenCalled()
  expect(result.replace).not.toHaveBeenCalled()
})
