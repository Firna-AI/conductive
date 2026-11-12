// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest'
import type { DeviceApprovalAction } from '../../shared/device'
import {
  accessibleName,
  byRole,
  queryByRole,
} from '../../test-support/dom-queries'
import {
  holdAnimationFrames,
  mount,
  MOUNTED_TEST_TIMEOUT,
  press,
  pressKey,
} from '../../test-support/mount'
import { CommandChoices } from './CommandChoices'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

/** A Firna button marks itself with `aria-disabled`, a native one with `disabled`. */
const blocked = (element: Element) =>
  element.getAttribute('aria-disabled') === 'true' ||
  element.hasAttribute('disabled')

/** Each row of the open menu: its name, and the scope that describes it. */
function rows() {
  return Array.from(document.querySelectorAll('[role="menuitem"]'), (row) => ({
    name: accessibleName(row),
    scope: document.getElementById(row.getAttribute('aria-describedby') ?? '')
      ?.textContent,
  }))
}

describe('CommandChoices', () => {
  it('opens the other ways to allow from the arrow, sends the chosen one, and then blocks every choice', async () => {
    holdAnimationFrames()
    const answers: DeviceApprovalAction[] = []
    const answer = (action: DeviceApprovalAction) => answers.push(action)
    const view = await mount(
      <CommandChoices answering={null} onAnswer={answer} />,
    )
    await press(byRole('button', 'More ways to allow'))
    expect(rows()).toEqual([
      { name: 'Always allow', scope: 'This exact command, on this Mac' },
      {
        name: 'Allow all commands for 15 minutes',
        scope: 'Every command from this workspace, on this Mac',
      },
      {
        name: 'Allow all commands until I stop',
        scope: 'Every command from this workspace, on this Mac, until you stop',
      },
    ])
    expect(document.activeElement).toBe(byRole('menuitem', 'Always allow'))
    await pressKey('ArrowDown')
    expect(document.activeElement).toBe(
      byRole('menuitem', 'Allow all commands for 15 minutes'),
    )

    await pressKey('ArrowDown')
    expect(document.activeElement).toBe(
      byRole('menuitem', 'Allow all commands until I stop'),
    )

    await press(byRole('menuitem', 'Allow all commands until I stop'))
    expect(answers).toEqual(['allow-workspace-until-stop'])
    expect(queryByRole('menu', 'More ways to allow')).toBeNull()

    await view.rerender(
      <CommandChoices
        answering="allow-workspace-until-stop"
        onAnswer={answer}
      />,
    )
    for (const name of ['Deny', 'More ways to allow']) {
      expect(blocked(byRole('button', name)), name).toBe(true)
    }
  })
})
