import { createServer } from 'vite'

/** @typedef {{ port?: number, assetsDirectory?: string }} HarnessOptions */
/** @typedef {{ closed: Promise<void> }} BrowserHarness */
/** @typedef {(options: HarnessOptions) => Promise<BrowserHarness>} StartHarness */

/** @param {unknown} value @returns {value is StartHarness} */
function isStartHarness(value) {
  return typeof value === 'function'
}

/** @returns {number | undefined} */
function harnessPort() {
  const input = process.env.CHAT_HARNESS_PORT
  if (input === undefined) return undefined
  const port = Number(input)
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535)
    throw new Error('Choose a port from 1 to 65535.')
  return port
}

async function main() {
  const port = harnessPort()
  const loader = await createServer({
    configFile: false,
    logLevel: 'silent',
    server: { middlewareMode: true, hmr: false },
  })
  try {
    const loaded = await loader.ssrLoadModule(
      '/worker/chat/integration/browser-server.test-support.ts',
    )
    /** @type {unknown} */
    const start = loaded.startBrowserHarness
    if (!isStartHarness(start))
      throw new Error('The browser harness entry is unavailable.')
    const fixture = await start({
      assetsDirectory: process.env.CHAT_HARNESS_ASSETS || 'dist/client',
      port,
    })
    await fixture.closed
  } finally {
    await loader.close()
  }
}

try {
  await main()
} catch {
  console.error('The browser harness could not start. Check its settings.')
  process.exitCode = 1
}
