// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test } from 'vitest'
import { $getRoot } from 'lexical'
import { accessibleName, byRole } from '../../../test-support/dom-queries'
import {
  messageText,
  pasteMessage,
  pressInField,
  typeMessage,
} from '../../../test-support/message-field'
import { press } from '../../../test-support/mount'
import { FakeSkills, sampleSkills } from '../../mentions/skills-test-kit'
import { clip, editorOf } from './attached-field-events'
import { mountMentionField } from './mention-field-test-kit'

const draft = 'Run /plans, then /codex-tests and /tmp now'

/** The titles of the chips of the field. */
function titles(field: HTMLElement) {
  return Array.from(field.querySelectorAll('[title]'), (chip) =>
    chip.getAttribute('title'),
  )
}

/** Puts the caret at the end of the field, as a click there does. */
function caretAtEnd(field: HTMLElement) {
  act(() => {
    field.focus()
    editorOf(field).update(() => $getRoot().selectEnd(), { discrete: true })
  })
}

describe('skill chips in the message field', () => {
  test('a draft shows each skill text of either agent as a chip with its description as its title, and keeps each skill text', async () => {
    const view = await mountMentionField({
      value: 'Run /plans and /codex-tests',
    })
    expect({
      chips: view.chips(),
      titles: titles(view.field),
      text: messageText(view.field),
    }).toEqual({
      chips: ['Skill plans', 'Skill codex-tests'],
      titles: [
        'Use before you write or change a plan file.',
        'Run the tests of the repository.',
      ],
      text: 'Run /plans and /codex-tests',
    })
  })

  test('a skill text whose name runs on, or that no list names, stays text', async () => {
    const view = await mountMentionField({ value: draft })
    expect({ chips: view.chips(), draft: view.draft() }).toEqual({
      chips: ['Skill codex-tests'],
      draft,
    })
  })

  test('a press on a chip opens nothing, and its × removes it', async () => {
    const view = await mountMentionField({ value: 'Run /plans now' })
    const controls = Array.from(
      view.field.querySelectorAll('a, button'),
      (control) => accessibleName(control),
    )
    await press(byRole('button', 'Remove plans', view.field))
    expect({ controls, chips: view.chips(), draft: view.draft() }).toEqual({
      controls: ['Remove plans'],
      chips: [],
      draft: 'Run  now',
    })
  })

  test('Backspace after a chip removes it whole', async () => {
    const view = await mountMentionField({ value: 'Run /plans' })
    caretAtEnd(view.field)
    pressInField(view.field, 'Backspace')
    expect({ chips: view.chips(), draft: view.draft() }).toEqual({
      chips: [],
      draft: 'Run ',
    })
  })

  test('a copy gives the skill text of each chip, and a paste of a skill text gives its chip', async () => {
    const view = await mountMentionField({ value: 'Run /review now' })
    pressInField(view.field, 'a', { ctrlKey: true })
    const copied = clip(view.field, 'copy')
    typeMessage(view.field, 'Then ')
    pasteMessage(view.field, copied)
    expect({ copied, chips: view.chips(), draft: view.draft() }).toEqual({
      copied: 'Run /review now',
      chips: ['Skill review'],
      draft: 'Then Run /review now',
    })
  })

  test('a draft that comes back while the lists load shows its chips when they come, and a skill that leaves both lists turns back into text', async () => {
    const skills = new FakeSkills('loading')
    const view = await mountMentionField({ skills, value: 'Run /plans now' })
    const loading = view.chips()
    await skills.set(sampleSkills)
    const loaded = view.chips()
    await skills.set({ claude: [], codex: [] })
    expect({
      loading,
      loaded,
      left: view.chips(),
      draft: view.draft(),
    }).toEqual({
      loading: [],
      loaded: ['Skill plans'],
      left: [],
      draft: 'Run /plans now',
    })
  })

  test('a chip stays a chip after a change of the model to an agent without its skill', async () => {
    const view = await mountMentionField({ value: 'Run /plans now' })
    await view.chooseAgent('codex')
    expect(view.chips()).toEqual(['Skill plans'])
  })
})
