import { existsSync } from 'node:fs'
import { readFile, stat } from 'node:fs/promises'
import { dirname } from 'node:path'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { withReleaseKeychain } from './release-keychain.ts'

beforeEach(() => {
  const values = {
    CSC_LINK: Buffer.from('test certificate').toString('base64'),
    CSC_KEY_PASSWORD: 'test export password',
    APPLE_API_KEY: Buffer.from(
      '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----\n',
    ).toString('base64'),
    APPLE_API_KEY_ID: 'ABCDEFGHIJ',
    APPLE_API_ISSUER: '00000000-0000-0000-0000-000000000000',
    CONDUCTIVE_APPLE_TEAM_ID: 'UV85J3PKBX',
    GITHUB_EVENT_NAME: 'workflow_dispatch',
  }
  for (const [name, value] of Object.entries(values)) vi.stubEnv(name, value)
})

afterEach(() => vi.unstubAllEnvs())

function keychainTool(failRestore = false) {
  let keychain = ''
  let deleted = false
  const run = (_program: string, args: string[]) => {
    if (args[0] === 'list-keychains' && !args.includes('-s'))
      return '"/test/login.keychain-db"\n'
    if (args[0] === 'create-keychain') keychain = args.at(-1)!
    if (args[0] === 'delete-keychain') deleted = true
    if (
      failRestore &&
      args[0] === 'list-keychains' &&
      args.includes('-s') &&
      !args.includes(keychain)
    )
      throw new Error('Cannot restore the search list')
    return ''
  }
  return { run, keychain: () => keychain, deleted: () => deleted }
}

it('keeps key files private, removes export credentials from the builder, and cleans up', async () => {
  const tool = keychainTool()
  await withReleaseKeychain(async (environment, team) => {
    expect(team).toBe('UV85J3PKBX')
    expect(environment.CSC_LINK).toBeUndefined()
    expect(environment.CSC_KEY_PASSWORD).toBeUndefined()
    const apiKey = environment.APPLE_API_KEY!
    expect((await stat(apiKey)).mode & 0o777).toBe(0o600)
    expect((await stat(dirname(apiKey))).mode & 0o777).toBe(0o700)
    expect(await readFile(apiKey, 'utf8')).toContain('BEGIN PRIVATE KEY')
  }, tool.run)
  expect(tool.deleted()).toBe(true)
  expect(existsSync(dirname(tool.keychain()))).toBe(false)
})

it('removes credentials when packaging fails', async () => {
  const tool = keychainTool()
  await expect(
    withReleaseKeychain(async () => {
      throw new Error('Packaging failed')
    }, tool.run),
  ).rejects.toThrow('Packaging failed')
  expect(tool.deleted()).toBe(true)
  expect(existsSync(dirname(tool.keychain()))).toBe(false)
})

it('still deletes the keychain when restoring the search list fails', async () => {
  const tool = keychainTool(true)
  await expect(withReleaseKeychain(async () => {}, tool.run)).rejects.toThrow(
    'Cannot restore the search list',
  )
  expect(tool.deleted()).toBe(true)
  expect(existsSync(dirname(tool.keychain()))).toBe(false)
})

it.each(['SIGINT', 'SIGTERM'] as const)(
  'cancels the release and removes credentials on %s',
  async (event) => {
    const tool = keychainTool()
    await expect(
      withReleaseKeychain(async (_environment, _team, signal) => {
        expect(signal).toBeInstanceOf(AbortSignal)
        const cancelled = new Promise<void>((_resolve, reject) => {
          signal.addEventListener(
            'abort',
            () => reject(new Error('Release cancelled')),
            { once: true },
          )
        })
        process.emit(event)
        await cancelled
      }, tool.run),
    ).rejects.toThrow('Release cancelled')
    expect(tool.deleted()).toBe(true)
    expect(existsSync(dirname(tool.keychain()))).toBe(false)
  },
)
