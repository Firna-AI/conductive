// @vitest-environment happy-dom

import { describe, expect, it, vi } from 'vitest'
import { MemoryStorage } from '../../app/test-kit'
import { PaneSplit } from '../../app/pane-split'
import { byRole } from '../../test-support/dom-queries'
import { MOUNTED_TEST_TIMEOUT } from '../../test-support/mount'
import { mountSplit, paneOn } from './split-test-kit'
import { pointer } from './tab-drag-test-kit'
import { pressOn } from './tab-row-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const mouse = { pointerType: 'mouse' }

/**
 * Gives the column of the panes and the left pane the widths that a
 * browser lays out, which happy-dom does not: the left pane takes `share`
 * percent of a column `width` px wide.
 */
function layOut(share: number, width = 1000) {
  const left = paneOn('left')
  const column = left.parentElement
  if (!column) throw new Error('The left pane is in no column.')
  Object.defineProperty(column, 'clientWidth', {
    configurable: true,
    value: width,
  })
  Object.defineProperty(left, 'clientWidth', {
    configurable: true,
    value: (share / 100) * width,
  })
}

/** The share of the column that the left pane takes, as its style says. */
const leftBasis = () => paneOn('left').style.flex

describe('the divider between the panes', () => {
  it('moves the split with the keys and the pointer from the share that shows, stops where a pane gets narrower than 320 px, keeps half of a narrow column, and keeps the share for the next page load', async () => {
    const storage = new MemoryStorage()
    await mountSplit({ storage })
    const divider = byRole('separator', 'Resize the panes')
    const steps: string[] = [leftBasis()]
    const key = (name: string, shown: number, init = {}) => {
      layOut(shown)
      pressOn(divider, name, init)
      steps.push(leftBasis())
    }
    key('ArrowRight', 50)
    key('ArrowLeft', 50.8, { shiftKey: true })
    key('Home', 47.6)
    key('End', 32)
    layOut(67.9)
    pointer(divider, 'pointerdown', { ...mouse, clientX: 700 })
    pointer(divider, 'pointermove', { ...mouse, clientX: 100 })
    pointer(divider, 'pointerup', { ...mouse, clientX: 100, buttons: 0 })
    steps.push(leftBasis())
    layOut(50, 600)
    pressOn(divider, 'End')
    steps.push(leftBasis())
    expect({
      steps,
      reloaded: new PaneSplit(storage).share.get(),
    }).toEqual({
      steps: [
        '',
        '0 1 50.8%',
        '0 1 47.6%',
        '0 1 32%',
        '0 1 67.9%',
        '0 1 32%',
        '0 1 32%',
      ],
      reloaded: 32,
    })
  })
})
