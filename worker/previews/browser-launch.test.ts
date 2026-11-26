import { expect, it } from 'vitest'

import { previewBrowserDocument } from './browser-launch'
import { runBrowserLaunch } from './browser-launch-test-support'

const hostname = `${'a'.repeat(32)}.previews.test`
const encodedPath = '/reports/%5C%252F%20caf%C3%A9/%E4%BD%A0%E5%A5%BD.html'

async function runBrowser(paths: readonly string[], destination: string) {
  const authorizer = new URL(
    'https://authorize.previews.test/.conductive/authorize',
  )
  const fields = new URLSearchParams({ hostname, grant: 'grant-value' })
  for (const path of paths) fields.append('path', path)
  authorizer.hash = fields.toString()
  const { html } = previewBrowserDocument('browser-nonce')
  const result = await runBrowserLaunch(html, authorizer, async () =>
    Response.json({ url: destination }),
  )
  expect(result.fragments).toEqual(paths.length > 1 ? [] : [''])
  return result
}

it('posts the fragment path for rollout compatibility and follows only its encoded address, or the root without a path', async () => {
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
    expect(url.searchParams.getAll('path')).toEqual(paths)
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
