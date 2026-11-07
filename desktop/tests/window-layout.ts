import { expect } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'

import { workspaceTitle } from './window-shell.js'

export async function box(locator: Locator) {
  await expect(locator).toBeVisible()
  const bounds = await locator.boundingBox()
  if (!bounds) throw new Error('The visible element has no bounds')
  return bounds
}

export async function expectDraggableHeader(heading: Locator) {
  // CSS drag regions and their bounds have no accessible state.
  await expect
    .poll(() =>
      heading.evaluate((element) => {
        const header = element.closest('header')
        if (!header) throw new Error('The page has no top bar')
        const bounds = header.getBoundingClientRect()
        return {
          top: bounds.y,
          height: bounds.height,
          drag: getComputedStyle(header).getPropertyValue('-webkit-app-region'),
        }
      }),
    )
    .toEqual({ top: 0, height: 34, drag: 'drag' })
}

export async function expectCornerLayout(page: Page, heading: Locator) {
  const controls = page.getByRole('navigation', { name: 'Window controls' })
  const rail = page.getByRole('navigation', { name: 'Orgs', exact: true })
  await expect
    .poll(async () => {
      const bar = await box(controls)
      const orgs = await box(rail)
      // The main header has no accessible role inside its page.
      const header = await heading.evaluate((element) => {
        const header = element.closest('header')
        if (!header) throw new Error('The page has no top bar')
        const { x, y } = header.getBoundingClientRect()
        return { x, y }
      })
      return {
        left: bar.x,
        top: bar.y,
        height: bar.height,
        railGap: orgs.y - bar.y - bar.height,
        headerGap: header.x - bar.x - bar.width,
        headerTop: header.y,
      }
    })
    .toEqual({
      left: 0,
      top: 0,
      height: 34,
      railGap: 0,
      headerGap: 0,
      headerTop: 0,
    })
  const bar = await box(controls)
  for (const name of ['Back', 'Forward']) {
    const button = await box(
      controls.getByRole('button', { name, exact: true }),
    )
    expect(button.x, `${name} left edge`).toBeGreaterThanOrEqual(bar.x)
    expect(button.y, `${name} top edge`).toBeGreaterThanOrEqual(bar.y)
    expect(button.x + button.width, `${name} right edge`).toBeLessThanOrEqual(
      bar.x + bar.width,
    )
    expect(button.y + button.height, `${name} bottom edge`).toBeLessThanOrEqual(
      bar.y + bar.height,
    )
  }
  const forward = await box(
    controls.getByRole('button', { name: 'Forward', exact: true }),
  )
  expect(bar.x + bar.width - forward.x - forward.width).toBeLessThanOrEqual(8)
}

export async function expectWindowLayout(page: Page) {
  const controls = page.getByRole('navigation', { name: 'Window controls' })
  const sidebar = page.getByRole('complementary', { name: 'Workspaces' })
  const forward = controls.getByRole('button', { name: 'Forward', exact: true })
  const back = controls.getByRole('button', { name: 'Back', exact: true })
  await expect
    .poll(async () => {
      const bar = await box(controls)
      const list = await box(sidebar)
      const main = await box(page.getByRole('main'))
      return {
        top: bar.y,
        height: bar.height,
        sidebarTop: list.y,
        mainTop: main.y,
        sidebarEdge: list.x + list.width - bar.x - bar.width,
        mainEdge: main.x - bar.x - bar.width,
      }
    })
    .toEqual({
      top: 0,
      height: 34,
      sidebarTop: 34,
      mainTop: 0,
      sidebarEdge: 0,
      mainEdge: 0,
    })
  const bar = await box(controls)
  const previous = await box(back)
  const next = await box(forward)
  expect(previous.y).toBe(next.y)
  expect(previous.x + previous.width).toBeLessThan(next.x)
  expect(bar.x + bar.width - next.x - next.width).toBeLessThanOrEqual(8)
  expect(bar.x + bar.width - next.x - next.width).toBeGreaterThanOrEqual(0)

  // The window drag contract is a Chromium CSS property, with no accessible state.
  await expect(controls).toHaveCSS('-webkit-app-region', 'drag')
  for (const button of await controls.getByRole('button').all()) {
    await expect(button).toHaveCSS('-webkit-app-region', 'no-drag')
  }
  await expectDraggableHeader(
    page.getByRole('heading', { name: workspaceTitle, exact: true }),
  )
  await expect(
    page.getByRole('button', { name: 'Archive workspace', exact: true }),
  ).toHaveCSS('-webkit-app-region', 'no-drag')
}
