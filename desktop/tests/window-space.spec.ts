import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { _electron, expect, test } from '@playwright/test'
import type { ElectronApplication } from '@playwright/test'

import { readConfiguration } from '../src/config.js'
import { sessionEndpoint } from './sign-in-journey.js'

const desktop = resolve(import.meta.dirname, '..')
const evidence = resolve(desktop, '../.context/boat-native-remote-workspaces')

test.skip(process.platform !== 'darwin', 'Native window buttons require macOS.')

async function setFullScreen(electron: ElectronApplication, enabled: boolean) {
  return electron.evaluate(
    ({ BrowserWindow }, fullScreen) =>
      new Promise<{ event: string; isFullScreen: boolean }>((resolve) => {
        const window = BrowserWindow.getAllWindows()[0]
        const event = fullScreen ? 'enter-full-screen' : 'leave-full-screen'
        const complete = () =>
          resolve({ event, isFullScreen: window.isFullScreen() })
        if (fullScreen) window.once('enter-full-screen', complete)
        else window.once('leave-full-screen', complete)
        window.setFullScreen(fullScreen)
      }),
    enabled,
  )
}

test('gives back native window-button space in full screen and restores it afterward', async () => {
  await mkdir(evidence, { recursive: true })
  const profile = await mkdtemp(
    resolve(evidence, 'desktop-window-space-profile-'),
  )
  const packaged = process.env.CONDUCTING_PACKAGED_APP
  const stages: {
    stage: 'normal' | 'full-screen' | 'restored'
    isFullScreen: boolean
    widths: number[]
  }[] = []
  const transitions: { event: string; isFullScreen: boolean }[] = []
  let electron: ElectronApplication | undefined
  let failure: string | null = null
  try {
    electron = await _electron.launch({
      ...(packaged ? { executablePath: packaged } : {}),
      args: [...(packaged ? [] : ['.']), `--user-data-dir=${profile}`],
      cwd: desktop,
    })
    const page = await electron.firstWindow()
    const configuration: unknown = JSON.parse(
      await readFile(resolve(desktop, 'dist/bundle/build-config.json'), 'utf8'),
    )
    const shellSession = await sessionEndpoint(
      page,
      readConfiguration(configuration).appOrigin,
    )
    await shellSession(false)
    // This decorative reserve has no accessible name and can have zero height.
    const reserve = page.locator('[data-desktop-window-space]')
    await expect(reserve).toHaveCount(1)
    const measure = async (
      stage: (typeof stages)[number]['stage'],
      isFullScreen: boolean,
      expectedWidth: number,
    ) => {
      const sample: (typeof stages)[number] = {
        stage,
        isFullScreen,
        widths: [],
      }
      stages.push(sample)
      await expect
        .poll(async () => {
          const width = await reserve.evaluate(
            (element) => element.getBoundingClientRect().width,
          )
          sample.widths.push(width)
          return width
        })
        .toBe(expectedWidth)
    }
    const initialFullScreen = await electron.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()[0].isFullScreen(),
    )
    expect(initialFullScreen).toBe(false)
    await measure('normal', initialFullScreen, 64)
    const entered = await setFullScreen(electron, true)
    transitions.push(entered)
    expect(entered.isFullScreen).toBe(true)
    await measure('full-screen', entered.isFullScreen, 0)
    const left = await setFullScreen(electron, false)
    transitions.push(left)
    expect(left.isFullScreen).toBe(false)
    await measure('restored', left.isFullScreen, 64)
  } catch (error) {
    failure =
      error instanceof Error ? (error.stack ?? error.message) : String(error)
    throw error
  } finally {
    try {
      await writeFile(
        resolve(
          evidence,
          `desktop-window-space-${process.arch}-${packaged ? 'packaged' : 'source'}.json`,
        ),
        JSON.stringify(
          { platform: process.platform, stages, transitions, failure },
          null,
          2,
        ) + '\n',
      )
    } finally {
      try {
        await electron?.close()
      } finally {
        await rm(profile, { recursive: true, force: true })
      }
    }
  }
})
