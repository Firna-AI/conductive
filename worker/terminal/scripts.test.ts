import { chmod, readdir, readFile, writeFile, unlink } from 'node:fs/promises'

import { expect, it } from 'vitest'

import { credentialScript, launcherScript } from './scripts'
import { runScript, scriptFixture } from './scripts.test-support'

it('creates and reuses a local runtime credential without new entropy and keeps separate runtime storage', async () => {
  const first = await scriptFixture()
  expect((await runScript(credentialScript(first.options))).code).toBe(0)
  expect(await readdir(first.options.runtimeDirectory)).toContain('password')
  expect(await first.readPassword()).toBe('11'.repeat(32))
  expect(await readFile(first.capturedEntropy)).toEqual(Buffer.alloc(32, 17))
  await writeFile(first.entropyInput, Buffer.alloc(32, 34))
  expect((await runScript(credentialScript(first.options))).code).toBe(0)
  expect(await first.readPassword()).toBe('11'.repeat(32))
  expect(await readFile(first.calls, 'utf8')).toBe('called\n')
  const second = {
    ...first.options,
    runtimeDirectory: `${first.root}/second runtime`,
  }
  expect((await runScript(credentialScript(second))).code).toBe(0)
  expect(await readFile(`${second.runtimeDirectory}/password`, 'utf8')).toBe(
    '22'.repeat(32),
  )
  expect(await first.readPassword()).toBe('11'.repeat(32))
})

it('refuses missing, unreadable, and empty runtime passwords before executing the terminal', async () => {
  const fixture = await scriptFixture()
  const missing = await runScript(launcherScript(fixture.options))
  expect(missing.code).not.toBe(0)
  expect(await readdir(fixture.root)).not.toContain('started')
  await runScript(credentialScript(fixture.options))
  const valid = await runScript(launcherScript(fixture.options), true)
  expect(valid.code).toBe(0)
  expect(await readdir(fixture.root)).toContain('started')
  await unlink(`${fixture.root}/started`)
  await writeFile(`${fixture.options.runtimeDirectory}/password`, '')
  const empty = await runScript(launcherScript(fixture.options))
  expect(empty.code).not.toBe(0)
  expect(await readdir(fixture.root)).not.toContain('started')
  await writeFile(
    `${fixture.options.runtimeDirectory}/password`,
    '11'.repeat(32),
  )
  await chmod(`${fixture.options.runtimeDirectory}/password`, 0)
  const unreadable = await runScript(launcherScript(fixture.options), true)
  expect(unreadable.code).not.toBe(0)
  expect(await readdir(fixture.root)).not.toContain('started')
})

it('fails credential generation without installing an empty password when the entropy command fails', async () => {
  const fixture = await scriptFixture()
  const result = await runScript(
    credentialScript({ ...fixture.options, entropyCommand: ['/bin/false'] }),
  )
  expect(result.code).not.toBe(0)
  expect(await readdir(fixture.options.runtimeDirectory)).not.toContain(
    'password',
  )
  expect(result.stdout).toBe('')
})
