import type { AgentModel } from '../../shared/generated/AgentModel'
import { useState } from 'react'
import type { Agent } from '../../shared/generated/Agent'
import type { AgentChoice } from '../../shared/generated/AgentChoice'
import { accessibleName, queryByRole } from '../../test-support/dom-queries'
import type { Mounted } from '../../test-support/mount'
import { ModelPicker } from './ModelPicker'

/** The models of the picker: Opus and Sol have fast mode, Sonnet has not. */
export const models: readonly AgentModel[] = [
  {
    agent: 'claude',
    model: 'opus',
    label: 'Opus 5.5',
    efforts: ['low', 'high'],
    fast: true,
  },
  {
    agent: 'claude',
    model: 'sonnet',
    label: 'Sonnet 5.5',
    efforts: ['low', 'high'],
  },
  {
    agent: 'codex',
    model: 'sol',
    label: 'GPT-6.1 Sol',
    efforts: ['low', 'high'],
    fast: true,
  },
]

export const opus: AgentChoice = {
  agent: 'claude',
  model: 'opus',
  effort: 'high',
  fast: false,
}

/**
 * The picker of a session that takes each choice that the picker sends, as
 * the session shows a model change at once. `sent` keeps each choice.
 */
export function Session(props: {
  start: AgentChoice
  sent: AgentChoice[]
  favourites?: readonly AgentChoice[]
  sessionAgent?: Agent
}) {
  const [choice, setChoice] = useState(props.start)
  return (
    <ModelPicker
      choice={choice}
      favourites={props.favourites}
      models={models}
      onChoose={(next) => {
        props.sent.push(next)
        setChoice(next)
      }}
      sessionAgent={props.sessionAgent}
    />
  )
}

/** The trigger of the picker. */
export function triggerOf(view: Mounted): HTMLElement {
  const button = view.container.querySelector('[aria-haspopup="menu"]')
  if (!(button instanceof HTMLElement)) throw new Error('No picker trigger')
  return button
}

/** What the trigger says to a screen reader, and the text that it shows. */
export function triggerWords(view: Mounted) {
  const button = triggerOf(view)
  return { name: accessibleName(button), text: button.textContent }
}

/**
 * Each row of the open menu with `label`: its role, its name, and whether
 * it is on. A closed menu has no rows.
 */
export function rows(label = 'Model and effort') {
  const menu = queryByRole('menu', label)
  return Array.from(
    menu?.querySelectorAll('[role^="menuitem"]') ?? [],
    (row) => ({
      role: row.getAttribute('role'),
      name: accessibleName(row),
      on: row.getAttribute('aria-checked'),
    }),
  )
}

/**
 * What a screen reader says for a row. A browser puts a space between the
 * parts of a row, so the parts join with one.
 */
function spokenOf(row: Element): string {
  return Array.from(row.children, accessibleName).filter(Boolean).join(' ')
}

/** The choices of the open menu with `label`. */
function choicesOf(label: string): HTMLElement[] {
  const menu = queryByRole('menu', label)
  return Array.from(
    menu?.querySelectorAll<HTMLElement>('[role="menuitemradio"]') ?? [],
  )
}

/** What a screen reader says for each choice of the open menu with `label`. */
export function spokenChoices(label = 'Model and effort'): string[] {
  return choicesOf(label).map(spokenOf)
}

/** The choice of the open menu with `label` that a screen reader says so. */
export function choiceSaying(
  words: string,
  label = 'Model and effort',
): HTMLElement {
  const choice = choicesOf(label).find((item) => spokenOf(item) === words)
  if (!choice) throw new Error(`No choice says "${words}" in ${label}`)
  return choice
}
