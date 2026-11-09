// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest'
import styles from '../../../docs/mockups/src/components/workspace/WorkspaceTabs.module.css'
import { byRole } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { MOUNTED_TEST_TIMEOUT } from '../../test-support/mount'
import { first, mountChat, second } from './tab-drag-test-kit'
import { fillRow, tabList, turnWheel } from './tab-row-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

describe('a full tab row', () => {
  it('scrolls sideways on a vertical wheel turn, leaves a sideways swipe and a turn past its end to the browser, and fades each end that clips tabs', async () => {
    await mountChat({
      server: new FakeApiServer(),
      tabs: [first, second],
      viewport: 'desktop',
    })
    const list = tabList()
    const tab = byRole('button', 'Debounce lookups')
    // 200 px of a row whose tabs take 500 px: it scrolls up to 300 px.
    fillRow(list, 200, 500)
    const steps: { left: number; free: boolean; fades: string[] }[] = []
    const turn = (init: WheelEventInit) => {
      const free = turnWheel(tab, init)
      const fades = [
        list.classList.contains(styles.fadeStart) ? 'start' : null,
        list.classList.contains(styles.fadeEnd) ? 'end' : null,
      ].filter((fade) => fade !== null)
      steps.push({ left: list.scrollLeft, free, fades })
    }

    turn({ deltaY: 100 })
    turn({ deltaX: 60, deltaY: 10 })
    turn({ deltaY: 400 })
    turn({ deltaY: 100 })
    turn({ deltaY: -1000 })

    expect(steps).toEqual([
      { left: 100, free: false, fades: ['start', 'end'] },
      { left: 100, free: true, fades: ['start', 'end'] },
      { left: 300, free: false, fades: ['start'] },
      { left: 300, free: true, fades: ['start'] },
      { left: 0, free: false, fades: ['end'] },
    ])
  })
})
