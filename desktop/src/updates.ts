export const UPDATE_FEED = {
  provider: 'github',
  owner: 'Firna-AI',
  repo: 'conducting-desktop',
} as const

export interface Updater {
  autoDownload: boolean
  autoInstallOnAppQuit: boolean
  allowPrerelease: boolean
  setFeedURL(feed: typeof UPDATE_FEED): void
  checkForUpdates(): Promise<unknown>
  downloadUpdate(): Promise<unknown>
  quitAndInstall(): void
  on(
    event: 'update-available' | 'update-downloaded',
    listener: (info: { version: string }) => void,
  ): unknown
  on(event: 'error', listener: (error: Error) => void): unknown
}

/** The feed remains inert until a published build explicitly enables it. */
export function startUpdates(dependencies: {
  updater: Updater
  packaged: boolean
  enabled: boolean
  choose(message: string, action: string): Promise<boolean>
  every(callback: () => void, milliseconds: number): () => void
  warn(error: unknown): void
}) {
  if (!dependencies.packaged || !dependencies.enabled)
    return { available: false, check() {}, stop() {} }
  const { updater } = dependencies
  updater.setFeedURL(UPDATE_FEED)
  updater.allowPrerelease = true
  updater.autoDownload = false
  updater.autoInstallOnAppQuit = false
  let checking = false
  let offered = false
  updater.on('error', dependencies.warn)
  updater.on('update-available', () => {
    if (offered) return
    offered = true
    void dependencies
      .choose('An update is available.', 'Download')
      .then(async (accepted) => {
        if (accepted) await updater.downloadUpdate()
      })
      .catch(dependencies.warn)
  })
  updater.on('update-downloaded', () => {
    void dependencies
      .choose('The update is ready.', 'Restart now')
      .then((accepted) => {
        if (accepted) updater.quitAndInstall()
      })
      .catch(dependencies.warn)
  })
  const check = () => {
    if (checking) return
    checking = true
    void updater
      .checkForUpdates()
      .catch(dependencies.warn)
      .finally(() => {
        checking = false
      })
  }
  check()
  return {
    available: true,
    check,
    stop: dependencies.every(check, 4 * 60 * 60 * 1000),
  }
}
