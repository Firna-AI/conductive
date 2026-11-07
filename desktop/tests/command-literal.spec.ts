import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { resolve } from 'node:path'
import { _electron, expect, test } from '@playwright/test'
import type { ElectronApplication, Page } from '@playwright/test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { LiteralText } from '../../src/chat/device/LiteralText.js'

/** A comment, then a second command on its own line, a tab, and two spaces. */
const comment = 'printf safe # display comment\nprintf SECOND\tX  Y'
/** A no-break space before `#`: the shell reads `hi #` as one word. */
const spoof = 'echo hi\u00A0#; echo RAN'
/** Hidden characters that a copy keeps, with a right-to-left override. */
const hidden = 'printf A\u200B\u202Ez\u001B #'
const texts = [comment, spoof, hidden]

/** Selects the whole text of one literal, as a person does before a copy. */
async function selectLiteral(page: Page, index: number): Promise<void> {
  await page.evaluate((at) => {
    const node = document.querySelectorAll('#literal-probe code')[at]
    const selection = document.getSelection()
    if (!node || !selection) throw new Error('The literal is not on the page')
    const range = document.createRange()
    range.selectNodeContents(node)
    selection.removeAllRanges()
    selection.addRange(range)
  }, index)
}

test('the Mac app shows each literal command as the Mac runs it, and a copy keeps the original text', async () => {
  const desktop = resolve(import.meta.dirname, '..')
  const evidence = resolve(desktop, '../.context/boat-native-remote-workspaces')
  await mkdir(evidence, { recursive: true })
  const profile = await mkdtemp(resolve(evidence, 'literal-profile-'))
  let electron: ElectronApplication | undefined
  try {
    electron = await _electron.launch({
      args: ['.', `--user-data-dir=${profile}`],
      cwd: desktop,
    })
    const app = electron
    const page = await app.firstWindow()
    const markup = renderToStaticMarkup(
      createElement(
        'div',
        { id: 'literal-probe' },
        texts.map((text) => createElement(LiteralText, { key: text, text })),
      ),
    )
    await page.evaluate(
      (html) => document.body.insertAdjacentHTML('beforeend', html),
      markup,
    )
    const literals = page.locator('#literal-probe code')
    await expect(literals).toHaveCount(texts.length)

    const shown = await literals.evaluateAll((nodes: HTMLElement[]) =>
      nodes.map((node) => node.innerText),
    )
    expect(shown).toEqual(texts)

    const markOf = (index: number, code: string) =>
      literals.nth(index).evaluate((node: HTMLElement, wanted: string) => {
        const first = node.firstChild
        const marked = node.querySelector(`[data-literal-code="${wanted}"]`)
        if (!(first instanceof Text) || !marked) {
          return { label: 'no mark', width: 0, letter: 0 }
        }
        const letter = document.createRange()
        letter.setStart(first, 0)
        letter.setEnd(first, 1)
        return {
          label: getComputedStyle(marked, '::before').content,
          width: marked.getClientRects()[0]?.width ?? 0,
          letter: letter.getBoundingClientRect().width,
        }
      }, code)
    for (const [index, code] of [
      [0, 'U+000A'],
      [1, 'U+00A0'],
    ] as const) {
      const mark = await markOf(index, code)
      expect(mark.label).toBe(`"${code}"`)
      expect(mark.width).toBeGreaterThan(mark.letter * 4)
    }

    const order = await literals.nth(2).evaluate((node: HTMLElement) => {
      const x = (letter: string): number => {
        const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT)
        for (let text = walker.nextNode(); text; text = walker.nextNode()) {
          const at = text.textContent?.indexOf(letter) ?? -1
          if (at < 0) continue
          const range = document.createRange()
          range.setStart(text, at)
          range.setEnd(text, at + 1)
          return range.getBoundingClientRect().x
        }
        throw new Error(`The literal has no ${letter}`)
      }
      return { z: x('z'), hash: x('#') }
    })
    expect(order.z).toBeLessThan(order.hash)

    for (const index of [0, 2]) {
      await app.evaluate(({ clipboard }) => clipboard.writeText(''))
      await selectLiteral(page, index)
      await app.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows()[0]?.webContents.copy(),
      )
      await expect
        .poll(() => app.evaluate(({ clipboard }) => clipboard.readText()))
        .toBe(texts[index])
    }
  } finally {
    await electron?.close()
    await rm(profile, { recursive: true, force: true })
  }
})
