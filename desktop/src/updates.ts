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
  updater.autoDownload = true
  updater.autoInstallOnAppQuit = true
  let checking = false
  let dialogOpen = false
  const offered = new Set<string>()
  updater.on('error', dependencies.warn)
  const offer = async ({ version }: { version: string }) => {
    if (dialogOpen || offered.has(version)) return
    offered.add(version)
    dialogOpen = true
    try {
      if (await dependencies.choose('The update is ready.', 'Restart now'))
        updater.quitAndInstall()
    } catch (error) {
      dependencies.warn(error)
    } finally {
      dialogOpen = false
    }
  }
  updater.on('update-downloaded', (info) => {
    void offer(info)
  })
  const check = async () => {
    if (checking) return
    checking = true
    try {
      await updater.checkForUpdates()
    } catch (error) {
      dependencies.warn(error)
    } finally {
      checking = false
    }
  }
  void check()
  return {
    available: true,
    check,
    stop: dependencies.every(check, 4 * 60 * 60 * 1000),
  }
}
