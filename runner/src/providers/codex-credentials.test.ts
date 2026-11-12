import {
  chmod,
  mkdir,
  readFile,
  readdir,
  stat,
  writeFile,
} from 'node:fs/promises'
import { join } from 'node:path'

import { expect, it, onTestFinished } from 'vitest'

import {
  codexCredentialFile,
  codexTokenFixture,
} from '../../test-support/codex-token'
import { fakeCodexAccount } from '../../test-support/providers'
import { wireFixture } from '../../test-support/wire'
import { object } from '../parse'
import { Runner } from '../runner'
import { codexStorageHome, writeCodexCredentials } from './codex-credentials'

it('isolates session credentials with private permissions and preserves shared conversation data', async () => {
  const h = await codexTokenFixture()
  const alice = await writeCodexCredentials(
    h.options.home,
    '../alice',
    'sk-alice',
    fakeCodexAccount,
  )
  const bob = await writeCodexCredentials(
    h.options.home,
    '.._alice',
    'sk-bob',
    fakeCodexAccount,
  )
  expect(alice.directory).not.toBe(bob.directory)
  expect(
    await readFile(codexCredentialFile(alice.directory), 'utf8'),
  ).toContain('sk-alice')
  expect(await readFile(codexCredentialFile(bob.directory), 'utf8')).toContain(
    'sk-bob',
  )
  expect((await stat(alice.directory)).mode & 0o777).toBe(0o700)
  expect((await stat(codexCredentialFile(alice.directory))).mode & 0o777).toBe(
    0o600,
  )
  const storage = codexStorageHome(h.options.home)
  await writeFile(
    join(storage, 'sessions', 'conversation.jsonl'),
    'saved conversation',
  )
  expect(
    await readFile(
      join(alice.directory, 'sessions', 'conversation.jsonl'),
      'utf8',
    ),
  ).toBe('saved conversation')
  await writeFile(
    join(alice.directory, 'sessions', 'token-conversation.jsonl'),
    'new conversation',
  )
  expect(
    await readFile(
      join(storage, 'sessions', 'token-conversation.jsonl'),
      'utf8',
    ),
  ).toBe('new conversation')
  await alice.remove()
  await alice.remove()
  expect(
    await readFile(codexCredentialFile(alice.directory), 'utf8').catch(
      () => null,
    ),
  ).toBe(null)
  expect(await readFile(codexCredentialFile(bob.directory), 'utf8')).toContain(
    'sk-bob',
  )
  await chmod(alice.directory, 0o755)
  const next = await writeCodexCredentials(
    h.options.home,
    '../alice',
    'sk-next',
    fakeCodexAccount,
  )
  expect(next.directory).toBe(alice.directory)
  expect((await stat(next.directory)).mode & 0o777).toBe(0o700)
  await chmod(codexCredentialFile(next.directory), 0o644)
  await writeCodexCredentials(
    h.options.home,
    '../alice',
    'sk-final',
    fakeCodexAccount,
  )
  expect((await stat(codexCredentialFile(next.directory))).mode & 0o777).toBe(
    0o600,
  )
  expect(
    object(
      object(
        JSON.parse(await readFile(codexCredentialFile(next.directory), 'utf8')),
      ).tokens,
    ).access_token,
  ).toBe('sk-final')
  expect(
    await readFile(
      join(next.directory, 'sessions', 'conversation.jsonl'),
      'utf8',
    ),
  ).toBe('saved conversation')
})

it('removes stale Codex credentials before connecting and keeps live files on reconnect', async () => {
  const h = await codexTokenFixture()
  const stale = await writeCodexCredentials(
    h.options.home,
    'stale',
    'sk-old',
    fakeCodexAccount,
  )
  await writeFile(join(stale.directory, '.auth-interrupted'), 'sk-old')
  await writeFile(join(stale.directory, 'config.toml'), 'model="saved-model"')
  const project = join(h.options.home, '.codex')
  await mkdir(project)
  await writeFile(codexCredentialFile(project), 'project-login')
  const wire = await wireFixture()
  const observed: (string | null)[] = []
  const runner = new Runner({
    ...wire.options,
    home: h.options.home,
    connect: async (request) => {
      observed.push(
        await readFile(codexCredentialFile(stale.directory), 'utf8').catch(
          () => null,
        ),
      )
      return wire.options.connect(request)
    },
  })
  onTestFinished(() => runner.close())
  await runner.start(false)
  expect(observed).toEqual([null])
  expect(await readdir(stale.directory)).toEqual([
    'archived_sessions',
    'config.toml',
    'sessions',
  ])
  expect(await readFile(codexCredentialFile(project), 'utf8')).toBe(
    'project-login',
  )
  const live = await writeCodexCredentials(
    h.options.home,
    'stale',
    'sk-live',
    fakeCodexAccount,
  )
  await runner.connect()
  expect(observed).toEqual([
    null,
    await readFile(codexCredentialFile(live.directory), 'utf8'),
  ])
  expect(
    object(
      object(
        JSON.parse(await readFile(codexCredentialFile(live.directory), 'utf8')),
      ).tokens,
    ).access_token,
  ).toBe('sk-live')
})
