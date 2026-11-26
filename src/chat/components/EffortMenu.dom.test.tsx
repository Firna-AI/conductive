// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import type { AgentChoice } from '../../shared/generated/AgentChoice'
import { TouchScreen } from '../../ui/components/common/touch'
import {
  accessibleName,
  byRole,
  queryByRole,
} from '../../test-support/dom-queries'
import { mount, press } from '../../test-support/mount'
import {
  opus,
  rows,
  Session,
  triggerOf,
  triggerWords,
} from './model-picker-test-kit'

/** What a screen reader says for the element with the focus. */
function focused(): string {
  return accessibleName(document.activeElement ?? document.body)
}

/** The names of the rows of the open model menu. */
function names(): string[] {
  return rows().map((row) => row.name)
}

describe('Effort in the model menu of a session', () => {
  it('shows the current effort in its row, opens its efforts with the current one marked and focused, and a pick changes only the effort and closes the menu', async () => {
    const sent: AgentChoice[] = []
    const view = await mount(<Session sent={sent} start={opus} />)
    await press(triggerOf(view))
    const before = names()
    await press(byRole('menuitem', 'Effort High'))
    const opened = { rows: rows('Effort'), focus: focused() }
    await press(byRole('menuitemradio', 'Low'))
    const closed = queryByRole('menu', 'Model and effort')
    const trigger = triggerWords(view).name
    await press(triggerOf(view))
    expect({ before, opened, sent, closed, trigger, after: names() }).toEqual({
      before: ['All models', 'Effort High', 'Fast'],
      opened: {
        rows: [
          { role: 'menuitemradio', name: 'Low', on: 'false' },
          { role: 'menuitemradio', name: 'High', on: 'true' },
        ],
        focus: 'High',
      },
      sent: [{ ...opus, effort: 'low' }],
      closed: null,
      trigger: 'Model and effort: Opus 5.5, Low',
      after: ['All models', 'Effort Low', 'Fast'],
    })
  })

  it('shows its efforts in place of the menu in the phone layout, with Back at its top', async () => {
    const view = await mount(
      <TouchScreen>
        <Session sent={[]} start={opus} />
      </TouchScreen>,
    )
    await press(triggerOf(view))
    await press(byRole('menuitem', 'Effort High'))
    const list = {
      menu: queryByRole('menu', 'Model and effort'),
      rows: rows('Effort'),
    }
    await press(byRole('menuitem', 'Back'))
    expect({ list, back: focused() }).toEqual({
      list: {
        menu: null,
        rows: [
          { role: 'menuitem', name: 'Back', on: null },
          { role: 'menuitemradio', name: 'Low', on: 'false' },
          { role: 'menuitemradio', name: 'High', on: 'true' },
        ],
      },
      back: 'Effort High',
    })
  })
})
