import { existsSync } from 'node:fs'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, it, vi } from 'vitest'

import { runReleaseCommand } from './release-command.ts'

it('does not start a tool after cancellation', () => {
  const controller = new AbortController()
  controller.abort(new Error('Release cancelled'))
  expect(() =>
    runReleaseCommand(process.execPath, [], process.env, controller.signal),
  ).toThrow('Release cancelled')
})

it('stops a running release tool before cleanup continues', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'conductive-command-test-'))
  const marker = join(folder, 'pid')
  const controller = new AbortController()
  const outcome = runReleaseCommand(
    process.execPath,
    [
      '-e',
      'require("node:fs").writeFileSync(process.argv[1], String(process.pid)); setInterval(() => {}, 1000)',
      marker,
    ],
    process.env,
    controller.signal,
  ).catch((error: unknown) => error)
  try {
    await vi.waitFor(() => expect(existsSync(marker)).toBe(true))
    const pid = Number(await readFile(marker, 'utf8'))
    controller.abort()
    expect(await outcome).toMatchObject({ message: 'Release cancelled' })
    expect(() => process.kill(pid, 0)).toThrow()
  } finally {
    controller.abort()
    await outcome
    await rm(folder, { recursive: true, force: true })
  }
})
