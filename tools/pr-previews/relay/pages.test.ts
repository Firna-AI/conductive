import { expect, it } from 'vitest'
import { GITHUB_SETUP_PATH } from '../../../src/shared/github-setup.ts'
import { GITHUB_RELAY_COOKIE } from '../../../worker/security/cookies.ts'
import { relayFixture } from './relay.test-support.ts'
import { relayFetch } from './worker.ts'

it('redirects an install return with its exact query and deletes the domain relay cookie', async () => {
  const fake = relayFixture()
  const response = await relayFetch(
    new Request(
      `https://preview.example${GITHUB_SETUP_PATH}?installation_id=7&setup_action=update&state=a%2Bb`,
      {
        headers: {
          Cookie: `${GITHUB_RELAY_COOKIE}=https%3A%2F%2Fpr-123-app.preview.example`,
        },
      },
    ),
    fake.env,
    fake.ctx,
    fake.dependencies,
  )
  expect(response.status).toBe(302)
  expect(response.headers.get('Location')).toBe(
    'https://pr-123-app.preview.example/github/setup?installation_id=7&setup_action=update&state=a%2Bb',
  )
  expect(response.headers.getSetCookie()).toEqual([
    '__Secure-conductive-github-relay=; Domain=preview.example; Path=/github/setup; HttpOnly; Secure; SameSite=Lax; Max-Age=0',
  ])
  expect(fake.list).not.toHaveBeenCalled()
})

it('shows the list instead of redirecting absent, malformed, foreign, or non-preview origins', async () => {
  const invalid = [
    null,
    '%ZZ',
    'https://elsewhere.example',
    'http://pr-1-app.preview.example',
    'https://pr-0-app.preview.example',
    'https://pr-01-app.preview.example',
    'https://pr-1-api.preview.example',
    'https://pr-1-app.other.example',
    'https://pr-1-app.preview.example.evil',
    'https://pr-1-app.preview.example:8443',
    'https://user:pass@pr-1-app.preview.example',
    'https://pr-1-app.preview.example/path',
    'https://pr-1-app.preview.example/',
    'https://pr-1-app.preview.example?query=1',
  ]
  for (const origin of invalid) {
    const fake = relayFixture()
    const cookie: Record<string, string> =
      origin === null
        ? {}
        : {
            Cookie: `${GITHUB_RELAY_COOKIE}=${origin === '%ZZ' ? origin : encodeURIComponent(origin)}`,
          }
    const response = await relayFetch(
      new Request(`https://preview.example${GITHUB_SETUP_PATH}`, {
        headers: cookie,
      }),
      fake.env,
      fake.ctx,
      fake.dependencies,
    )
    expect(response.status, String(origin)).toBe(200)
    expect(response.headers.get('Location'), String(origin)).toBeNull()
    expect(await response.text(), String(origin)).toContain('No live previews.')
  }
})

it('lists app and marketing links without script and answers HEAD without a body', async () => {
  const fake = relayFixture()
  fake.list.mockResolvedValue({
    keys: [{ name: 'pr-2' }, { name: 'pr-1' }, { name: 'bad<script>' }],
    list_complete: true,
  })
  const response = await relayFetch(
    new Request('https://preview.example/'),
    fake.env,
    fake.ctx,
    fake.dependencies,
  )
  const body = await response.text()
  expect(response.status).toBe(200)
  expect(response.headers.get('Content-Security-Policy')).toBe(
    "default-src 'none'",
  )
  expect(body).toContain('href="https://pr-1-app.preview.example"')
  expect(body).toContain('href="https://pr-2.preview.example"')
  expect(body).not.toContain('<script')
  const head = await relayFetch(
    new Request('https://preview.example/', { method: 'HEAD' }),
    fake.env,
    fake.ctx,
    fake.dependencies,
  )
  expect(head.status).toBe(200)
  expect(head.headers.get('Content-Security-Policy')).toBe("default-src 'none'")
  expect(await head.text()).toBe('')
})

it('escapes every dynamic list value in text and attributes', async () => {
  const fake = relayFixture('preview.example&"\'<script>')
  fake.list.mockResolvedValue({ keys: [{ name: 'pr-1' }], list_complete: true })
  const response = await relayFetch(
    new Request('https://preview.example/'),
    fake.env,
    fake.ctx,
    fake.dependencies,
  )
  const body = await response.text()
  expect(body).toContain('preview.example&amp;&quot;&#39;&lt;script&gt;')
  expect(body).not.toContain('<script>')
  expect(body).not.toContain('preview.example&"')
})

it('answers unknown paths with 404 without reading the registry', async () => {
  const fake = relayFixture()
  const response = await relayFetch(
    new Request('https://preview.example/unknown'),
    fake.env,
    fake.ctx,
    fake.dependencies,
  )
  expect(response.status).toBe(404)
  expect(fake.list).not.toHaveBeenCalled()
})
