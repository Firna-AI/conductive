import { expect } from '@playwright/test'
import type { Page } from '@playwright/test'

import { FIRST_TERMINAL_ID, terminalPaths } from '../../src/shared/terminal.ts'
import { FakeTerminal } from '../../src/test-support/fake-terminal.ts'
import { FakeTerminalSocket } from '../../src/test-support/fake-terminal-socket.ts'
import { FAKE_IDS } from '../../src/test-support/fixtures/core.ts'

export async function installWindowTerminal(page: Page) {
  const connected: FakeTerminal[] = []
  const path = terminalPaths.terminalSocket(
    FAKE_IDS.org,
    FAKE_IDS.workspace,
    FIRST_TERMINAL_ID,
  )
  await page.routeWebSocket(
    (url) => url.pathname === path,
    (route) => {
      const terminal = new FakeTerminal()
      const socket = new FakeTerminalSocket(FIRST_TERMINAL_ID, terminal)
      socket.binaryType = 'arraybuffer'
      socket.addEventListener('message', (event) => {
        if ('data' in event && event.data instanceof ArrayBuffer)
          route.send(Buffer.from(event.data))
      })
      let initialized = false
      route.onMessage((data) => {
        socket.send(typeof data === 'string' ? data : data.toString())
        if (initialized) return
        initialized = true
        connected.push(terminal)
      })
      route.onClose(() => socket.close())
    },
  )
  return {
    get connections() {
      return connected.length
    },
    emit(output: string) {
      const terminal = connected.at(-1)
      if (!terminal) throw new Error('The terminal has not connected.')
      terminal.emit(output)
    },
  }
}

export function terminalRows(page: Page) {
  // xterm's rendered rows have no accessible role or row-spacing state.
  return page
    .getByRole('complementary', { name: 'Files and tools', exact: true })
    .locator('.xterm-rows')
}

export async function terminalMetrics(page: Page) {
  const rows = terminalRows(page)
  await expect(rows).toBeVisible()
  return rows.evaluate((element) => {
    const first = element.children.item(0)
    const second = element.children.item(1)
    if (!first || !second) throw new Error('The terminal has no rendered rows.')
    return {
      rowPitch:
        second.getBoundingClientRect().y - first.getBoundingClientRect().y,
      fontSize: getComputedStyle(element).fontSize,
    }
  })
}
