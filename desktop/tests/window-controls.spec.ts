import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
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
  rightColumnLayout,
} from './window-layout.js'
import {
  launchWindow,
  openWindowWorkspace,
  workspacePath,
  workspaceTitle,
} from './window-shell.js'
import {
  installWindowTerminal,
  terminalMetrics,
  terminalRows,
} from './window-terminal.js'

const evidence = resolve(
  import.meta.dirname,
  '../../.context/hidden-terminal-line-spacing',
)

test('the bundled workspace aligns its draggable bars and keeps sidebar, right column, resize, and history controls working', async () => {
  await mkdir(evidence, { recursive: true })
  const profile = await mkdtemp(resolve(tmpdir(), 'window-controls-profile-'))
  let electron: ElectronApplication | undefined
  try {
    electron = await launchWindow(profile)
    const terminal = await installWindowTerminal(await electron.firstWindow())
    const page = await openWindowWorkspace(electron)
    await expect(terminalRows(page)).toContainText('Ready')
    await expect(page.getByText('Disconnected', { exact: true })).toHaveCount(0)
    const visibleTerminal = await terminalMetrics(page)
    expect(visibleTerminal.rowPitch).toBeGreaterThan(0)
    const visibleConnections = terminal.connections
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

    // The toggle at the end of the header gives the width of the right
    // column to the centre column, and takes it back.
    const hideColumn = page.getByRole('button', {
      name: 'Hide the right column',
      exact: true,
    })
    await expect(hideColumn).toHaveCSS('-webkit-app-region', 'no-drag')
    await expect
      .poll(() => rightColumnLayout(page, workspaceHeading))
      .toEqual({ shown: true, gap: 0 })
    await hideColumn.click()
    await expect
      .poll(() => rightColumnLayout(page, workspaceHeading))
      .toEqual({ shown: false, gap: 0 })
    await page
      .getByRole('button', { name: 'Show the right column', exact: true })
      .click()
    await expect
      .poll(() => rightColumnLayout(page, workspaceHeading))
      .toEqual({ shown: true, gap: 0 })

    await hideColumn.click()
    await expect
      .poll(() => rightColumnLayout(page, workspaceHeading))
      .toEqual({ shown: false, gap: 0 })
    await sidebar.getByRole('link', { name: 'Settings', exact: true }).click()
    await expect(page).toHaveURL(DESKTOP_ORIGIN + routes.settings(FAKE_IDS.org))
    // Settings opens as a dialog over the workspace. The page below keeps
    // its bar, so the window still drags by it. The page below is inert, so
    // a CSS locator finds its heading.
    const settings = page.getByRole('dialog', { name: 'Settings', exact: true })
    await expect(
      settings.getByRole('heading', { name: 'General', level: 1, exact: true }),
    ).toBeVisible()
    await expectDraggableHeader(
      page.locator('header h1', { hasText: workspaceTitle }).first(),
    )
    const deleteOrg = page.getByRole('button', {
      name: 'Delete org',
      exact: true,
    })
    await deleteOrg.click()
    const question = page.getByRole('dialog', {
      name: 'Delete Acme?',
      exact: true,
    })
    const confirmation = question.getByRole('textbox', {
      name: 'Type Acme to confirm',
      exact: true,
    })
    await expect(confirmation).toBeFocused()
    await page.keyboard.press('Shift+Tab')
    await expect(
      question.getByRole('button', { name: 'Cancel', exact: true }),
    ).toBeFocused()
    await confirmation.click()
    await page.keyboard.press('Escape')
    await expect(question).toBeHidden()
    await expect(deleteOrg).toBeFocused()
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
    await expect
      .poll(() => rightColumnLayout(page, workspaceHeading))
      .toEqual({ shown: false, gap: 0 })
    await expect.poll(() => terminal.connections).toBe(visibleConnections + 1)
    terminal.emit('Buffered while hidden\r\n')
    await page
      .getByRole('button', { name: 'Show the right column', exact: true })
      .click()
    await expect(terminalRows(page)).toContainText('Ready')
    await expect(terminalRows(page)).toContainText('Buffered while hidden')
    await expect(page.getByText('Disconnected', { exact: true })).toHaveCount(0)
    await expect.poll(() => terminalMetrics(page)).toEqual(visibleTerminal)
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
