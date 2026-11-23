// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import type { AgentChoice } from '../../shared/generated/AgentChoice'
import menuStyles from '../../ui/components/common/Menu.module.css'
import { byRole, queryByRole } from '../../test-support/dom-queries'
import { mount, press } from '../../test-support/mount'
import {
  choiceSaying,
  opus,
  rows,
  Session,
  spokenChoices,
  triggerOf,
  triggerWords,
} from './model-picker-test-kit'

const opusLowFast: AgentChoice = { ...opus, effort: 'low', fast: true }
const solHigh: AgentChoice = {
  agent: 'codex',
  model: 'sol',
  effort: 'high',
  fast: false,
}
/** A favourite on a model that the model list of the picker does not hold. */
const fableLow: AgentChoice = { ...opus, model: 'fable', effort: 'low' }
/** Fast mode on a model without fast mode, such as after a change of the list. */
const sonnetHighFast: AgentChoice = { ...opus, model: 'sonnet', fast: true }

const favourites = [opus, opusLowFast, fableLow, solHigh, sonnetHighFast]

/** The muted words of each row of the open model menu, or null. */
function mutedWords(): (string | null)[] {
  const menu = byRole('menu', 'Model and effort')
  return Array.from(
    menu.querySelectorAll('[role^="menuitem"]'),
    (row) =>
      row.querySelector(`.${menuStyles.muted}`)?.textContent?.trim() ?? null,
  )
}

/** The names of the choices of the open model menu that are marked. */
function marked(): string[] {
  return rows()
    .filter((row) => row.role === 'menuitemradio' && row.on === 'true')
    .map((row) => row.name)
}

describe('the favourites of the model menu of a session', () => {
  it('list each favourite that the picker offers, as its model with its effort and Fast in the muted colour, then All models, Effort with the current effort, and Fast, and mark the favourite of the current choice', async () => {
    const view = await mount(
      <Session favourites={favourites} sent={[]} start={opus} />,
    )
    await press(triggerOf(view))
    expect({ rows: rows(), muted: mutedWords() }).toEqual({
      rows: [
        { role: 'menuitemradio', name: 'Opus 5.5 High', on: 'true' },
        { role: 'menuitemradio', name: 'Opus 5.5 Low Fast', on: 'false' },
        { role: 'menuitemradio', name: 'GPT-6.1 Sol High', on: 'false' },
        { role: 'menuitemradio', name: 'Sonnet 5.5 High', on: 'false' },
        { role: 'menuitem', name: 'All models', on: null },
        { role: 'menuitem', name: 'Effort High', on: null },
        { role: 'menuitemcheckbox', name: 'Fast', on: 'false' },
      ],
      muted: ['High', 'Low Fast', 'High', 'High', null, 'High', null],
    })
  })

  it('marks a favourite only while it is the current choice exactly, with its fast mode', async () => {
    const view = await mount(
      <Session favourites={favourites} sent={[]} start={opus} />,
    )
    await press(triggerOf(view))
    await press(byRole('menuitem', 'Effort High'))
    await press(byRole('menuitemradio', 'Low'))
    await press(triggerOf(view))
    const afterEffort = marked()
    await press(byRole('menuitemcheckbox', 'Fast'))
    expect({ afterEffort, afterFast: marked() }).toEqual({
      afterEffort: [],
      afterFast: ['Opus 5.5 Low Fast'],
    })
  })

  it('sets the model, the effort, and fast mode of a picked favourite, and fast mode only for a model with fast mode', async () => {
    const sent: AgentChoice[] = []
    const view = await mount(
      <Session
        favourites={favourites}
        sent={sent}
        start={{ ...opus, model: 'sonnet' }}
      />,
    )
    await press(triggerOf(view))
    await press(byRole('menuitemradio', 'Opus 5.5 Low Fast'))
    const trigger = triggerWords(view).name
    await press(triggerOf(view))
    await press(byRole('menuitemradio', 'Sonnet 5.5 High'))
    expect({
      sent,
      trigger,
      menu: queryByRole('menu', 'Model and effort'),
    }).toEqual({
      sent: [opusLowFast, { ...sonnetHighFast, fast: false }],
      trigger: 'Model and effort: Opus 5.5, Low, Fast',
      menu: null,
    })
  })

  it('ends a favourite of the other agent of a session with messages with New session, and sends its choice', async () => {
    const sent: AgentChoice[] = []
    const view = await mount(
      <Session
        favourites={favourites}
        sent={sent}
        sessionAgent="claude"
        start={opus}
      />,
    )
    await press(triggerOf(view))
    const spoken = spokenChoices().slice(0, 4)
    await press(choiceSaying('GPT-6.1 Sol High New session'))
    expect({ spoken, sent }).toEqual({
      spoken: [
        'Opus 5.5 High',
        'Opus 5.5 Low Fast',
        'GPT-6.1 Sol High New session',
        'Sonnet 5.5 High',
      ],
      sent: [solHigh],
    })
  })

  it('starts with All models, then Effort and Fast, when it has no favourite to show', async () => {
    const shown = async (list: readonly AgentChoice[]) => {
      const view = await mount(
        <Session favourites={list} sent={[]} start={opus} />,
      )
      await press(triggerOf(view))
      const names = rows().map((row) => row.name)
      await view.unmount()
      return names
    }
    const short = ['All models', 'Effort High', 'Fast']
    expect({
      none: await shown([]),
      allHidden: await shown([fableLow]),
    }).toEqual({ none: short, allHidden: short })
  })
})
