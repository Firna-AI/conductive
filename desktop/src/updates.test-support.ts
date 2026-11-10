import { EventEmitter } from 'node:events'
import { vi } from 'vitest'

export function deferred<T>() {
  let resolve: (value: T) => void = () => {
    throw new Error('Promise is not arranged')
  }
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

export function updateHarness() {
  const updater = Object.assign(new EventEmitter(), {
    autoDownload: false,
    autoInstallOnAppQuit: false,
    allowPrerelease: true,
    setFeedURL: vi.fn(),
    checkForUpdates: vi.fn(async () => ({ isUpdateAvailable: false })),
    quitAndInstall: vi.fn(),
  })
  const nativeUpdater = new EventEmitter()
  const dependencies = {
    updater,
    nativeUpdater,
    packaged: true,
    enabled: true,
    choose: vi.fn(async () => false),
    inform: vi.fn<(message: string) => Promise<void>>(async () => {}),
    every: vi.fn<(callback: () => void, milliseconds: number) => () => void>(
      () => vi.fn(),
    ),
    warn: vi.fn(),
  }
  return { updater, nativeUpdater, dependencies }
}
