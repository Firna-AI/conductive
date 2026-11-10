import { productName } from '../../docs/mockups/src/brand.js'

const UPDATE_FEED = {
  provider: 'github',
  owner: 'Firna-AI',
  repo: 'remote-code',
} as const

export interface Updater {
  autoDownload: boolean
  autoInstallOnAppQuit: boolean
  allowPrerelease: boolean
  setFeedURL(feed: typeof UPDATE_FEED): void
  checkForUpdates(): Promise<{ isUpdateAvailable: boolean } | null>
  quitAndInstall(): void
  on(
    event: 'update-downloaded',
    listener: (info: { version: string }) => void,
  ): unknown
  on(event: 'error', listener: (error: Error) => void): unknown
}

interface NativeUpdater {
  on(event: 'update-downloaded', listener: () => void): unknown
  on(event: 'error', listener: (error: Error) => void): unknown
}

type CheckOutcome = 'current' | 'downloading' | 'failed'

export function startUpdates(dependencies: {
  updater: Updater
  nativeUpdater: NativeUpdater
  packaged: boolean
  enabled: boolean
  choose(message: string, action: string): Promise<boolean>
  inform(message: string): Promise<void>
  every(callback: () => Promise<unknown>, milliseconds: number): () => void
  warn(error: unknown): void
}) {
  if (!dependencies.packaged || !dependencies.enabled)
    return { available: false, check() {}, stop() {} }
  const { updater, nativeUpdater } = dependencies
  updater.setFeedURL(UPDATE_FEED)
  updater.allowPrerelease = false
  updater.autoDownload = true
  updater.autoInstallOnAppQuit = true
  let checking: Promise<CheckOutcome> | undefined
  let waitingManualChecks = 0
  let downloadedVersion: string | undefined
  let readyVersion: string | undefined
  let dialog: Promise<void> | undefined
  const offered = new Set<string>()
  const readyDialogs = new Map<string, Promise<void>>()

  const enqueue = (show: () => Promise<void>) => {
    const safely = async () => {
      try {
        await show()
      } catch (error) {
        dependencies.warn(error)
      }
    }
    const next = dialog ? dialog.then(safely) : safely()
    dialog = next
    void next.then(() => {
      if (dialog === next) dialog = undefined
    })
    return next
  }
  const offer = (version: string, manual = false): Promise<void> => {
    const pending = readyDialogs.get(version)
    if (pending) return pending
    if (!manual && (offered.has(version) || readyDialogs.size > 0))
      return Promise.resolve()
    offered.add(version)
    const shown = enqueue(async () => {
      if (await dependencies.choose('The update is ready.', 'Restart now'))
        updater.quitAndInstall()
    }).then(() => {
      readyDialogs.delete(version)
    })
    readyDialogs.set(version, shown)
    return shown
  }
  const updateFailed = (error: Error) => {
    dependencies.warn(error)
  }
  updater.on('error', updateFailed)
  nativeUpdater.on('error', updateFailed)
  updater.on('update-downloaded', ({ version }) => {
    downloadedVersion = version
  })
  nativeUpdater.on('update-downloaded', () => {
    if (!downloadedVersion) return
    readyVersion = downloadedVersion
    if (waitingManualChecks === 0) void offer(readyVersion)
  })

  const query = async (): Promise<CheckOutcome> => {
    try {
      const result = await updater.checkForUpdates()
      if (!result) return 'failed'
      return result.isUpdateAvailable ? 'downloading' : 'current'
    } catch (error) {
      dependencies.warn(error)
      return 'failed'
    }
  }
  const automaticCheck = () => {
    checking ??= query().finally(() => {
      checking = undefined
    })
    return checking
  }
  const check = async () => {
    if (readyVersion) return offer(readyVersion, true)
    waitingManualChecks++
    const outcome = await automaticCheck()
    waitingManualChecks--
    if (readyVersion) return offer(readyVersion, true)
    const answers = {
      current: `${productName} is up to date.`,
      downloading: `Downloading the new version. ${productName} tells you when it is ready.`,
      failed: `${productName} could not check for updates. Try again later.`,
    }
    await enqueue(() => dependencies.inform(answers[outcome]))
  }
  void automaticCheck()
  return {
    available: true,
    check,
    stop: dependencies.every(automaticCheck, 4 * 60 * 60 * 1000),
  }
}
