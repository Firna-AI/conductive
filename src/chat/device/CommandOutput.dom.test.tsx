// @vitest-environment happy-dom
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import {
  byRole,
  queryByRole,
  queryByText,
} from '../../test-support/dom-queries'
import { mount, MOUNTED_TEST_TIMEOUT, press } from '../../test-support/mount'
import { CommandOutput } from './CommandOutput'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const long = Array.from({ length: 40 }, (_, line) => `line ${line + 1}`).join(
  '\n',
)

/**
 * A browser layout of the output, which happy-dom does not lay out: the
 * short box is 192 px high, and a long output needs 768 px.
 */
function layOut(): void {
  onTestFinished(() => {
    vi.restoreAllMocks()
  })
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(192)
  vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockImplementation(
    function (this: HTMLElement) {
      return (this.textContent?.length ?? 0) > 100 ? 768 : 19
    },
  )
}

/** The state of the button that shows or hides the rest of the output. */
function toggle(name: string): string | null {
  return byRole('button', name).getAttribute('aria-expanded')
}

describe('CommandOutput', () => {
  it('shows long output short, with Show all, and Show less makes it short again', async () => {
    layOut()
    await mount(<CommandOutput text={long} />)
    expect(document.querySelector('pre')?.textContent).toBe(long)
    expect(toggle('Show all')).toBe('false')
    await press(byRole('button', 'Show all'))
    expect(toggle('Show less')).toBe('true')
    await press(byRole('button', 'Show less'))
    expect(toggle('Show all')).toBe('false')
  })

  it('shows output that fits without a button', async () => {
    layOut()
    await mount(<CommandOutput text="2 passed (14.2s)" />)
    expect(queryByText('2 passed (14.2s)')).not.toBeNull()
    expect(queryByRole('button', 'Show all')).toBeNull()
  })
})
