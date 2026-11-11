import { EventEmitter } from 'node:events'
import { expect, it, vi } from 'vitest'

import { sourceRepository } from '../../docs/mockups/src/brand.js'
import { startUpdates } from './updates.js'
import { deferred, updateHarness } from './updates.test-support.js'

it('keeps unpublished and development builds off the release feed', () => {
  const updater = {
    setFeedURL: vi.fn(),
    on: vi.fn(),
    autoDownload: true,
    autoInstallOnAppQuit: true,
    allowPrerelease: false,
    checkForUpdates: vi.fn(async () => ({ isUpdateAvailable: false })),
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
      nativeUpdater: new EventEmitter(),
      ...mode,
      every,
      choose: async () => true,
      inform: async () => {},
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
      .mockResolvedValue({ isUpdateAvailable: false }),
    downloadUpdate: vi.fn(async () => {}),
    quitAndInstall: vi.fn(() => restart.resolve()),
  })
  const nativeUpdater = new EventEmitter()
  const choose = vi
    .fn()
    .mockImplementationOnce(() => firstChoice.promise)
    .mockRejectedValueOnce(promptError)
    .mockResolvedValue(true)
  const warnings: unknown[] = []
  const stopped = vi.fn()
  const updates = startUpdates({
    updater,
    nativeUpdater,
    packaged: true,
    enabled: true,
    choose,
    inform: async () => {},
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
    owner: sourceRepository.owner,
    repo: sourceRepository.name,
  })
  expect(updater.autoDownload).toBe(true)
  expect(updater.autoInstallOnAppQuit).toBe(true)
  expect(updater.allowPrerelease).toBe(false)
  await checkFailed.promise
  await updates.check()
  await updates.check()
  expect(updater.checkForUpdates).toHaveBeenCalledTimes(2)
  updater.emit('update-available', { version: '0.2.0' })
  expect(choose).not.toHaveBeenCalled()
  expect(updater.downloadUpdate).not.toHaveBeenCalled()
  updater.emit('update-downloaded', { version: '0.2.0' })
  updater.emit('update-downloaded', { version: '0.2.0' })
  expect(choose).not.toHaveBeenCalled()
  nativeUpdater.emit('update-downloaded')
  nativeUpdater.emit('update-downloaded')
  const firstOffer = updates.check()
  updater.emit('update-downloaded', { version: '0.3.0' })
  nativeUpdater.emit('update-downloaded')
  expect(choose).toHaveBeenCalledTimes(1)
  expect(choose).toHaveBeenLastCalledWith('The update is ready.', 'Restart now')
  firstChoice.resolve(false)
  await firstOffer
  updater.emit('update-downloaded', { version: '0.2.0' })
  nativeUpdater.emit('update-downloaded')
  expect(choose).toHaveBeenCalledTimes(1)
  expect(updater.quitAndInstall).not.toHaveBeenCalled()
  updater.emit('update-downloaded', { version: '0.3.0' })
  nativeUpdater.emit('update-downloaded')
  expect(choose).toHaveBeenCalledTimes(2)
  await dialogFailed.promise
  await updates.check()
  updater.emit('update-downloaded', { version: '0.4.0' })
  nativeUpdater.emit('update-downloaded')
  expect(choose).toHaveBeenCalledTimes(3)
  await restart.promise
  updater.emit('update-downloaded', { version: '0.4.0' })
  nativeUpdater.emit('update-downloaded')
  expect(choose).toHaveBeenCalledTimes(3)
  expect(updater.quitAndInstall).toHaveBeenCalledTimes(1)
  expect(warnings).toEqual([offline, promptError])
  updates.stop()
  expect(stopped).toHaveBeenCalledTimes(1)
})

it('answers a manual check that joins an automatic check with no update', async () => {
  const { updater, dependencies } = updateHarness()
  const result = deferred<{ isUpdateAvailable: boolean }>()
  updater.checkForUpdates.mockReturnValueOnce(result.promise)
  const updates = startUpdates(dependencies)
  const answer = updates.check()
  expect(dependencies.inform).not.toHaveBeenCalled()
  expect(updater.checkForUpdates).toHaveBeenCalledTimes(1)
  result.resolve({ isUpdateAvailable: false })
  await answer
  expect(dependencies.inform).toHaveBeenCalledExactlyOnceWith(
    'Conductive is up to date.',
  )
})

