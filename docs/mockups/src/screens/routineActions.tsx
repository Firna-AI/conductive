import type { ReactElement, ReactNode } from 'react'
import type { Viewport } from '@mokly/mokly'
import { Play, Power, Trash2 } from 'lucide-react'
import { ScreenLink } from '../components/common/ScreenLink'
import { ActionButton } from '../components/common/actions'
import type { Routine } from '../fixtures/routines'
import type { RoutineAccess, SaveState } from './routineState'
import styles from './RoutineScreen.module.css'

/** An action that opens a screen of the mockups, when they draw one. */
function linked(button: ReactElement, to: string | undefined): ReactElement {
  if (!to) return button
  return (
    <ScreenLink asChild to={to}>
      {button}
    </ScreenLink>
  )
}

const deleteButton = (
  <ActionButton icon={Trash2} tone="danger">
    Delete
  </ActionButton>
)

/**
 * The actions of the routine page, in the header on desktop and at the
 * bottom of a phone (decision 202). The owner saves, uses Run now, and
 * deletes, and a new routine has only Save. An admin turns a routine off
 * and deletes it. Every other member has none. Run now works while the
 * routine is off, and also without a trigger.
 */
export function routineActions(props: {
  routine: Routine
  access: RoutineAccess
  save: SaveState
  viewport: Viewport
  /** The form is on the screen, so Save shows. The Runs tab of a phone has none. */
  withForm: boolean
  /** The screen after Save, when the mockups draw it. */
  saveTo?: string
  /** The screen after Run now, when the mockups draw it. */
  runNowTo?: string
}): ReactNode {
  switch (props.access) {
    case 'member':
      return null
    case 'admin':
      return (
        <>
          {props.routine.active ? (
            <ActionButton icon={Power}>Turn off</ActionButton>
          ) : null}
          {deleteButton}
        </>
      )
    case 'owner': {
      const changed = props.save === 'changed'
      const save = linked(
        <ActionButton disabled={!changed} tone="primary">
          Save
        </ActionButton>,
        changed ? props.saveTo : undefined,
      )
      if (!props.routine.saved) return save
      return (
        <>
          {props.viewport === 'desktop' ? deleteButton : null}
          {linked(
            <ActionButton icon={Play}>Run now</ActionButton>,
            props.runNowTo,
          )}
          {props.withForm ? save : null}
        </>
      )
    }
  }
}

/** The owner's Delete on a phone, at the end of the form. */
export function PhoneDelete() {
  return (
    <div className={styles.phoneDelete}>
      <ActionButton icon={Trash2} tone="danger">
        Delete routine
      </ActionButton>
    </div>
  )
}
