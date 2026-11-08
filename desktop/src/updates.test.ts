import { EventEmitter } from 'node:events'
import { expect, it, vi } from 'vitest'

import { startUpdates } from './updates.js'

function deferred<T>() {
  let resolve: (value: T) => void = () => {
    throw new Error('Promise is not arranged')
  }
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

it('keeps unpublished and development builds off the release feed', () => {
  const updater = {
    setFeedURL: vi.fn(),
    on: vi.fn(),
    autoDownload: true,
    autoInstallOnAppQuit: true,
    allowPrerelease: false,
    checkForUpdates: vi.fn(async () => {}),
    downloadUpdate: vi.fn(async () => {}),
    quitAndInstall: vi.fn(),
  }
  const every = vi.fn(() => () => {})
  for (const mode of [
    { packaged: false, enabled: true },
    { packaged: true, enabled: false },
  ]) {
    const updates = startUpdates({
      updater,
      ...mode,
      every,
      choose: async () => true,
      warn: () => {},
    })
    updates.check()
    expect(updates.available).toBe(false)
  }
  expect(updater.setFeedURL).not.toHaveBeenCalled()
  expect(updater.checkForUpdates).not.toHaveBeenCalled()
  expect(every).not.toHaveBeenCalled()
})

it('automatically updates packages and offers restart once per downloaded version', async () => {
  const offline = new Error('The check failed')
  const promptError = new Error('The dialog failed')
  const checkFailed = deferred<void>()
  const dialogFailed = deferred<void>()
  const firstChoice = deferred<boolean>()
  const restart = deferred<void>()
  const updater = Object.assign(new EventEmitter(), {
    autoDownload: false,
    autoInstallOnAppQuit: false,
    allowPrerelease: false,
    setFeedURL: vi.fn(),
    checkForUpdates: vi
      .fn()
      .mockRejectedValueOnce(offline)
      .mockResolvedValue(undefined),
    downloadUpdate: vi.fn(async () => {}),
    quitAndInstall: vi.fn(() => restart.resolve()),
  })
  const choose = vi
    .fn()
    .mockImplementationOnce(() => firstChoice.promise)
    .mockRejectedValueOnce(promptError)
    .mockResolvedValue(true)
  const warnings: unknown[] = []
  const stopped = vi.fn()
  const updates = startUpdates({
    updater,
    packaged: true,
    enabled: true,
    choose,
    every: () => stopped,
    warn: (error) => {
      warnings.push(error)
      if (error === offline) checkFailed.resolve()
      if (error === promptError) dialogFailed.resolve()
    },
  })
  expect(updates.available).toBe(true)
  expect(updater.setFeedURL).toHaveBeenCalledWith({
    provider: 'github',
    owner: 'Firna-AI',
    repo: 'conductive-desktop',
  })
  expect(updater.autoDownload).toBe(true)
  expect(updater.autoInstallOnAppQuit).toBe(true)
  expect(updater.allowPrerelease).toBe(true)
  await checkFailed.promise
  await updates.check()
  expect(updater.checkForUpdates).toHaveBeenCalledTimes(2)
  updater.emit('update-available', { version: '0.2.0' })
  expect(choose).not.toHaveBeenCalled()
  expect(updater.downloadUpdate).not.toHaveBeenCalled()
  updater.emit('update-downloaded', { version: '0.2.0' })
  updater.emit('update-downloaded', { version: '0.2.0' })
  updater.emit('update-downloaded', { version: '0.3.0' })
  expect(choose).toHaveBeenCalledTimes(1)
  expect(choose).toHaveBeenLastCalledWith('The update is ready.', 'Restart now')
  firstChoice.resolve(false)
  await firstChoice.promise
  updater.emit('update-downloaded', { version: '0.2.0' })
  expect(choose).toHaveBeenCalledTimes(1)
  expect(updater.quitAndInstall).not.toHaveBeenCalled()
  updater.emit('update-downloaded', { version: '0.3.0' })
  expect(choose).toHaveBeenCalledTimes(2)
  await dialogFailed.promise
  updater.emit('update-downloaded', { version: '0.4.0' })
  expect(choose).toHaveBeenCalledTimes(3)
  await restart.promise
  updater.emit('update-downloaded', { version: '0.4.0' })
  expect(choose).toHaveBeenCalledTimes(3)
  expect(updater.quitAndInstall).toHaveBeenCalledTimes(1)
  expect(warnings).toEqual([offline, promptError])
  updates.stop()
  expect(stopped).toHaveBeenCalledTimes(1)
})
