// @vitest-environment happy-dom
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import {
  byRole,
  queryByRole,
  queryByText,
} from '../../test-support/dom-queries'
import { mount, MOUNTED_TEST_TIMEOUT, press } from '../../test-support/mount'
import { AllowedCommand } from './AllowedCommand'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const long = `set -e; echo '${'H4sICB3p9GoCA2dyaWQxMS1tYWMuaHRtbA'.repeat(20)}' | base64 -d`

/**
 * A browser layout of the command, which happy-dom does not lay out: the
 * short box is 63 px high, and a long command needs 400 px.
 */
function layOut(): void {
  onTestFinished(() => {
    vi.restoreAllMocks()
  })
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(63)
  vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockImplementation(
    function (this: HTMLElement) {
      return (this.textContent?.length ?? 0) > 100 ? 400 : 21
    },
  )
}

/** The state of the button that shows or hides the rest of the command. */
function toggle(name: string): string | null {
  return byRole('button', name).getAttribute('aria-expanded')
}

describe('AllowedCommand', () => {
  it('shows a long command short, with Show all, and Show less makes it short again', async () => {
    layOut()
    await mount(<AllowedCommand command={long} />)
    expect(queryByText(long)?.tagName).toBe('CODE')
    expect(toggle('Show all')).toBe('false')
    await press(byRole('button', 'Show all'))
    expect(toggle('Show less')).toBe('true')
    await press(byRole('button', 'Show less'))
    expect(toggle('Show all')).toBe('false')
  })

  it('shows a command that fits without a button', async () => {
    layOut()
    await mount(<AllowedCommand command="git status" />)
    expect(queryByText('git status')).not.toBeNull()
    expect(queryByRole('button', 'Show all')).toBeNull()
  })
})
