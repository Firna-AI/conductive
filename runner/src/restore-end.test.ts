import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { expect, it, onTestFinished, vi } from 'vitest'

import { runnerHarness } from '../test-support/harness'
import { onRestoreEnd } from './restore-end'
import { Runner } from './runner'

async function temporaryFolder() {
  const folder = await mkdtemp(join(tmpdir(), 'conductive-restore-'))
  onTestFinished(() => rm(folder, { recursive: true, force: true }))
  return folder
}

it('calls once when the marker and its folder appear', async () => {
  const folder = await temporaryFolder()
  const marker = join(folder, 'runtime', 'restore-ended')
  const ended = vi.fn()
  onTestFinished(onRestoreEnd(marker, ended, 10))
  await new Promise((resolve) => setTimeout(resolve, 50))
  expect(ended).not.toHaveBeenCalled()
  await mkdir(join(folder, 'runtime'))
  await writeFile(marker, '')
  await vi.waitFor(() => expect(ended).toHaveBeenCalledTimes(1))
  await rm(marker)
  await writeFile(marker, '')
  await new Promise((resolve) => setTimeout(resolve, 50))
  expect(ended).toHaveBeenCalledTimes(1)
})

it('calls nothing when the marker already exists or the watch stops', async () => {
  const folder = await temporaryFolder()
  const existing = join(folder, 'existing')
  await writeFile(existing, '')
  const ended = vi.fn()
  onTestFinished(onRestoreEnd(existing, ended, 10))
  const stopped = join(folder, 'stopped')
  onRestoreEnd(stopped, ended, 10)()
  await writeFile(existing, 'touched')
  await writeFile(stopped, '')
  await new Promise((resolve) => setTimeout(resolve, 50))
  expect(ended).not.toHaveBeenCalled()
})

it('watches the repository again and rescans when the restore ends', async () => {
  const h = await runnerHarness()
  await h.runner.close()
  const marker = join(h.home, 'restore-ended')
  const runner = new Runner({ ...h.options, restoreMarker: marker })
  onTestFinished(() => runner.close())
  const watch = vi.spyOn(runner.files, 'watch')
  const refresh = vi.spyOn(runner.files, 'refresh')
  await runner.start()
  expect(watch).toHaveBeenCalledTimes(1)
  const scans = refresh.mock.calls.length
  await writeFile(marker, '')
  await vi.waitFor(() => expect(watch).toHaveBeenCalledTimes(2), {
    timeout: 5_000,
  })
  expect(refresh.mock.calls.length).toBeGreaterThan(scans)
  await h.write('after-restore.txt', 'restored\n')
  await vi.waitFor(() =>
    expect(
      h.endpoint.runnerEvents.some(
        (entry) =>
          entry.event.type === 'changes.updated' &&
          entry.event.changes.files.some(
            (file) => file.path === 'after-restore.txt',
          ),
      ),
    ).toBe(true),
  )
  // Stop the watch, then wait for its last scan before the folder cleanup.
  await runner.close()
  await runner.files.refresh().catch(() => {})
})
