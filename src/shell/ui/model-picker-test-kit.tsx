import { act, useState } from 'react'
import type { AgentChoice } from '../../shared/generated/AgentChoice'
import menuStyles from '../../ui/components/common/Menu.module.css'
import { models, opus } from '../../chat/components/model-picker-test-kit'
import { accessibleName, byRole } from '../../test-support/dom-queries'
import { ModelPicker } from './ModelPicker'

/**
 * The picker of a form, such as Preferences or New workspace, that starts at
 * `start`, or else Opus 5.5 High, and takes each choice that the picker
 * gives. Its menu lists `favourites` first. `changes` keeps each choice.
 */
export function Form(props: {
  changes: AgentChoice[]
  favourites?: readonly AgentChoice[]
  start?: AgentChoice
}) {
  const [choice, setChoice] = useState<AgentChoice>(props.start ?? opus)
  return (
    <ModelPicker
      change={(next) => {
        props.changes.push(next)
        setChoice(next)
      }}
      choice={choice}
      favourites={props.favourites ?? []}
      models={models}
    />
  )
}

/** What a screen reader says for the element with the focus. */
export function focused(): string {
  return accessibleName(document.activeElement ?? document.body)
}

/** The muted words of each row of the open model menu, or null. */
export function mutedWords(): (string | null)[] {
  const menu = byRole('menu', 'Model and effort')
  return Array.from(
    menu.querySelectorAll('[role^="menuitem"]'),
    (row) =>
      row.querySelector(`.${menuStyles.muted}`)?.textContent?.trim() ?? null,
  )
}

/** Moves a pointer of `pointerType` over the row `name` of the open menu. */
export async function hover(name: string, pointerType: 'mouse' | 'touch') {
  const menu = byRole('menu', 'Model and effort')
  const row = Array.from(menu.querySelectorAll('[role^="menuitem"]')).find(
    (item) => accessibleName(item) === name,
  )
  if (!row) throw new Error(`No row ${name} in the model menu`)
  await act(async () => {
    row.dispatchEvent(
      new PointerEvent('pointermove', { bubbles: true, pointerType }),
    )
  })
}
