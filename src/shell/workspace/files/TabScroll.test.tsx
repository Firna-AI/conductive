// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, onTestFinished, test, vi } from 'vitest'
import { routes } from '../../../app/router'
import type { FilesTab } from '../../../files/navigation'
import { queryByRole } from '../../../test-support/dom-queries'
import { FakeApiServer } from '../../../test-support/fake-api'
import { FAKE_IDS } from '../../../test-support/fixtures/core'
import { FAKE_FILE_PATH } from '../../../test-support/fixtures/tools'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
  waitFor,
} from '../../../test-support/mount'
import { settle } from '../../test-mount'
import { openTab } from '../wiring-test-kit'
import { filesHref } from './files-address'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org, workspace: id } = FAKE_IDS
const fileName = 'AddressForm.tsx'
const fileTab: FilesTab = {
  kind: 'file',
  path: FAKE_FILE_PATH,
  mode: 'preview',
}
const diffTab: FilesTab = { kind: 'diff', path: FAKE_FILE_PATH }

/**
 * Gives each element a scroll position that a browser keeps, because
 * happy-dom lays out nothing. Each new element starts at the top.
 */
function keepScrollPositions() {
  const positions = new WeakMap<Element, number>()
  const saved = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollTop')
  if (!saved) throw new Error('happy-dom has no scrollTop')
  Object.defineProperty(Element.prototype, 'scrollTop', {
    configurable: true,
    get(this: Element) {
      return positions.get(this) ?? 0
    },
    set(this: Element, value: number) {
      positions.set(this, Math.max(0, value))
    },
  })
  onTestFinished(() => {
    Object.defineProperty(Element.prototype, 'scrollTop', saved)
  })
}

/** The scroll box of the code or the diff of the shown page, once it shows. */
function pageBox(view: HTMLElement): Promise<HTMLElement> {
  return waitFor(() => {
    const page = queryByRole('region', fileName, view)
    const box = page?.querySelector('pre')?.parentElement
    return box instanceof HTMLElement ? box : null
  }, 'the code of the page')
}

/** Scrolls the box of the shown page as the reader does. */
async function read(view: HTMLElement, top: number) {
  const box = await pageBox(view)
  box.dispatchEvent(new Event('wheel'))
  box.scrollTop = top
  box.dispatchEvent(new Event('scroll'))
}

describe('the scroll offset of the file and diff tabs of the workspace', () => {
  test('each tab gives back its offset after the other tab and the chat showed', async () => {
    holdAnimationFrames()
    keepScrollPositions()
    const server = new FakeApiServer()
    const file = filesHref(org, id, fileTab)
    const diff = filesHref(org, id, diffTab)
    const { view, navigation } = await openTab(server, file)
    await settle()
    const show = async (href: string) => {
      act(() => navigation.push(href))
      await settle()
    }
    await read(view, 240)
    await show(diff)
    expect((await pageBox(view)).scrollTop).toBe(0)
    await read(view, 90)

    await show(routes.workspace(org, id))
    await show(file)
    const fileTop = (await pageBox(view)).scrollTop
    await show(diff)
    const diffTop = (await pageBox(view)).scrollTop
    expect({ fileTop, diffTop }).toEqual({
      fileTop: 240,
      diffTop: 90,
    })
  })
})
