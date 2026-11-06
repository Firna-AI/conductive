import { EventEmitter } from 'node:events'
import { expect, it, vi } from 'vitest'

import { startUpdates } from './updates.js'

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

it('checks enabled packages and asks before download and restart', async () => {
  let downloadStarted: () => void = () => {
    throw new Error('Download is not arranged')
  }
  let restarted: () => void = () => {
    throw new Error('Restart is not arranged')
  }
  const downloaded = new Promise<void>((resolve) => {
    downloadStarted = resolve
  })
  const restart = new Promise<void>((resolve) => {
    restarted = resolve
  })
  const updater = Object.assign(new EventEmitter(), {
    autoDownload: true,
    autoInstallOnAppQuit: true,
    allowPrerelease: false,
    setFeedURL: vi.fn(),
    checkForUpdates: vi.fn(async () => {}),
    downloadUpdate: vi.fn(async () => {
      downloadStarted()
    }),
    quitAndInstall: vi.fn(() => {
      restarted()
    }),
  })
  const choices: string[] = []
  const stopped = vi.fn()
  const updates = startUpdates({
    updater,
    packaged: true,
    enabled: true,
    choose: async (_message, action) => {
      choices.push(action)
      return true
    },
    every: () => stopped,
    warn: (error) => {
      throw error
    },
  })
  expect(updates.available).toBe(true)
  expect(updater.setFeedURL).toHaveBeenCalledWith({
    provider: 'github',
    owner: 'Firna-AI',
    repo: 'conducting-desktop',
  })
  expect(updater.autoDownload).toBe(false)
  expect(updater.autoInstallOnAppQuit).toBe(false)
  expect(updater.checkForUpdates).toHaveBeenCalledTimes(1)
  updater.emit('update-available', { version: '0.2.0' })
  await downloaded
  updater.emit('update-downloaded', { version: '0.2.0' })
  await restart
  expect(choices).toEqual(['Download', 'Restart now'])
  expect(updater.downloadUpdate).toHaveBeenCalledTimes(1)
  expect(updater.quitAndInstall).toHaveBeenCalledTimes(1)
  updates.stop()
  expect(stopped).toHaveBeenCalledTimes(1)
})