it('answers a failed manual check and keeps automatic failures silent', async () => {
  const { updater, dependencies } = updateHarness()
  const offline = new Error('Offline')
  updater.checkForUpdates.mockRejectedValue(offline)
  const updates = startUpdates(dependencies)
  await updates.check()
  expect(dependencies.inform).toHaveBeenCalledExactlyOnceWith(
    'Conductive could not check for updates. Try again later.',
  )
  dependencies.inform.mockClear()
  await dependencies.every.mock.calls[0][0]()
  expect(dependencies.inform).not.toHaveBeenCalled()
  expect(dependencies.warn).toHaveBeenCalledWith(offline)
})

it('answers a found version before offering its natively accepted download', async () => {
  const { updater, nativeUpdater, dependencies } = updateHarness()
  updater.checkForUpdates.mockResolvedValue({ isUpdateAvailable: true })
  const updates = startUpdates(dependencies)
  await updates.check()
  expect(dependencies.inform).toHaveBeenCalledExactlyOnceWith(
    'Downloading the new version. Conductive tells you when it is ready.',
  )
  updater.emit('update-downloaded', { version: '0.2.0' })
  expect(dependencies.choose).not.toHaveBeenCalled()
  nativeUpdater.emit('update-downloaded')
  await updates.check()
  expect(dependencies.choose).toHaveBeenCalledExactlyOnceWith(
    'The update is ready.',
    'Restart now',
  )
})

it('offers a waiting update again after Later and restarts when asked', async () => {
  const { updater, nativeUpdater, dependencies } = updateHarness()
  const updates = startUpdates(dependencies)
  updater.emit('update-downloaded', { version: '0.2.0' })
  nativeUpdater.emit('update-downloaded')
  await updates.check()
  expect(updater.quitAndInstall).not.toHaveBeenCalled()
  dependencies.choose.mockResolvedValue(true)
  await updates.check()
  expect(dependencies.choose).toHaveBeenCalledTimes(2)
  expect(updater.quitAndInstall).toHaveBeenCalledTimes(1)
  expect(updater.autoInstallOnAppQuit).toBe(true)
  expect(updater.checkForUpdates).toHaveBeenCalledTimes(1)
})

it('answers once when native acceptance arrives before the running check finishes', async () => {
  const { updater, nativeUpdater, dependencies } = updateHarness()
  const result = deferred<{ isUpdateAvailable: boolean }>()
  updater.checkForUpdates.mockReturnValueOnce(result.promise)
  const updates = startUpdates(dependencies)
  const answer = updates.check()
  updater.emit('update-downloaded', { version: '0.2.0' })
  nativeUpdater.emit('update-downloaded')
  expect(dependencies.choose).not.toHaveBeenCalled()
  result.resolve({ isUpdateAvailable: true })
  await answer
  expect(dependencies.choose).toHaveBeenCalledTimes(1)
  expect(dependencies.inform).not.toHaveBeenCalled()
})

it('queues native readiness after the manual answer without overlapping dialogs', async () => {
  const { updater, nativeUpdater, dependencies } = updateHarness()
  const acknowledged = deferred<void>()
  const informed = deferred<void>()
  dependencies.inform.mockImplementation(async () => {
    informed.resolve()
    await acknowledged.promise
  })
  updater.checkForUpdates.mockResolvedValue({ isUpdateAvailable: true })
  const updates = startUpdates(dependencies)
  const answer = updates.check()
  await informed.promise
  updater.emit('update-downloaded', { version: '0.2.0' })
  nativeUpdater.emit('update-downloaded')
  const ready = updates.check()
  expect(dependencies.choose).not.toHaveBeenCalled()
  acknowledged.resolve()
  await Promise.all([answer, ready])
  expect(dependencies.choose).toHaveBeenCalledTimes(1)
})

it('logs native and later download failures without another manual answer', async () => {
  const { updater, nativeUpdater, dependencies } = updateHarness()
  updater.checkForUpdates.mockResolvedValue({ isUpdateAvailable: true })
  const updates = startUpdates(dependencies)
  await updates.check()
  const refused = new Error('macOS refused the update')
  nativeUpdater.emit('error', refused)
  updater.emit('error', refused)
  expect(dependencies.warn).toHaveBeenCalledWith(refused)
  expect(dependencies.inform).toHaveBeenCalledTimes(1)
  expect(dependencies.choose).not.toHaveBeenCalled()
})
