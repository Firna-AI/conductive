// @vitest-environment happy-dom

import { describe, expect, test } from 'vitest'
import type { AgentChoice } from '../../shared/generated/AgentChoice'
import {
  opus,
  rows,
  triggerOf,
  triggerWords,
} from '../../chat/components/model-picker-test-kit'
import { byRole } from '../../test-support/dom-queries'
import { mount, press } from '../../test-support/mount'
import { Form, mutedWords } from './model-picker-test-kit'

const opusLowFast: AgentChoice = { ...opus, effort: 'low', fast: true }
const solHigh: AgentChoice = {
  agent: 'codex',
  model: 'sol',
  effort: 'high',
  fast: false,
}

describe('the model picker of the shell', () => {
  test('a model with fast mode ends its menu with a Fast row that keeps the menu open, the trigger names Fast, and a model without fast mode turns it off', async () => {
    const changes: AgentChoice[] = []
    const view = await mount(<Form changes={changes} />)
    await press(triggerOf(view))
    expect(rows().at(-1)).toEqual({
      role: 'menuitemcheckbox',
      name: 'Fast',
      on: 'false',
    })
    await press(byRole('menuitemcheckbox', 'Fast'))
    const trigger = triggerOf(view)
    expect({
      row: rows().at(-1),
      name: triggerWords(view).name,
      text: trigger.textContent,
    }).toEqual({
      row: { role: 'menuitemcheckbox', name: 'Fast', on: 'true' },
      name: 'Model and effort: Opus 5.5, High, Fast',
      text: 'Opus 5.5HighFast',
    })
    await press(byRole('menuitem', 'All models'))
    await press(byRole('menuitemradio', 'Sonnet 5.5'))
    const sonnet = triggerWords(view).name
    await press(triggerOf(view))
    expect({
      sonnet,
      changes,
      roles: [...new Set(rows().map((item) => item.role))],
    }).toEqual({
      sonnet: 'Model and effort: Sonnet 5.5, High',
      changes: [
        { agent: 'claude', model: 'opus', effort: 'high', fast: true },
        { agent: 'claude', model: 'sonnet', effort: 'high', fast: false },
      ],
      // All models, then Effort, with no Fast row.
      roles: ['menuitem'],
    })
  })

  test('lists the favourites first, each as its model with its effort and Fast in the muted colour, then All models, Effort with the current effort, and Fast, marks only the favourite of the current choice, and a pick of a favourite sets its model, its effort, and its fast mode', async () => {
    const changes: AgentChoice[] = []
    const view = await mount(
      <Form changes={changes} favourites={[opus, opusLowFast, solHigh]} />,
    )
    await press(triggerOf(view))
    const listed = { rows: rows(), muted: mutedWords() }
    await press(byRole('menuitemradio', 'Opus 5.5 Low Fast'))
    const trigger = triggerWords(view).name
    await press(triggerOf(view))
    const marked = rows()
      .filter((row) => row.role === 'menuitemradio' && row.on === 'true')
      .map((row) => row.name)
    expect({ listed, changes, trigger, marked }).toEqual({
      listed: {
        rows: [
          { role: 'menuitemradio', name: 'Opus 5.5 High', on: 'true' },
          { role: 'menuitemradio', name: 'Opus 5.5 Low Fast', on: 'false' },
          { role: 'menuitemradio', name: 'GPT-6.1 Sol High', on: 'false' },
          { role: 'menuitem', name: 'All models', on: null },
          { role: 'menuitem', name: 'Effort High', on: null },
          { role: 'menuitemcheckbox', name: 'Fast', on: 'false' },
        ],
        muted: ['High', 'Low Fast', 'High', null, 'High', null],
      },
      changes: [opusLowFast],
      trigger: 'Model and effort: Opus 5.5, Low, Fast',
      marked: ['Opus 5.5 Low Fast'],
    })
  })
})
