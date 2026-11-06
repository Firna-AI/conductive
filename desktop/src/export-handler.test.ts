import { expect, it } from 'vitest'

import { DESKTOP_ORIGIN } from '../../worker/security/desktop-contract.js'
import { exportHandler } from './export-handler.js'

it('serves the bundle and SPA routes without exposing files outside the bundle', async () => {
  const handler = exportHandler(
    {
      realpath: async (path) => {
        if (path === '/bundle/leak.txt') return '/secret/key'
        if (['/bundle', '/bundle/index.html', '/bundle/app.js'].includes(path))
          return path
        throw Object.assign(new Error(), { code: 'ENOENT' })
      },
      stat: async () => ({ isFile: () => true }),
      read: async (path) =>
        new TextEncoder().encode(
          path === '/bundle/app.js' ? 'script' : '<main>Conducting</main>',
        ),
    },
    '/bundle',
    "default-src 'self'",
  )
  const page = await handler(new Request(`${DESKTOP_ORIGIN}/org/one`))
  expect(page.status).toBe(200)
  expect(await page.text()).toBe('<main>Conducting</main>')
  expect(page.headers.get('Content-Security-Policy')).toBe("default-src 'self'")
  const script = await handler(new Request(`${DESKTOP_ORIGIN}/app.js`))
  expect(script.headers.get('Content-Type')).toBe(
    'text/javascript; charset=utf-8',
  )
  expect(await script.text()).toBe('script')
  for (const path of [
    '/leak.txt',
    '/missing.js',
    '/%2e%2e%2fsecret',
    '/%5csecret',
  ]) {
    expect(
      (await handler(new Request(DESKTOP_ORIGIN + path))).status,
      path,
    ).toBe(404)
  }
  expect((await handler(new Request(`${DESKTOP_ORIGIN}/%zz`))).status).toBe(400)
  expect(
    (await handler(new Request(`${DESKTOP_ORIGIN}/`, { method: 'POST' })))
      .status,
  ).toBe(405)
})
