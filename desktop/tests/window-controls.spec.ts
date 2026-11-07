import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import type { ElectronApplication } from '@playwright/test'

import { routes } from '../../src/app/router.ts'
import { FAKE_IDS } from '../../src/test-support/fixtures/core.ts'
import { DESKTOP_ORIGIN } from '../../worker/security/desktop-contract.js'
import {
  box,
  expectCornerLayout,
  expectDraggableHeader,
  expectWindowLayout,
} from './window-layout.js'
import {
  evidence,
  launchWindow,
  openWindowWorkspace,
  workspacePath,
  workspaceTitle,
} from './window-shell.js'

test('the bundled workspace aligns its draggable bars and keeps sidebar, resize, and history controls working', async () => {
  await mkdir(evidence, { recursive: true })
  const profile = await mkdtemp(resolve(evidence, 'window-controls-profile-'))
  let electron: ElectronApplication | undefined
  try {
    electron = await launchWindow(profile)
    const page = await openWindowWorkspace(electron)
    await expectWindowLayout(page)
    const controls = page.getByRole('navigation', { name: 'Window controls' })
    const sidebar = page.getByRole('complementary', { name: 'Workspaces' })
    const workspaceHeading = page.getByRole('heading', {
      name: workspaceTitle,
      exact: true,
    })
    const before = await box(controls)
    await page.getByRole('separator', { name: 'Resize the sidebar' }).focus()
    await page.keyboard.press('ArrowRight')
    await expect
      .poll(async () => (await box(controls)).width)
      .toBeGreaterThan(before.width)
    await expectWindowLayout(page)

    await controls.getByRole('button', { name: 'Hide the sidebar' }).click()
    await expect(sidebar).toBeHidden()
    await expectCornerLayout(page, workspaceHeading)
    await controls.getByRole('button', { name: 'Show the sidebar' }).click()
    await expect(sidebar).toBeVisible()
    await expectWindowLayout(page)

    await sidebar.getByRole('link', { name: 'Settings', exact: true }).click()
    await expect(page).toHaveURL(DESKTOP_ORIGIN + routes.settings(FAKE_IDS.org))
    const settingsTitle = page.getByRole('heading', {
      name: 'Acme',
      level: 1,
      exact: true,
    })
    await expect(settingsTitle).toBeVisible()
    await expectDraggableHeader(settingsTitle)
    const back = controls.getByRole('button', { name: 'Back', exact: true })
    const forward = controls.getByRole('button', {
      name: 'Forward',
      exact: true,
    })
    await expect(back).toBeEnabled()
    await expect(forward).toBeDisabled()
    await back.click()
    await expect(page).toHaveURL(DESKTOP_ORIGIN + workspacePath)
    await expect(
      page.getByRole('heading', { name: workspaceTitle, exact: true }),
    ).toBeVisible()
    await expect(forward).toBeEnabled()
    await forward.click()
    await expect(page).toHaveURL(DESKTOP_ORIGIN + routes.settings(FAKE_IDS.org))
    await expect(forward).toBeDisabled()
    await back.click()
    await expect(page).toHaveURL(DESKTOP_ORIGIN + workspacePath)

    await electron.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows()[0].setContentSize(1000, 740)
    })
    // A native resize has no accessible state. Read the rendered viewport.
    await expect.poll(() => page.evaluate(() => innerWidth)).toBe(1000)
    await expectWindowLayout(page)
    await page.screenshot({
      path: resolve(
        evidence,
        `desktop-window-controls-${process.platform}-${process.arch}.png`,
      ),
    })

    await electron.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows()[0].setContentSize(860, 740)
    })
    await expect.poll(() => page.evaluate(() => innerWidth)).toBe(860)
    await expect(sidebar).toBeHidden()
    await expect(
      controls.getByRole('button', { name: 'Hide the sidebar' }),
    ).toBeDisabled()
    await expectCornerLayout(page, workspaceHeading)

    await electron.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows()[0].setContentSize(1000, 740)
    })
    await expect.poll(() => page.evaluate(() => innerWidth)).toBe(1000)
    await expectWindowLayout(page)
    await page.goto(DESKTOP_ORIGIN + routes.getStarted())
    const getStarted = page.getByRole('heading', {
      name: 'Get started',
      level: 1,
      exact: true,
    })
    await expect(getStarted).toBeVisible()
    await expect(sidebar).toHaveCount(0)
    await expect(
      controls.getByRole('button', { name: 'Hide the sidebar' }),
    ).toBeDisabled()
    await expectCornerLayout(page, getStarted)
  } finally {
    await electron?.close()
    await rm(profile, { recursive: true, force: true })
  }
})
