import {
  chmod,
  mkdir,
  mkdtemp,
  open,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, join } from 'node:path'

import { afterEach, expect, it, onTestFinished, vi } from 'vitest'

import { writeClaudeProfile } from './claude-profile'

vi.mock('node:fs/promises', async (original) => {
  const fs = await original<typeof import('node:fs/promises')>()
  return { ...fs, open: vi.fn(fs.open) }
})

afterEach(() => vi.mocked(open).mockReset())

async function fixture() {
  const home = await mkdtemp(join(tmpdir(), 'conductive-profile-'))
  onTestFinished(() => rm(home, { recursive: true, force: true }))
  const root = join(home, '.conductive', 'anthropic')
  const directory = join(root, 'credentials')
  return { home, root, directory }
}

function paths(directory: string, name: string) {
  return {
    config: join(directory, 'configs', `${name}.json`),
    credential: join(directory, 'credentials', `${name}.json`),
  }
}

it('writes the gateway and turn token into private separate profile files', async () => {
  const h = await fixture()
  const profile = await writeClaudeProfile(
    h.home,
    'session/alice',
    'https://machines.conductive.test/v1/model/claude',
    'sk-ant-api-turn-alice',
  )
  const files = paths(profile.directory, profile.name)
  expect(await readFile(files.config, 'utf8').catch(() => null)).toBe(
    JSON.stringify({
      base_url: 'https://machines.conductive.test/v1/model/claude',
      authentication: { type: 'user_oauth' },
    }),
  )
  expect(dirname(profile.directory)).toBe(h.directory)
  expect(basename(profile.directory)).toMatch(/^[A-Za-z0-9_.-]+$/)
  expect(await readFile(files.credential, 'utf8')).toBe(
    JSON.stringify({ access_token: 'sk-ant-api-turn-alice' }),
  )
  expect((await stat(files.credential)).mode & 0o777).toBe(0o600)
  expect((await stat(profile.directory)).mode & 0o777).toBe(0o700)
  expect(
    (await stat(join(profile.directory, 'credentials'))).mode & 0o777,
  ).toBe(0o700)
  expect((await stat(join(profile.directory, 'configs'))).mode & 0o777).toBe(
    0o700,
  )
  await chmod(h.directory, 0o755)
  const next = await writeClaudeProfile(
    h.home,
    'session/alice',
    'https://machines.conductive.test/v1/model/claude',
    'next-turn-token',
  )
  expect(next.name).toBe(profile.name)
  expect(next.directory).not.toBe(profile.directory)
  expect((await stat(h.directory)).mode & 0o777).toBe(0o700)
  expect(
    (await stat(paths(next.directory, next.name).credential)).mode & 0o777,
  ).toBe(0o600)
  expect((await stat(next.directory)).mode & 0o777).toBe(0o700)
  expect((await stat(join(next.directory, 'credentials'))).mode & 0o777).toBe(
    0o700,
  )
  expect((await stat(join(next.directory, 'configs'))).mode & 0o777).toBe(0o700)
  expect(await readFile(files.credential, 'utf8')).toBe(
    JSON.stringify({ access_token: 'sk-ant-api-turn-alice' }),
  )
  expect(
    await readFile(paths(next.directory, next.name).credential, 'utf8'),
  ).toBe(JSON.stringify({ access_token: 'next-turn-token' }))
})

it('gives overlapping processes separate profiles and removes only their own files and locks', async () => {
  const h = await fixture()
  const [alice, bob, next] = await Promise.all([
    writeClaudeProfile(
      h.home,
      '../session/alice',
      'https://gateway/claude',
      'alice-token',
    ),
    writeClaudeProfile(
      h.home,
      '.._session_alice',
      'https://gateway/claude',
      'bob-token',
    ),
    writeClaudeProfile(
      h.home,
      '../session/alice',
      'https://gateway/claude',
      'next-token',
    ),
  ])
  expect(alice.name).not.toBe(bob.name)
  expect(alice.name).toMatch(/^[A-Za-z0-9_.-]+$/)
  expect(bob.name).toMatch(/^[A-Za-z0-9_.-]+$/)
  expect(next.name).toBe(alice.name)
  expect(new Set([alice.directory, bob.directory, next.directory]).size).toBe(3)
  expect(
    await readFile(paths(alice.directory, alice.name).credential, 'utf8'),
  ).toBe('{"access_token":"alice-token"}')
  expect(
    await readFile(paths(bob.directory, bob.name).credential, 'utf8'),
  ).toBe('{"access_token":"bob-token"}')
  await mkdir(join(alice.directory, 'credentials.lock'))
  await writeFile(join(alice.directory, 'credentials.lock', 'held'), '')
  await writeFile(join(alice.directory, 'other-state'), '')
  await alice.remove()
  await alice.remove()
  expect(await stat(alice.directory).catch(() => null)).toBe(null)
  expect(
    await readFile(paths(alice.directory, alice.name).credential, 'utf8').catch(
      () => null,
    ),
  ).toBe(null)
  expect(
    await readFile(paths(bob.directory, bob.name).credential, 'utf8'),
  ).toBe('{"access_token":"bob-token"}')
  expect(
    await readFile(paths(next.directory, next.name).credential, 'utf8'),
  ).toBe('{"access_token":"next-token"}')
  expect(
    await readFile(paths(alice.directory, alice.name).config, 'utf8').catch(
      () => null,
    ),
  ).toBe(null)
  expect(
    await readFile(paths(bob.directory, bob.name).config, 'utf8'),
  ).toContain('https://gateway/claude')
})

it('removes the whole process folder when profile preparation fails', async () => {
  const h = await fixture()
  vi.mocked(open).mockRejectedValueOnce(new Error('profile preparation failed'))
  await expect(
    writeClaudeProfile(
      h.home,
      'session',
      'https://gateway/claude',
      'turn-token',
    ),
  ).rejects.toThrow('profile preparation failed')
  expect(await readdir(h.root)).toEqual(['credentials'])
  expect(await readdir(h.directory)).toEqual([])
})
