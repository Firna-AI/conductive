import { expect, it } from 'vitest'

import { decrypt, encrypt } from './crypto'

it('authenticates encrypted keys against their org and detects damaged ciphertext', async () => {
  const key = btoa('k'.repeat(32))
  const first = await encrypt('boat-secret', 'org-one', key)
  const second = await encrypt('boat-secret', 'org-one', key)
  expect(first).not.toContain('boat-secret')
  expect(second).not.toBe(first)
  expect(await decrypt(first, 'org-one', key)).toBe('boat-secret')
  await expect(decrypt(first, 'org-two', key)).rejects.toThrow()
  await expect(decrypt(`${first}extra`, 'org-one', key)).rejects.toThrow()
})
