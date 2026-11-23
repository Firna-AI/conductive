// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import type { AgentChoice } from '../../shared/generated/AgentChoice'
import { accessibleName, byRole } from '../../test-support/dom-queries'
import { mount, press, pressKey } from '../../test-support/mount'
import {
  models,
  opus,
  rows,
  Session,
  spokenChoices,
  triggerOf,
  triggerWords,
} from './model-picker-test-kit'
import { ModelPicker } from './ModelPicker'

describe('the model picker of a session with messages', () => {
  it('says New session for each model of the other agent only', async () => {
    await mount(
      <ModelPicker
        choice={opus}
        models={models}
        onChoose={() => undefined}
        sessionAgent="claude"
      />,
    )
    await press(byRole('button', 'Model and effort: Opus 5.5, High'))
    await press(byRole('menuitem', 'All models'))
    expect(spokenChoices('All models')).toEqual([
      'Opus 5.5',
      'Sonnet 5.5',
      'GPT-6.1 Sol New session',
    ])
  })
})

describe('the Fast switch of the model picker of a session', () => {
  it('ends the menu with a Fast row that the keys reach, changes only fast, keeps the menu open, and names Fast in the trigger', async () => {
    const sent: AgentChoice[] = []
    const view = await mount(<Session sent={sent} start={opus} />)
    await press(triggerOf(view))
    expect(rows().at(-1)).toEqual({
      role: 'menuitemcheckbox',
      name: 'Fast',
      on: 'false',
    })
    await pressKey('End')
    const reached = accessibleName(document.activeElement ?? document.body)
    await press(byRole('menuitemcheckbox', 'Fast'))
    expect({
      reached,
      sent,
      row: rows().at(-1),
      trigger: triggerWords(view),
    }).toEqual({
      reached: 'Fast',
      sent: [{ ...opus, fast: true }],
      row: { role: 'menuitemcheckbox', name: 'Fast', on: 'true' },
      trigger: {
        name: 'Model and effort: Opus 5.5, High, Fast',
        text: 'Opus 5.5HighFast',
      },
    })
  })

  it('keeps fast for a model with fast mode, turns it off for a model without, and shows no Fast row for that model', async () => {
    const sent: AgentChoice[] = []
    const view = await mount(
      <Session sent={sent} start={{ ...opus, fast: true }} />,
    )
    await press(triggerOf(view))
    await press(byRole('menuitem', 'All models'))
    await press(byRole('menuitemradio', 'GPT-6.1 Sol'))
    const sol = triggerWords(view).name
    await press(triggerOf(view))
    await press(byRole('menuitem', 'All models'))
    await press(byRole('menuitemradio', 'Sonnet 5.5'))
    const sonnet = triggerWords(view).name
    await press(triggerOf(view))
    expect({
      sent,
      sol,
      sonnet,
      roles: [...new Set(rows().map((row) => row.role))],
    }).toEqual({
      sent: [
        { agent: 'codex', model: 'sol', effort: 'high', fast: true },
        { agent: 'claude', model: 'sonnet', effort: 'high', fast: false },
      ],
      sol: 'Model and effort: GPT-6.1 Sol, High, Fast',
      sonnet: 'Model and effort: Sonnet 5.5, High',
      // All models, then Effort, with no Fast row.
      roles: ['menuitem'],
    })
  })
})
