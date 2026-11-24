import { readFile } from 'node:fs/promises'
import { URL } from 'node:url'

import { expect, it } from 'vitest'

import { siteResponse } from './site'

const url = 'https://conductive.build/install-computer'
const script = new URL('../../image/computer/install.sh', import.meta.url)
const headers = {
  'Content-Type': 'text/plain; charset=utf-8',
  'Cache-Control': 'no-cache',
  'X-Content-Type-Options': 'nosniff',
}

function request(method: string): Promise<Response> {
  return siteResponse(
    new Request(url, { method }),
    { appOrigin: 'https://app.conductive.build' },
    Date.UTC(2026, 10, 24),
  )
}

it('serves the install script bytes and headers on GET', async () => {
  const response = await request('GET')
  expect(response.status).toBe(200)
  for (const [name, value] of Object.entries(headers)) {
    expect(response.headers.get(name), name).toBe(value)
  }
  expect(Buffer.from(await response.arrayBuffer())).toEqual(
    await readFile(script),
  )
})

it('serves the install headers on HEAD and refuses POST', async () => {
  const response = await request('HEAD')
  expect(response.status).toBe(200)
  for (const [name, value] of Object.entries(headers)) {
    expect(response.headers.get(name), name).toBe(value)
  }
  expect(await response.text()).toBe('')

  const write = await request('POST')
  expect(write.status).toBe(405)
  expect(write.headers.get('Allow')).toBe('GET, HEAD')
})
