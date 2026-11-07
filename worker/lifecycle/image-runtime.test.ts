import { access, readdir } from 'node:fs/promises'
import { dirname } from 'node:path'

import { expect, it } from 'vitest'

import { imageTestProcess } from '../tools/image-test-process'
import { imageRuntimeFixture } from './image-runtime-test-support'

it('installs a verified private runtime and skips its next download', async () => {
  const fixture = await imageRuntimeFixture()
  const installed = await fixture.run()
  expect(installed.exitCode, installed.stderr).toBe(0)
  expect(await fixture.downloads()).toEqual(['download'])
  const started = await imageTestProcess(fixture.node, ['--version'])
  expect(started.exitCode, started.stderr).toBe(0)
  expect(started.stdout).toBe('private-runtime\n')
  const repeated = await fixture.run()
  expect(repeated.exitCode, repeated.stderr).toBe(0)
  expect(await fixture.downloads()).toEqual(['download'])
  expect(await readdir(dirname(fixture.directory))).toEqual([
    fixture.directory.split('/').at(-1),
  ])
})

it('rejects a runtime checksum mismatch before it publishes files', async () => {
  const fixture = await imageRuntimeFixture()
  const installed = await fixture.run('0'.repeat(64))
  expect(installed.exitCode, installed.stderr).toBe(1)
  expect(await fixture.downloads()).toEqual(['download'])
  await expect(access(fixture.node)).rejects.toMatchObject({ code: 'ENOENT' })
  expect(await readdir(dirname(fixture.directory))).toEqual([])
})
