import { expect, it } from 'vitest'

import { ingressReader, type IngressFile } from './ingress'

const identity = {
  sandboxId: 'sandbox-one',
  domain: 'eu.e2b.test',
  aliases: { '7682': 41235 },
}
const file = (): IngressFile => ({
  bytes: new TextEncoder().encode(JSON.stringify(identity)),
  uid: 0,
  mode: 0o444,
  regular: true,
})

it('reads current protected ingress metadata after an initial missing file and later alias change', async () => {
  let current: IngressFile | undefined
  const reader = ingressReader(async () => {
    if (!current) throw Object.assign(new Error('missing'), { code: 'ENOENT' })
    return current
  })
  expect(await reader()).toBeUndefined()
  current = file()
  expect(await reader()).toEqual(identity)
  current = {
    ...file(),
    bytes: new TextEncoder().encode(
      JSON.stringify({ ...identity, aliases: { '7682': 41236 } }),
    ),
  }
  expect(await reader()).toEqual({ ...identity, aliases: { '7682': 41236 } })
})

it('does not trust writable, user-owned, malformed, or oversized ingress metadata', async () => {
  for (const current of [
    { ...file(), uid: 1000 },
    { ...file(), mode: 0o666 },
    { ...file(), regular: false },
    { ...file(), bytes: new Uint8Array(1025) },
    { ...file(), bytes: new TextEncoder().encode('{invalid') },
    {
      ...file(),
      bytes: new TextEncoder().encode(
        JSON.stringify({ ...identity, domain: 'other.test/path' }),
      ),
    },
  ])
    await expect(ingressReader(async () => current)()).resolves.toBeNull()
})
